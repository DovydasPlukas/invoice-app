import { auth } from "@clerk/nextjs/server";
import { desc, eq, and, isNull } from "drizzle-orm";
import { CirclePlus } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { db } from "@/db";
import { Invoices, Status } from "@/db/schema";

import Container from "@/components/Container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function getStatusLabel(status: Status) {
  switch (status) {
    case "open":
      return "Neapmokėta";
    case "paid":
      return "Apmokėta";
    case "void":
      return "Anuliuota";
    case "uncollectible":
      return "Neišieškoma";
    default:
      return status;
  }
}

function formatMoney(amount: string | number) {
  return `${Number(amount).toFixed(2)} €`;
}

export default async function Home() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  let invoices: typeof Invoices.$inferSelect[] = [];
  let tableError: string | null = null;

  try {
    invoices = await db
      .select()
      .from(Invoices)
      .where(
        orgId
          ? and(eq(Invoices.organizationId, orgId))
          : and(eq(Invoices.userId, userId), isNull(Invoices.organizationId))
      )
      .orderBy(desc(Invoices.createTs));
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    tableError = "Nepavyko užkrauti sąskaitų faktūrų.";
  }

  return (
    <main className="h-full">
      <Container>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Sąskaitos faktūros</h1>

          <Button
            className="inline-flex gap-2 bg-slate-200"
            variant="ghost"
            asChild
          >
            <Link href="/invoices/new">
              <CirclePlus className="h-4 w-4" />
              Sukurti sąskaitą faktūrą
            </Link>
          </Button>
        </div>

        {tableError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {tableError}
          </div>
        ) : (
          <Table>
            <TableCaption>Naujai sukurtų sąskaitų faktūrų sąrašas.</TableCaption>

            <TableHeader>
              <TableRow>
                <TableHead className="w-36 p-4">Sąsk. Nr.</TableHead>
                <TableHead className="w-32 p-4">Data</TableHead>
                <TableHead className="text-center p-4">Statusas</TableHead>
                <TableHead className="text-right p-4">Suma</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="p-6 text-center text-muted-foreground"
                  >
                    Sąskaitų faktūrų nerasta.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => {

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="p-0 text-left font-medium">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="block p-4 font-semibold"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>

                      <TableCell className="p-0 text-left">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="block p-4 font-semibold"
                        >
                          {new Date(invoice.createTs).toLocaleDateString("lt-LT")}
                        </Link>
                      </TableCell>

                      <TableCell className="p-0 text-center">
                        <Link
                          className="block p-4"
                          href={`/invoices/${invoice.id}`}
                        >
                          <Badge
                            className={cn(
                              "rounded-full capitalize text-white",
                              invoice.status === "open" && "bg-blue-500",
                              invoice.status === "paid" && "bg-green-600",
                              invoice.status === "void" && "bg-zinc-700",
                              invoice.status === "uncollectible" && "bg-red-600"
                            )}
                          >
                            {getStatusLabel(invoice.status)}
                          </Badge>
                        </Link>
                      </TableCell>

                      <TableCell className="p-0 text-right">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="block p-4 font-semibold"
                        >
                          {formatMoney(invoice.total)}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Container>
    </main>
  );
}