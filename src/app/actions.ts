"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Stripe from "stripe";

import { db } from "@/db";
import { Customers, Invoices, type Status } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";

import { sendInvoiceEmail } from "@/emails/invoice-created";
import { sendInvoicePaidEmail } from "@/emails/invoice-paid";

// import { revalidatePath } from "next/cache";

const stripe = new Stripe(String(process.env.STRIPE_API_SECRET));

export async function createAction(formData: FormData) {
  const { userId, orgId } = await auth();

  if (!userId) return;

  // Convert value to cents
  // "1234" = "123400", "12.34" = "1234", "12.3444444" = "1234"
  const value = Math.floor(
    Number.parseFloat(String(formData.get("value"))) * 100
  );

  const description = formData.get("description") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  // Insert customer
  const [customer] = await db
    .insert(Customers)
    .values({
      name,
      email,
      userId,
      organizationId: orgId || null,
    })
    .returning({ id: Customers.id });

  // Insert invoice
  const [invoice] = await db
    .insert(Invoices)
    .values({
      value,
      description,
      userId,
      customerId: customer.id,
      status: "open",
      organizationId: orgId || null,
    })
    .returning({ id: Invoices.id });

  // Send email using Resend
  await sendInvoiceEmail(email, invoice.id);

  redirect(`/invoices/${invoice.id}`);
}

export async function updateStatusAction(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId) return;

  const id = formData.get("id") as string;
  const status = formData.get("status") as Status;
  const invoiceId = Number.parseInt(id);

  // Fetch invoice and customer details before updating
  const [invoiceData] = await db
    .select({
      value: Invoices.value,
      description: Invoices.description,
      name: Customers.name,
      email: Customers.email,
    })
    .from(Invoices)
    .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
    .where(eq(Invoices.id, invoiceId))
    .limit(1);

  if (orgId) {
    await db
      .update(Invoices)
      .set({ status })
      .where(
        and(
          eq(Invoices.id, invoiceId),
          eq(Invoices.organizationId, orgId)
        )
      );
  } else {
    await db
      .update(Invoices)
      .set({ status })
      .where(
        and(
          eq(Invoices.id, invoiceId),
          eq(Invoices.userId, userId),
          isNull(Invoices.organizationId)
        )
      );
  }

  // Send email when invoice is paid
  if (status === "paid" && invoiceData) {
    await sendInvoicePaidEmail({
      email: invoiceData.email,
      invoiceId,
      amount: invoiceData.value,
      description: invoiceData.description,
      customerName: invoiceData.name,
    });
  }

  // Optionally, revalidate the invoice page to reflect the updated status
  // revalidatePath(`/invoices/${id}`);
}

export async function deleteInvoiceAction(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId) return;

  const id = formData.get("id") as string;

  if (orgId) {
    await db
      .delete(Invoices)
      .where(
        and(
          eq(Invoices.id, Number.parseInt(id)),
          eq(Invoices.organizationId, orgId)
        )
      );
  } else {
    await db
      .delete(Invoices)
      .where(
        and(
          eq(Invoices.id, Number.parseInt(id)),
          eq(Invoices.userId, userId),
          isNull(Invoices.organizationId)
        )
      );
  }

  redirect("/dashboard");
}
/** Stripe checkout creation
 * 1. Retrieve invoice details from the database using the provided ID.
 * 2. Create a Stripe checkout session with the invoice details (amount, description, ID).
 * 3. Redirect the user to the Stripe checkout page.
 */

export async function createPayment(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const headersList = await headers();
  const origin = headersList.get("origin");
  const id = Number.parseInt(formData.get("id") as string);

  const [result] = await db
    .select({ 
      status: Invoices.status, 
      value: Invoices.value,
      description: Invoices.description,
    })
    .from(Invoices)
    .where(eq(Invoices.id, id))
    .limit(1);

  if (!result) {
    throw new Error("Invoice not found");
  }

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "EUR",
          product_data: {
            name: `Invoice #${id}`,
            description: result.description,
          },
          unit_amount: result.value,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    locale: "lt",
    metadata: {
      invoiceId: String(id),
    },
    success_url: `${origin}/invoices/${id}/payment?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/invoices/${id}/payment?status=canceled&session_id={CHECKOUT_SESSION_ID}`,
  });

  if (!session.url) throw new Error("Invalid Session");

  redirect(session.url);
}