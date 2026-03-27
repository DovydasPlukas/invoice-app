"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { Customers, Invoices, type Status } from "@/db/schema";

// import { sendInvoiceEmail } from "@/emails/invoice-created";
import { sendInvoicePaidEmail } from "@/emails/invoice-paid";

// import { revalidatePath } from "next/cache";

const stripe = new Stripe(String(process.env.STRIPE_API_SECRET));

type CustomerType = "physical" | "legal";

export async function createAction(formData: FormData) {
  const { userId, orgId } = await auth();

  if (!userId) return;

  const customerType = formData.get("customerType") as CustomerType;

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const companyCode = String(formData.get("companyCode") || "").trim();

  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const description = String(formData.get("description") || "").trim();

  // Convert value to cents
  // "1234" => 123400, "12.34" => 1234
  const value = Math.floor(
    Number.parseFloat(String(formData.get("value"))) * 100
  );

  // Basic validation
  if (!customerType) {
    throw new Error("Kliento tipas yra privalomas.");
  }

  if (!email) {
    throw new Error("El. paštas yra privalomas.");
  }

  if (!description) {
    throw new Error("Prekės / paslaugos aprašymas yra privalomas.");
  }

  if (Number.isNaN(value) || value <= 0) {
    throw new Error("Neteisinga suma.");
  }

  if (customerType === "physical" && (!firstName || !lastName)) {
    throw new Error("Fiziniam asmeniui būtinas vardas ir pavardė.");
  }

  if (customerType === "legal" && (!companyName || !companyCode)) {
    throw new Error("Juridiniam asmeniui būtinas įmonės pavadinimas ir kodas.");
  }

  // Insert customer
  const [customer] = await db
    .insert(Customers)
    .values({
      customerType,
      firstName: customerType === "physical" ? firstName : null,
      lastName: customerType === "physical" ? lastName : null,
      companyName: customerType === "legal" ? companyName : null,
      companyCode: customerType === "legal" ? companyCode : null,
      email,
      phone: phone || null,
      address: address || null,
      userId,
      organizationId: orgId || null,
    })
    .returning({ id: Customers.id });

  if (!customer) {
    throw new Error("Nepavyko sukurti kliento.");
  }

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

  if (!invoice) {
    throw new Error("Nepavyko sukurti sąskaitos.");
  }

  /**
   * Send email
   * After creating the invoice, send an email to the customer with the invoice details.
   * Commented out, too many sent emails.
   */

  // await sendInvoiceEmail(email, invoice.id);

  redirect(`/invoices/${invoice.id}`);
}

export async function updateStatusAction(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId) return;

  const id = formData.get("id") as string;
  const status = formData.get("status") as Status;
  const invoiceId = Number.parseInt(id);

  if (Number.isNaN(invoiceId)) {
    throw new Error("Neteisingas sąskaitos ID.");
  }

  if (!status) {
    throw new Error("Statusas yra privalomas.");
  }

  // Fetch invoice and customer details before updating
  const [invoiceData] = await db
    .select({
      value: Invoices.value,
      description: Invoices.description,
      createTs: Invoices.createTs,

      customerType: Customers.customerType,
      firstName: Customers.firstName,
      lastName: Customers.lastName,
      companyName: Customers.companyName,
      companyCode: Customers.companyCode,
      email: Customers.email,
      phone: Customers.phone,
      address: Customers.address,
    })
    .from(Invoices)
    .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
    .where(eq(Invoices.id, invoiceId))
    .limit(1);

  if (!invoiceData) {
    throw new Error("Sąskaita nerasta.");
  }

  if (orgId) {
    await db
      .update(Invoices)
      .set({ status })
      .where(
        and(eq(Invoices.id, invoiceId), eq(Invoices.organizationId, orgId))
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
  if (status === "paid") {
    await sendInvoicePaidEmail({
      email: invoiceData.email,
      invoiceId,
      amount: invoiceData.value,
      description: invoiceData.description,

      customerType: invoiceData.customerType,
      firstName: invoiceData.firstName,
      lastName: invoiceData.lastName,
      companyName: invoiceData.companyName,
      companyCode: invoiceData.companyCode,
      phone: invoiceData.phone,
      address: invoiceData.address,

      invoiceDate: invoiceData.createTs,
    });
  }

  // revalidatePath(`/invoices/${id}`);
}

export async function deleteInvoiceAction(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId) return;

  const id = formData.get("id") as string;
  const invoiceId = Number.parseInt(id);

  if (Number.isNaN(invoiceId)) {
    throw new Error("Neteisingas sąskaitos ID.");
  }

  if (orgId) {
    await db
      .delete(Invoices)
      .where(
        and(eq(Invoices.id, invoiceId), eq(Invoices.organizationId, orgId))
      );
  } else {
    await db
      .delete(Invoices)
      .where(
        and(
          eq(Invoices.id, invoiceId),
          eq(Invoices.userId, userId),
          isNull(Invoices.organizationId)
        )
      );
  }

  redirect("/dashboard");
}

/**
 * Stripe checkout creation
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

  if (Number.isNaN(id)) {
    throw new Error("Neteisingas sąskaitos ID.");
  }

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
    throw new Error("Sąskaita nerasta.");
  }

  if (result.status === "paid") {
    redirect(`/invoices/${id}/payment`);
  }

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "eur",
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

  if (!session.url) {
    throw new Error("Nepavyko sukurti mokėjimo sesijos.");
  }

  redirect(session.url);
}