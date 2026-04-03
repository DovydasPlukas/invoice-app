"use server";

import { auth } from "@clerk/nextjs/server";
import type { InvoiceFormData } from "@/data/invoice-types";

export async function saveInvoice(form: InvoiceFormData): Promise<{ id: number; dbSaved: boolean }> {
  if (!process.env.DATABASE_URL) {
    return { id: Date.now(), dbSaved: false };
  }

  try {
    return await saveToDb(form);
  } catch (error) {
    console.error("Database save error:", error);
    return { id: Date.now(), dbSaved: false };
  }
}

async function saveToDb(form: InvoiceFormData): Promise<{ id: number; dbSaved: boolean }> {
  const { db } = await import("@/db");
  const { Invoices, InvoiceItems, Customers } = await import("@/db/schema");
  
  // Get authentication details
  const { userId, orgId } = await auth();
  if (!userId) {
    throw new Error("User must be authenticated to save an invoice");
  }

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.amount, 0);
  const taxRate = form.taxEnabled ? form.taxRate : 0;
  const taxAmount = form.taxEnabled ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + taxAmount;

  // Insert buyer into customers table
  const [buyer] = await db
    .insert(Customers)
    .values({
      customerType: form.to.personType,
      firstName: form.to.firstName || null,
      lastName: form.to.lastName || null,
      companyName: form.to.companyName || null,
      companyCode: form.to.companyCode || null,
      email: form.to.email,
      phone: form.to.phone || null,
      address: form.to.address || null,
      // Save auth context
      userId,
      organizationId: orgId || null,
    })
    .returning({ id: Customers.id });

  // Insert invoice record
  const [invoice] = await db
    .insert(Invoices)
    .values({
      invoiceNumber: form.invoiceNumber,
      date: form.date,
      // Seller snapshot
      sellerType: form.from.personType,
      sellerFirstName: form.from.firstName || null,
      sellerLastName: form.from.lastName || null,
      sellerCompanyName: form.from.companyName || null,
      sellerCompanyCode: form.from.companyCode || null,
      sellerEmail: form.from.email,
      sellerPhone: form.from.phone || null,
      sellerAddress: form.from.address || null,
      
      customerId: buyer.id, 
      
      // Buyer snapshot for history
      buyerType: form.to.personType,
      buyerFirstName: form.to.firstName || null,
      buyerLastName: form.to.lastName || null,
      buyerCompanyName: form.to.companyName || null,
      buyerCompanyCode: form.to.companyCode || null,
      buyerEmail: form.to.email,
      buyerPhone: form.to.phone || null,
      buyerAddress: form.to.address || null,
      
      // Financials
      subtotal: subtotal.toFixed(2),
      taxEnabled: form.taxEnabled,
      taxRate: taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      
      // Save auth context
      userId,
      organizationId: orgId || null,
    })
    .returning({ id: Invoices.id });

  // Insert individual items
  if (form.items.length > 0) {
    await db.insert(InvoiceItems).values(
      form.items.map((item) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity.toString(),
        amount: item.amount.toFixed(2),
        lineTotal: (item.quantity * item.amount).toFixed(2),
      }))
    );
  }

  return { id: invoice.id, dbSaved: true };
}