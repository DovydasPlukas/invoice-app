import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export const sendInvoiceEmail = async (
  email: string,
  invoiceId: number,
) => {
  const invoiceLink = `http://localhost:3000/invoices/${invoiceId}/payment`;


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
    subject: `Nauja sąskaitos faktūra #${invoiceId}`,
    html: emailLayout(`
      <h2 style="font-size: 24px; letter-spacing: -0.5px; line-height: 1.3; font-weight: 400; color: #484848; padding: 17px 0 0;">
        Nauja sąskaita faktūra #${invoiceId}
      </h2>

      <p style="margin: 0 0 15px; font-size: 15px; line-height: 1.4; color: #3c4149;">
        Jums sukurta nauja sąskaitos faktūra.
      </p>

      <div style="padding: 27px 0 27px;">
        <a href="${invoiceLink}" 
           style="background-color: #5e6ad2; border-radius: 3px; font-weight: 600; color: #fff; font-size: 15px; text-decoration: none; text-align: center; display: block; padding: 11px 23px;">
          Apmokėti sąskaitą
        </a>
      </div>
    `),
  });
};