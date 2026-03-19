import { eq } from "drizzle-orm";
import { Check, CreditCard } from "lucide-react";
import Stripe from "stripe";

import Container from "@/components/Container";
import { Badge } from "@/components/ui/badge";
import { Customers, Invoices } from "@/db/schema";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { createPayment, updateStatusAction } from "@/app/actions";
import { db } from "@/db";
import { notFound, redirect } from "next/navigation";

const stripe = new Stripe(String(process.env.STRIPE_API_SECRET));

interface InvoicePageProps {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{
    status: string;
    session_id: string;
  }>;
}

export default async function InvoicePage({
  params,
  searchParams,
}: InvoicePageProps) {
  const { invoiceId: invoiceIdParam } = await params;
  const { session_id: sessionId, status } = await searchParams;
  const invoiceId = Number.parseInt(invoiceIdParam);

  const isSuccess = sessionId && status === "success";
  const isCanceled = status === "canceled";
  let isError = isSuccess && !sessionId;

  if (Number.isNaN(invoiceId)) {
    throw new Error("Neteisingas sąskaitos ID");
  }

  if (isSuccess) {
    const { payment_status } =
      await stripe.checkout.sessions.retrieve(sessionId);

    if (payment_status !== "paid") {
      isError = true;
    } else {
      const formData = new FormData();
      formData.append("id", String(invoiceId));
      formData.append("status", "paid");
      await updateStatusAction(formData);
      redirect(`/invoices/${invoiceId}`);
    }
  }

  const [result] = await db
    .select({
      id: Invoices.id,
      status: Invoices.status,
      createTs: Invoices.createTs,
      description: Invoices.description,
      value: Invoices.value,
      name: Customers.name,
    })
    .from(Invoices)
    .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
    .where(eq(Invoices.id, invoiceId))
    .limit(1);

  if (!result) {
    notFound();
  }

  const invoice = {
    ...result,
    customer: {
      name: result.name,
    },
  };

  return (
    <main className="w-full h-full">
      <Container>
        {isError && (
          <p className="bg-red-100 text-sm text-red-800 text-center px-3 py-2 rounded-lg mb-6">
            Įvyko klaida, bandykite dar kartą!
          </p>
        )}
        {isCanceled && (
          <p className="bg-yellow-100 text-sm text-yellow-800 text-center px-3 py-2 rounded-lg mb-6">
            Mokėjimas atšauktas, bandykite dar kartą.
          </p>
        )}
        <div className="grid grid-cols-2">
          <div>
            <div className="flex justify-between mb-8">
              <h1 className="flex items-center gap-4 text-3xl font-semibold">
                Sąskaita {invoice.id}
                <Badge
                  className={cn(
                    "rounded-full capitalize",
                    invoice.status === "open" && "bg-blue-500",
                    invoice.status === "paid" && "bg-green-600",
                    invoice.status === "void" && "bg-zinc-700",
                    invoice.status === "uncollectible" && "bg-red-600",
                  )}
                >
                  {invoice.status}
                </Badge>
              </h1>
            </div>

            <p className="text-3xl mb-3">{(invoice.value / 100).toFixed(2)} €</p>

            <p className="text-lg mb-8">{invoice.description}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4">Valdyti sąskaitą</h2>
            {invoice.status === "open" && (
              <form action={createPayment}>
                <input type="hidden" name="id" value={invoice.id} />
                <Button className="flex gap-2 font-bold bg-green-700">
                  <CreditCard className="w-5 h-auto" />
                  Apmokėti sąskaitą
                </Button>
              </form>
            )}
            {invoice.status === "paid" && (
              <p className="flex gap-2 items-center text-xl font-bold">
                <Check className="w-8 h-auto bg-green-500 rounded-full text-white p-1" />
                Sąskaita apmokėta
              </p>
            )}
          </div>
        </div>

        <h2 className="font-bold text-lg mb-4">Atsiskaitymo detalės</h2>

        <ul className="grid gap-2">
          <li className="flex gap-4">
            <strong className="block w-28 shrink-0 font-medium text-sm">
              Sąskaitos ID
            </strong>
            <span>{invoice.id}</span>
          </li>
          <li className="flex gap-4">
            <strong className="block w-28 shrink-0 font-medium text-sm">
              Sąskaitos data
            </strong>
            <span>{new Date(invoice.createTs).toISOString().split('T')[0]}</span>
          </li>
          <li className="flex gap-4">
            <strong className="block w-28 shrink-0 font-medium text-sm">
              Atsiskaitymo pavadinimas
            </strong>
            <span>{invoice.customer.name}</span>
          </li>
        </ul>
      </Container>
    </main>
  );
}