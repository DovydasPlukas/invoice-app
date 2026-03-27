import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export interface InvoicePaidEmailProps {
  email: string;
  invoiceId: number;
  amount: number;
  description: string;
  customerName: string;
}

export const sendInvoicePaidEmail = async ({
  email,
  invoiceId,
  amount,
  description,
  customerName,
}: InvoicePaidEmailProps) => {
  const domain = process.env.NEXT_PUBLIC_APP_URL;
  const invoiceLink = `${domain}/invoices/${invoiceId}/payment`;
  const formattedAmount = (amount / 100).toFixed(2);

  const emailLayout = (content: string) => `
    <div style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif; padding: 20px 0 48px;">
      <div style="margin: 0 auto; max-width: 560px; padding: 20px 0 48px;">
        ${content}
      </div>
    </div>
  `;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: [email],
    subject: `Sąskaita faktūra #${invoiceId} apmokėta`,
    html: emailLayout(`
      <h2 style="font-size: 24px; letter-spacing: -0.5px; line-height: 1.3; font-weight: 400; color: #484848; padding: 17px 0 0;">
        Sąskaita faktūra #${invoiceId} apmokėta
      </h2>

      <p style="margin: 0 0 15px; font-size: 15px; line-height: 1.4; color: #3c4149;">
        Ačiū už mokėjimą! Jūsų sąskaita faktūra buvo sėkmingai apmokėta.
      </p>

      <div style="border-left: 4px solid #5e6ad2; padding-left: 16px; margin: 24px 0;">
        <p style="margin: 8px 0; font-size: 14px; color: #3c4149;">
          <strong>Kliento vardas:</strong> ${customerName}
        </p>
        <p style="margin: 8px 0; font-size: 14px; color: #3c4149;">
          <strong>Sąskaitos ID:</strong> #${invoiceId}
        </p>
        <p style="margin: 8px 0; font-size: 14px; color: #3c4149;">
          <strong>Suma:</strong> $${formattedAmount}
        </p>
        <p style="margin: 8px 0; font-size: 14px; color: #3c4149;">
          <strong>Aprašymas:</strong> ${description}
        </p>
      </div>

      <div style="padding: 27px 0 27px;">
        <a href="${invoiceLink}" 
           style="background-color: #5e6ad2; border-radius: 3px; font-weight: 600; color: #fff; font-size: 15px; text-decoration: none; text-align: center; display: block; padding: 11px 23px;">
          Peržiūrėti sąskaitą
        </a>
      </div>

      <p style="margin: 16px 0 0; font-size: 12px; color: #9399a4;">
        Šis el. laiškas buvo siuntas automatiškai. Prašome neatsiliepti į šį laišką.
      </p>
    `),
  });
};
