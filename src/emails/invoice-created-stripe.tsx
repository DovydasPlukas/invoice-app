import { Resend } from "resend";
import { SELLER_INFO } from "@/data/seller";

const resend = new Resend(process.env.RESEND_API_KEY!);

type CustomerType = "physical" | "legal";

/**
 * NOTE: does not work as intended.
 */

export interface InvoiceCreatedStripeEmailProps {
  email: string;
  invoiceId: number;
  amount: number;
  description: string;
  stripeCheckoutUrl: string;

  customerType: CustomerType;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  companyCode?: string | null;
  phone?: string | null;
  address?: string | null;

  invoiceDate: Date | string;
}

export const sendInvoiceEmail = async ({
  email,
  invoiceId,
  amount,
  description,
  stripeCheckoutUrl,
  customerType,
  firstName,
  lastName,
  companyName,
  companyCode,
  phone,
  address,
  invoiceDate,
}: InvoiceCreatedStripeEmailProps) => {
  const domain = process.env.NEXT_PUBLIC_APP_URL;
  const invoiceLink = `${domain}/invoices/${invoiceId}/payment`;

  const formattedAmount = (amount / 100).toFixed(2);
  const formattedDate = new Date(invoiceDate).toLocaleDateString("lt-LT");

  const customerName =
    customerType === "physical"
      ? `${firstName ?? ""} ${lastName ?? ""}`.trim()
      : companyName ?? "Klientas";

  const customerExtra =
    customerType === "legal" && companyCode
      ? `<p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
           <strong>Įmonės kodas:</strong> ${companyCode}
         </p>`
      : "";

  const customerPhone = phone
    ? `<p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
         <strong>Telefonas:</strong> ${phone}
       </p>`
    : "";

  const customerAddress = address
    ? `<p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
         <strong>Adresas:</strong> ${address}
       </p>`
    : "";

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
    subject: `Nauja sąskaitos faktūra #${invoiceId}`,
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 28px; line-height: 1.2; color: #111827;">
        Nauja sąskaita faktūra
      </h1>

      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4b5563;">
        Jums sukurta nauja sąskaitos faktūra <strong>#${invoiceId}</strong>. Prašome ją apmokėti per nurodytą laiką.
      </p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 14px; font-size: 16px; color: #111827;">
          Sąskaitos informacija
        </h2>

        <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
          <strong>Sąskaitos Nr.:</strong> #${invoiceId}
        </p>
        <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
          <strong>Data:</strong> ${formattedDate}
        </p>
        <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
          <strong>Suma:</strong> ${formattedAmount} €
        </p>
        <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
          <strong>Prekė / paslauga:</strong> ${description}
        </p>
      </div>

      <div style="display: block; margin-bottom: 24px;">
        <div style="background: #ffffff; border-left: 4px solid #5e6ad2; padding-left: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px; font-size: 16px; color: #111827;">
            Pardavėjas
          </h2>
          <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
            <strong>Pavadinimas:</strong> ${SELLER_INFO.companyName}
          </p>
          <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
            <strong>Įmonės kodas:</strong> ${SELLER_INFO.companyCode}
          </p>
          <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
            <strong>Adresas:</strong> ${SELLER_INFO.address}
          </p>
          <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
            <strong>Telefonas:</strong> ${SELLER_INFO.phone}
          </p>
          <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
            <strong>El. paštas:</strong> ${SELLER_INFO.email}
          </p>
        </div>

        <div style="background: #ffffff; border-left: 4px solid #10b981; padding-left: 16px;">
          <h2 style="margin: 0 0 10px; font-size: 16px; color: #111827;">
            Pirkėjas
          </h2>
          <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
            <strong>${customerType === "physical" ? "Vardas, pavardė" : "Pavadinimas"}:</strong> ${customerName}
          </p>
          ${customerExtra}
          <p style="margin: 6px 0; font-size: 14px; color: #3c4149;">
            <strong>El. paštas:</strong> ${email}
          </p>
          ${customerPhone}
          ${customerAddress}
        </div>
      </div>

      <div style="padding: 12px 0 8px; display: flex; gap: 12px; flex-wrap: wrap;">
        <a href="${stripeCheckoutUrl}" 
           style="background-color: #5e6ad2; border-radius: 8px; font-weight: 600; color: #fff; font-size: 15px; text-decoration: none; text-align: center; display: inline-block; padding: 12px 20px;">
          Apmokėti sąskaitą
        </a>
        <a href="${invoiceLink}" 
           style="background-color: #111827; border-radius: 8px; font-weight: 600; color: #fff; font-size: 15px; text-decoration: none; text-align: center; display: inline-block; padding: 12px 20px;">
          Peržiūrėti sąskaitą
        </a>
      </div>

      <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.6;">
        Šis el. laiškas buvo išsiųstas automatiškai. Jei turite klausimų, susisiekite su pardavėju.
      </p>
    `),
  });
};
