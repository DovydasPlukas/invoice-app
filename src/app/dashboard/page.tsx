import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { CirclePlus } from "lucide-react";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { Customers, Invoices } from "@/db/schema";

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
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Displaying all invoices
  let invoices: Array<
    typeof Invoices.$inferSelect & { customer: typeof Customers.$inferSelect }
  > = [];
  let dbError: string | null = null;

  try {
    const results: Array<{
      invoices: typeof Invoices.$inferSelect;
      customers: typeof Customers.$inferSelect;
    }> = await db
      .select()
      .from(Invoices)
      .innerJoin(Customers, eq(Invoices.customerId, Customers.id));

    invoices = results.map(({ invoices, customers }) => ({
      ...invoices,
      customer: customers,
    }));
  } catch (err) {
    console.error("[Dashboard] Failed to fetch invoices:", err);
    dbError =
      err instanceof Error ? err.message : "Nežinoma duomenų bazės klaida";
  }

  return (
    <main className="h-full">
      <Container>
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-semibold">Sąskaitos faktūros</h1>
          <p>
            <Button className="inline-flex gap-2 bg-slate-200" variant="ghost" asChild>
              <Link href="/invoices/new">
                <CirclePlus className="h-4 w-4" />
                Sukurti sąskaitos faktūra
              </Link>
            </Button>
          </p>
        </div>
        {dbError && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold mb-1">
              Nepavyko įkelti sąskaitų faktūrų
            </p>
            <p className="font-mono text-xs text-red-500 break-all">{dbError}</p>
          </div>
        )}

        <Table>
          <TableCaption>Naujai sukurtų sąskaitos faktūrų sąrašas.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-25 p-4">Data</TableHead>
              <TableHead className="p-4">Klientas</TableHead>
              <TableHead className="p-4">El. paštas</TableHead>
              <TableHead className="text-center p-4">Statusas</TableHead>
              <TableHead className="text-right p-4">Kaina</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((result) => {
              return (
                <TableRow key={result.id}>
                  <TableCell className="font-medium text-left p-0">
                    <Link
                      href={`/invoices/${result.id}`}
                      className="block p-4 font-semibold"
                    >
                      {new Date(result.createTs).toLocaleDateString()}
                    </Link>
                  </TableCell>
                  <TableCell className="text-left p-0">
                    <Link
                      href={`/invoices/${result.id}`}
                      className="block p-4 font-semibold"
                    >
                      {result.customer.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-left p-0">
                    <Link className="block p-4" href={`/invoices/${result.id}`}>
                      {result.customer.email}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center p-0">
                    <Link className="block p-4" href={`/invoices/${result.id}`}>
                      <Badge
                        className={cn(
                          "rounded-full capitalize",
                          result.status === "open" && "bg-blue-500",
                          result.status === "paid" && "bg-green-600",
                          result.status === "void" && "bg-zinc-700",
                          result.status === "uncollectible" && "bg-red-600",
                        )}
                      >
                        {result.status}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right p-0">
                    <Link
                      href={`/invoices/${result.id}`}
                      className="block p-4 font-semibold"
                    >
                      {(result.value / 100).toFixed(2)} €
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Container>
    </main>
  );
}
