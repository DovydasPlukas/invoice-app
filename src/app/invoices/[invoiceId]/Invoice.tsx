"use client";

import { ChevronDown, CreditCard, DownloadIcon, Ellipsis, Trash2, Mail } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { updateStatusAction, deleteInvoiceAction} from "@/app/actions/actions";
import { sendInvoiceEmailAction } from "@/app/actions/send-email";
import { AVAILABLE_STATUSES } from "@/data/invoices";

import type { Customers, Invoices, InvoiceItems } from "@/db/schema";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import Container from "@/components/Container";

import type { InvoiceFormData } from "@/data/invoice-types";
import { toast } from "sonner";

import { generateInvoicePdf } from "@/lib/generate-pdf";

type InvoiceStatus = "open" | "paid" | "void" | "uncollectible";

interface InvoiceProps {
  invoice: typeof Invoices.$inferSelect & {
    customer: typeof Customers.$inferSelect;
    items: typeof InvoiceItems.$inferSelect[];
    status: InvoiceStatus;
  };
}

export default function Invoice({ invoice }: InvoiceProps) {
  const [isPending, startTransition] = useTransition();

  const [currentStatus, setCurrentStatus] = useOptimistic<InvoiceStatus, InvoiceStatus>(
    invoice.status,
    (_state, newStatus) => newStatus
  );

  const fmt = (num: number | string) =>
    typeof num === "string" ? parseFloat(num).toFixed(2) : num.toFixed(2);

  const subtotal = invoice.items.reduce(
    (sum, item) => sum + parseFloat(item.lineTotal.toString()),
    0
  );

  const taxAmount = invoice.taxEnabled
    ? parseFloat(invoice.taxAmount?.toString() || "0")
    : 0;

  const total = parseFloat(invoice.total.toString());

const handleDownload = async () => {
  try {
    const invoiceData: InvoiceFormData = {
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date || "",
      taxEnabled: invoice.taxEnabled ?? false,
      taxRate: Number(invoice.taxRate) || 0,
      items: invoice.items.map(item => ({
        id: item.id.toString(),
        description: item.description,
        quantity: Number(item.quantity),
        amount: Number(item.amount)
      })),
      from: {
        personType: invoice.sellerType as "physical" | "legal",
        firstName: invoice.sellerFirstName ?? "",
        lastName: invoice.sellerLastName ?? "",
        companyName: invoice.sellerCompanyName ?? "",
        companyCode: invoice.sellerCompanyCode ?? "",
        email: invoice.sellerEmail ?? "",
        phone: invoice.sellerPhone ?? "",
        address: invoice.sellerAddress ?? "",
      },
      to: {
        personType: invoice.customer.customerType as "physical" | "legal",
        firstName: invoice.customer.firstName ?? "",
        lastName: invoice.customer.lastName ?? "",
        companyName: invoice.customer.companyName ?? "",
        companyCode: invoice.customer.companyCode ?? "",
        email: invoice.customer.email ?? "",
        phone: invoice.customer.phone ?? "",
        address: invoice.customer.address ?? "",
      }
    };

    await generateInvoicePdf(invoiceData);
    
    toast.success("PDF failas paruoštas");
  } catch (error) {
    console.error("PDF klaida:", error);
    toast.error("Nepavyko sugeneruoti PDF");
  }
};

  async function handleOnUpdateStatus(newStatus: InvoiceStatus) {
    const originalStatus = currentStatus;
    startTransition(async () => {
      setCurrentStatus(newStatus);
      try {
        const formData = new FormData();
        formData.append("id", String(invoice.id));
        formData.append("status", newStatus);
        await updateStatusAction(formData);
      } catch {
        setCurrentStatus(originalStatus);
      }
    });
  }

  // Aktyvuojamas el. laiško siuntimas
  function handleSendEmail() {
    startTransition(async () => {
      try {
        await sendInvoiceEmailAction(invoice.id);
        toast("El. laiškas sėkmingai išsiųstas!");
      } catch (error) {
        console.error("Nepavyko išsiųsti el. laiško", error);
        toast("Įvyko klaida siunčiant el. laišką.");
      }
    });
  }

  const sellerDisplayName =
    invoice.sellerType === "physical"
      ? `${invoice.sellerFirstName ?? ""} ${invoice.sellerLastName ?? ""}`.trim()
      : invoice.sellerCompanyName ?? "Nenurodytas";

  const buyerDisplayName =
    invoice.customer.customerType === "physical"
      ? `${invoice.customer.firstName ?? ""} ${invoice.customer.lastName ?? ""}`.trim()
      : invoice.customer.companyName ?? "Nenurodytas klientas";

  return (
    <main className="h-full">
      <Container>
        <div className="flex justify-between items-center mb-6">
          <h1 className="flex items-center gap-4 text-3xl font-semibold">
            Sąskaita {invoice.invoiceNumber}
            <Badge
              className={cn(
                "rounded-full capitalize px-3 py-1",
                currentStatus === "open" && "bg-blue-500",
                currentStatus === "paid" && "bg-green-600",
                currentStatus === "void" && "bg-zinc-700",
                currentStatus === "uncollectible" && "bg-red-600"
              )}
            >
              {currentStatus}
            </Badge>
          </h1>

          <div className="flex gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isPending}>
                  Keisti statusą
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {AVAILABLE_STATUSES.map((status) => (
                  <DropdownMenuItem
                    key={status.id}
                    onSelect={() => handleOnUpdateStatus(status.id as InvoiceStatus)}
                  >
                    {status.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" disabled={isPending}>
                    <Ellipsis className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* Pridėtas naujas pasirinkimas laiško siuntimui */}
                  <DropdownMenuItem onClick={handleSendEmail} className="gap-2 cursor-pointer">
                    <Mail className="h-4 w-4" />
                    Išsiųsti el. paštą
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={handleDownload} className="gap-2 cursor-pointer">
                    <DownloadIcon className="h-4 w-4" />
                    Atsisiųsti PDF
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href={`/invoices/${invoice.id}/payment`} className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" /> Mokėjimas
                    </Link>
                  </DropdownMenuItem>
                  
                  <Separator className="my-1" />

                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <DialogTrigger asChild>
                      <button className="flex w-full items-center gap-2 cursor-pointer" type="button">
                        <Trash2 className="h-4 w-4" /> Ištrinti
                      </button>
                    </DialogTrigger>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>Ištrinti sąskaitą?</DialogTitle>
                  <DialogDescription>Šis veiksmas negali būti atšauktas.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <form action={deleteInvoiceAction}>
                    <input type="hidden" name="id" value={invoice.id} />
                    <Button variant="destructive" type="submit">Ištrinti</Button>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-t-primary shadow-lg">
          <CardContent className="space-y-8 p-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-primary text-2xl font-bold tracking-tight">SĄSKAITA FAKTŪRA</h2>
                <p className="mt-1 font-mono text-sm text-muted-foreground">Nr. {invoice.invoiceNumber}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">Data</p>
                <p className="text-muted-foreground">{invoice.date}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pardavėjas</p>
                <p className="text-lg font-bold">{sellerDisplayName}</p>
                <div className="text-sm text-muted-foreground">
                  {invoice.sellerType === "legal" && <p>Įm. kodas: {invoice.sellerCompanyCode}</p>}
                  <p>{invoice.sellerEmail}</p>
                  <p>{invoice.sellerPhone}</p>
                  <p>{invoice.sellerAddress}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pirkėjas</p>
                <p className="text-lg font-bold">{buyerDisplayName}</p>
                <div className="text-sm text-muted-foreground">
                  {invoice.customer.customerType === "legal" && <p>Įm. kodas: {invoice.customer.companyCode}</p>}
                  <p>{invoice.customer.email}</p>
                  <p>{invoice.customer.phone}</p>
                  <p>{invoice.customer.address}</p>
                </div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left">Aprašymas</th>
                  <th className="w-20 text-right pb-3">Kiekis</th>
                  <th className="w-28 text-right pb-3">Kaina</th>
                  <th className="w-28 text-right pb-3">Suma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4">{item.description}</td>
                    <td className="py-4 text-right">{parseFloat(item.quantity.toString())}</td>
                    <td className="py-4 text-right">{fmt(item.amount)} €</td>
                    <td className="py-4 text-right font-semibold">{fmt(item.lineTotal)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <div className="w-full max-w-70 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Suma be mokesčių</span>
                  <span className="font-medium">{fmt(subtotal)} €</span>
                </div>
                {invoice.taxEnabled && (
                  <div className="flex justify-between text-sm">
                    <span>PVM ({invoice.taxRate}%)</span>
                    <span>{fmt(taxAmount)} €</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-2 font-bold text-xl text-primary">
                  <span>Iš viso</span>
                  <span>{fmt(total)} €</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}