"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { eq, and, isNull } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { Invoices, Customers, InvoiceItems, type Status } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { sendPaidInvoiceEmailAction } from "./send-email";

const stripe = new Stripe(String(process.env.STRIPE_API_SECRET));

export async function updateStatusAction(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId) return;

  const id = Number.parseInt(formData.get("id") as string);
  const status = formData.get("status") as Status;

  // rankinis atnaujinimas
  const isManual = formData.get("manual") === "true";

  if (Number.isNaN(id)) throw new Error("Neteisingas sąskaitos ID.");
  if (!status) throw new Error("Statusas yra privalomas.");

  // Fetch invoice with customer details
  const [invoiceData] = await db
    .select({
      total: Invoices.total,

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
    .where(eq(Invoices.id, id))
    .limit(1);

  if (!invoiceData) throw new Error("Invoice not found");

  // Update invoice status
  if (orgId) {
    await db
      .update(Invoices)
      .set({ status })
      .where(and(eq(Invoices.id, id), eq(Invoices.organizationId, orgId)));
  } else {
    await db
      .update(Invoices)
      .set({ status })
      .where(
        and(
          eq(Invoices.id, id),
          eq(Invoices.userId, userId),
          isNull(Invoices.organizationId)
        )
      );
  }
  // Send email if status is "paid"
  if (status === "paid") {
    try {
      await sendPaidInvoiceEmailAction(id);
    } catch (error) {
      console.error("Nepavyko išsiųsti apmokėjimo patvirtinimo el. laiško:", error);
    }
  }

  // Revaliduojamas TIK jei tai rankinis veiksmas (pvz. iš dropdown meniu)
  // Jei tai automatinis Stripe nukreipimas, revalidatePath čia nevykdomas (išvengiama klaidos)
  if (isManual) {
    revalidatePath(`/invoices/${id}`, "page");
  }
}
export async function deleteInvoiceAction(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId) return;

  const id = Number.parseInt(formData.get("id") as string);

  if (orgId) {
    await db
      .delete(Invoices)
      .where(and(eq(Invoices.id, id), eq(Invoices.organizationId, orgId)));
  } else {
    await db
      .delete(Invoices)
      .where(
        and(
          eq(Invoices.id, id),
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

  if (Number.isNaN(id)) throw new Error("Neteisingas sąskaitos ID.");

  // Fetch invoice details
  const [invoice] = await db
    .select({
      id: Invoices.id,
      invoiceNumber: Invoices.invoiceNumber,
      status: Invoices.status,
      total: Invoices.total,
      taxAmount: Invoices.taxAmount,
      buyerEmail: Invoices.buyerEmail,
    })
    .from(Invoices)
    .where(eq(Invoices.id, id))
    .limit(1);

  if (!invoice) throw new Error("Sąskaita nerasta.");
  if (invoice.status === "paid") redirect(`/invoices/${id}/payment`);

  // Fetch all related invoice items
  const items = await db
    .select({
      description: InvoiceItems.description,
      quantity: InvoiceItems.quantity,
      lineTotal: InvoiceItems.lineTotal,
    })
    .from(InvoiceItems)
    .where(eq(InvoiceItems.invoiceId, id));

  // Map database items to Stripe line items
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
    price_data: {
      currency: "eur",
      product_data: {
        name: item.description || "Paslauga / Prekė",
        description: `Kiekis: ${Number(item.quantity)}`, 
      },
      unit_amount: Math.round(Number(item.lineTotal) * 100),
    },
    quantity: 1, 
  }));

  // Add Tax as a separate line item if it exists
  const taxAmountNum = Number(invoice.taxAmount);
  if (taxAmountNum > 0) {
    stripeLineItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          name: "PVM (Mokesčiai)",
        },
        unit_amount: Math.round(taxAmountNum * 100),
      },
      quantity: 1,
    });
  }

  // Fallback just in case an invoice was saved without items
  if (stripeLineItems.length === 0) {
    stripeLineItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          name: `Sąskaita faktūra ${invoice.invoiceNumber}`,
        },
        unit_amount: Math.round(Number(invoice.total) * 100),
      },
      quantity: 1,
    });
  }

  // Create the Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    line_items: stripeLineItems,
    mode: "payment",
    locale: "lt",
    customer_email: invoice.buyerEmail, // Prefills email on checkout page
    metadata: {
      invoiceId: String(id),
    },
    success_url: `${origin}/invoices/${id}/payment?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/invoices/${id}/payment?status=canceled`,
  });

  if (!session.url) throw new Error("Nepavyko sukurti Stripe sesijos.");

  redirect(session.url);
}