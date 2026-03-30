import { eq } from "drizzle-orm";
import { Check, Circle, CreditCard, X } from "lucide-react";
import Stripe from "stripe";
import { notFound, redirect } from "next/navigation";

import Container from "@/components/Container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { createPayment, updateStatusAction } from "@/app/actions/actions";
import { db } from "@/db";
import { Customers, Invoices, InvoiceItems } from "@/db/schema";
import { cn } from "@/lib/utils";

const stripe = new Stripe(String(process.env.STRIPE_API_SECRET));

interface InvoicePageProps {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{
    status?: string;
    session_id?: string;
  }>;
}

export default async function InvoicePaymentPage({
  params,
  searchParams,
}: InvoicePageProps) {
  const { invoiceId: invoiceIdParam } = await params;
  const { session_id: sessionId, status } = await searchParams;

  const invoiceId = Number.parseInt(invoiceIdParam);

  if (Number.isNaN(invoiceId)) {
    throw new Error("Neteisingas sąskaitos ID");
  }

  const isSuccess = Boolean(sessionId) && status === "success";
  const isCanceled = status === "canceled";
  let isError = false;

  if (isSuccess && sessionId) {
    const { payment_status } =
      await stripe.checkout.sessions.retrieve(sessionId);

    if (payment_status !== "paid") {
      isError = true;
    } else {
      const formData = new FormData();
      formData.append("id", String(invoiceId));
      formData.append("status", "paid");
      await updateStatusAction(formData);

      redirect(`/invoices/${invoiceId}/payment`);
    }
  }

  const [result] = await db
    .select({
      id: Invoices.id,
      invoiceNumber: Invoices.invoiceNumber,
      status: Invoices.status,
      date: Invoices.date,
      total: Invoices.total,
      customerType: Customers.customerType,
      firstName: Customers.firstName,
      lastName: Customers.lastName,
      companyName: Customers.companyName,
    })
    .from(Invoices)
    .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
    .where(eq(Invoices.id, invoiceId))
    .limit(1);

  if (!result) {
    notFound();
  }

  const items = await db
    .select({
      id: InvoiceItems.id,
      description: InvoiceItems.description,
      quantity: InvoiceItems.quantity,
      lineTotal: InvoiceItems.lineTotal,
    })
    .from(InvoiceItems)
    .where(eq(InvoiceItems.invoiceId, invoiceId));

  const customerDisplayName =
    result.customerType === "physical"
      ? `${result.firstName ?? ""} ${result.lastName ?? ""}`.trim()
      : result.companyName ?? "Nenurodytas klientas";

  const fmt = (num: number | string) =>
    typeof num === "string" ? parseFloat(num).toFixed(2) : num.toFixed(2);

  return (
    <main className="w-full h-full">
      <Container>
        <div className="max-w-3xl mx-auto py-10">
          {isError && (
            <p className="bg-red-100 text-sm text-red-800 text-center px-3 py-2 rounded-lg mb-6">
              Įvyko klaida, bandykite dar kartą.
            </p>
          )}

          {isCanceled && (
            <p className="bg-yellow-100 text-sm text-yellow-800 text-center px-3 py-2 rounded-lg mb-6">
              Mokėjimas atšauktas, bandykite dar kartą.
            </p>
          )}

          <div className="rounded-2xl border bg-white shadow-sm p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Mokėjimas</p>
                <h1 className="text-3xl font-semibold">
                  Sąskaita {result.invoiceNumber}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  ID: {result.id}
                </p>
              </div>

              <Badge
                className={cn(
                  "rounded-full capitalize w-fit",
                  result.status === "open" && "bg-blue-500",
                  result.status === "paid" && "bg-green-600",
                  result.status === "void" && "bg-zinc-700",
                  result.status === "uncollectible" && "bg-red-600"
                )}
              >
                {result.status}
              </Badge>
            </div>

            {/* Amount */}
            <div className="rounded-xl border bg-slate-50 p-6">
              <p className="text-sm text-muted-foreground mb-2">Mokėtina suma</p>
              <p className="text-4xl font-bold">{fmt(result.total)} €</p>
            </div>

            {/* Condensed invoice info */}
            <div className="grid gap-4 text-sm">
              <div className="flex justify-between gap-6 border-b pb-3">
                <span className="text-muted-foreground">Klientas</span>
                <span className="font-medium text-right">{customerDisplayName}</span>
              </div>

              <div className="flex justify-between gap-6 border-b pb-3">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium text-right">{result.date}</span>
              </div>

              {items.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-3">Trumpa suvestinė</p>
                  <div className="space-y-2">
                    {items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between gap-4 text-sm"
                      >
                        <span className="truncate text-slate-700">
                          {item.description}
                        </span>
                        <span className="shrink-0 font-medium text-slate-900">
                          {fmt(item.lineTotal)} €
                        </span>
                      </div>
                    ))}

                    {items.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        + dar {items.length - 3} poz.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payment action */}
            <div className="pt-4">
              {result.status === "open" && (
                <form action={createPayment}>
                  <input type="hidden" name="id" value={result.id} />
                  <Button className="flex w-full h-14 gap-2 text-base font-bold bg-green-700 transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer">
                    <CreditCard className="w-5 h-auto" />
                    Apmokėti per Stripe
                  </Button>
                </form>
              )}

              {result.status === "paid" && (
                <p className="flex gap-3 items-center justify-center text-lg font-bold text-green-700">
                  <Check className="w-8 h-8 bg-green-600 rounded-full text-white p-1" />
                  Sąskaita apmokėta
                </p>
              )}

              {result.status === "uncollectible" && (
                <p className="flex gap-3 items-center justify-center text-lg font-bold text-red-600">
                  <X className="w-8 h-8 bg-red-500 rounded-full text-white p-1" />
                  Neapmokama
                </p>
              )}

              {result.status === "void" && (
                <p className="flex gap-3 items-center justify-center text-lg font-bold text-zinc-700">
                  <Circle className="w-8 h-8 bg-zinc-700 rounded-full text-white p-1" />
                  Anuliuota
                </p>
              )}
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}