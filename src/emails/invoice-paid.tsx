import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
export interface InvoicePaidEmailProps {
  email: string;
  invoiceId: number;
  invoiceNumber: string;
  amount: number;

  invoiceDate: Date | string;
  pdfAttachment?: Buffer | string; // PDF failas
}

export const sendInvoicePaidEmail = async ({
  email,
  invoiceId,
  invoiceNumber,
  amount,
  invoiceDate,
  pdfAttachment,
}: InvoicePaidEmailProps) => {
  const domain = process.env.NEXT_PUBLIC_APP_URL;
  const invoiceLink = `${domain}/invoices/${invoiceId}/payment`;

  const formattedAmount = (amount / 100).toFixed(2);
  const formattedDate = new Date(invoiceDate).toLocaleDateString("lt-LT");

  const emailLayout = (content: string) => `
    <div style="background-color: #f6f7fb; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif; padding: 32px 16px;">
      <div style="margin: 0 auto; max-width: 640px; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
        <div style="padding: 32px;">
          ${content}
        </div>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: [email],
    subject: `Sąskaita faktūra ${invoiceNumber} apmokėta`,
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 28px; line-height: 1.2; color: #111827;">
        Mokėjimas gautas!
      </h1>

      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4b5563;">
        Dėkojame už apmokėjimą. Informuojame, kad jūsų sąskaita faktūra <strong>${invoiceNumber}</strong> buvo sėkmingai apmokėta. Prisegtuke rasite apmokėtos sąskaitos faktūros PDF kopiją.
      </p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 14px; font-size: 16px; color: #111827;">
          Sąskaitos informacija
        </h2>

        <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
          <strong>Sąskaitos Nr.:</strong> ${invoiceNumber}
        </p>
        <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
          <strong>Data:</strong> ${formattedDate}
        </p>
        <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
          <strong>Suma:</strong> ${formattedAmount} €
        </p>
      </div>

      <div style="padding: 12px 0 8px;">
        <a href="${invoiceLink}" 
           style="background-color: #111827; border-radius: 8px; font-weight: 600; color: #fff; font-size: 15px; text-decoration: none; text-align: center; display: inline-block; padding: 12px 20px;">
          Peržiūrėti sąskaitą platformoje
        </a>
      </div>

      <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.6;">
        Šis el. laiškas buvo išsiųstas automatiškai po sėkmingo apmokėjimo.
      </p>
    `),
    attachments: pdfAttachment
      ? [
          {
            filename: `saskaita-${invoiceNumber}.pdf`,
            content: pdfAttachment,
          },
        ]
      : [],
  });
};