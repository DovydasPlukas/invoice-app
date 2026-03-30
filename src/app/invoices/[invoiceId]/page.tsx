import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { Customers, Invoices, InvoiceItems } from "@/db/schema";
import Invoice from "./Invoice";

export default async function InvoicePage({params,
}: { params: Promise<{ invoiceId: string }> }) {

  const { invoiceId: invoiceIdParam } = await params;
  const { userId } = await auth();
  if (!userId) return;
  const invoiceId = Number.parseInt(invoiceIdParam);
  if (Number.isNaN(invoiceId)) {
    throw new Error("Invalid Invoice ID");
  }
  // Fetch invoice with buyer info
  const [result] = await db
    .select()
    .from(Invoices)
    .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
    .where(eq(Invoices.id, invoiceId))
    .limit(1);
  if (!result) notFound();
  // Fetch invoice items
  const items = await db
    .select()
    .from(InvoiceItems)
    .where(eq(InvoiceItems.invoiceId, invoiceId));

  const invoice = {
    ...result.invoices,
    customer: result.customers,
    items: items,
  };

  return <Invoice invoice={invoice} />;
}