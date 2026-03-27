import { eq } from "drizzle-orm";
import { Check, Circle, CreditCard, X } from "lucide-react";
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
    status?: string;
    session_id?: string;
  }>;
}

export default async function InvoicePage({
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
      status: Invoices.status,
      createTs: Invoices.createTs,
      description: Invoices.description,
      value: Invoices.value,

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

  if (!result) {
    notFound();
  }

  const customerDisplayName =
    result.customerType === "physical"
      ? `${result.firstName ?? ""} ${result.lastName ?? ""}`.trim()
      : result.companyName ?? "Nenurodytas klientas";

  // const customerTypeLabel =
  //   result.customerType === "physical"
  //     ? "Fizinis asmuo"
  //     : "Juridinis asmuo";

  return (
    <main className="w-full h-full">
      <Container>
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

        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div>
            <div className="flex justify-between mb-8">
              <h1 className="flex items-center gap-4 text-3xl font-semibold">
                Sąskaita {result.id}
                <Badge
                  className={cn(
                    "rounded-full capitalize",
                    result.status === "open" && "bg-blue-500",
                    result.status === "paid" && "bg-green-600",
                    result.status === "void" && "bg-zinc-700",
                    result.status === "uncollectible" && "bg-red-600"
                  )}
                >
                  {result.status}
                </Badge>
              </h1>
            </div>

            <p className="text-3xl mb-3">{(result.value / 100).toFixed(2)} €</p>
            <p className="text-lg mb-8">{result.description}</p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Valdyti sąskaitą</h2>

            {result.status === "open" && (
              <form action={createPayment}>
                <input type="hidden" name="id" value={result.id} />
                <Button className="flex w-full h-20 gap-2 font-bold bg-green-700 transition-all duration-300 hover:scale-105 hover:shadow-md cursor-pointer">
                  <CreditCard className="w-5 h-auto" />
                  Apmokėti sąskaitą
                </Button>
              </form>
            )}

            {result.status === "paid" && (
              <p className="flex gap-2 items-center text-xl font-bold">
                <Check className="w-8 h-auto bg-green-600 rounded-full text-white p-1" />
                Sąskaita apmokėta
              </p>
            )}

            {result.status === "uncollectible" && (
              <p className="flex gap-2 items-center text-xl font-bold">
                <X className="w-8 h-auto bg-red-500 rounded-full text-white p-1" />
                Neapmokama
              </p>
            )}

            {result.status === "void" && (
              <p className="flex gap-2 items-center text-xl font-bold">
                <Circle className="w-8 h-auto bg-zinc-700 rounded-full text-white p-1" />
                void
              </p>
            )}
          </div>
        </div>

        <h2 className="font-bold text-lg mb-4">Kliento / atsiskaitymo detalės</h2>

        <ul className="grid gap-3">
          <li className="flex gap-4">
            <strong className="block w-40 shrink-0 font-medium text-sm">
              Sąskaitos ID
            </strong>
            <span>{result.id}</span>
          </li>

          <li className="flex gap-4">
            <strong className="block w-40 shrink-0 font-medium text-sm">
              Sąskaitos data
            </strong>
            <span>{new Date(result.createTs).toISOString().split("T")[0]}</span>
          </li>

          <li className="flex gap-4">
            <strong className="block w-40 shrink-0 font-medium text-sm">
              Klientas
            </strong>
            <span>{customerDisplayName}</span>
          </li>

          {result.customerType === "legal" && result.companyCode && (
            <li className="flex gap-4">
              <strong className="block w-40 shrink-0 font-medium text-sm">
                Įmonės kodas
              </strong>
              <span>{result.companyCode}</span>
            </li>
          )}

          <li className="flex gap-4">
            <strong className="block w-40 shrink-0 font-medium text-sm">
              El. paštas
            </strong>
            <span>{result.email}</span>
          </li>

          {result.phone && (
            <li className="flex gap-4">
              <strong className="block w-40 shrink-0 font-medium text-sm">
                Telefonas
              </strong>
              <span>{result.phone}</span>
            </li>
          )}

          {result.address && (
            <li className="flex gap-4">
              <strong className="block w-40 shrink-0 font-medium text-sm">
                Adresas
              </strong>
              <span>{result.address}</span>
            </li>
          )}
        </ul>
      </Container>
    </main>
  );
}