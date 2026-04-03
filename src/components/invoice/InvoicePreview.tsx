"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { 
  DownloadIcon, 
  ArrowLeftIcon, 
  PlusIcon, 
  ChevronDown, 
  Ellipsis, 
  Trash2, 
  CreditCard,
  FileEditIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { generateInvoicePdf } from "@/lib/generate-pdf";
import { updateStatusAction, deleteInvoiceAction } from "@/app/actions/actions";
import { AVAILABLE_STATUSES } from "@/data/invoices";
import { cn } from "@/lib/utils";

import type { InvoiceFormData } from "@/data/invoice-types";
import type { Status } from "@/db/schema";
import { toast } from "sonner";

interface Props {
  form: InvoiceFormData;
  savedId?: number;
  initialStatus?: Status;
  onBack: () => void;
  onNew: () => void;
}

function partyName(p: InvoiceFormData["from"] | InvoiceFormData["to"]): string {
  if (p.personType === "legal") return p.companyName;
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

export function InvoicePreview({ 
  form, 
  savedId, 
  initialStatus = "open", 
  onBack, 
  onNew, 
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Optimistic UI for Status Updates
  const [currentStatus, setCurrentStatus] = useOptimistic(
    initialStatus,
    (_state, newStatus: Status) => newStatus
  );

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.amount, 0);
  const taxAmount = form.taxEnabled ? subtotal * (form.taxRate / 100) : 0;
  const total = subtotal + taxAmount;

  const fmt = (n: number) =>
    n.toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const handleDownload = async () => {
    try {
      await generateInvoicePdf(form);
      toast.success("PDF sugeneruotas");
    } catch (error) {
      console.error(error);
      toast.error("Nepavyko sugeneruoti PDF");
    }
  };

  async function handleUpdateStatus(newStatus: Status) {
    if (!savedId) return;
    const originalStatus = currentStatus;

    startTransition(async () => {
      setCurrentStatus(newStatus);
      try {
        const formData = new FormData();
        formData.append("id", String(savedId));
        formData.append("status", newStatus);
        await updateStatusAction(formData);
      } catch {
        setCurrentStatus(originalStatus as Status);
      }
    });
  }

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Sąskaitos peržiūra</h1>
              {savedId && (
                <Badge
                  className={cn(
                    "rounded-full capitalize",
                    currentStatus === "open" && "bg-blue-500",
                    currentStatus === "paid" && "bg-green-600",
                    currentStatus === "void" && "bg-zinc-700",
                    currentStatus === "uncollectible" && "bg-red-600"
                  )}
                >
                  {currentStatus}
                </Badge>
              )}
            </div>
            {savedId && (
              <p className="text-sm text-muted-foreground mt-0.5">
                ID: {savedId} • Numeris: {form.invoiceNumber}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status Switcher (only if saved) */}
            {savedId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 cursor-pointer" disabled={isPending}>
                    Keisti statusą
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {AVAILABLE_STATUSES.map((status) => (
                    <DropdownMenuItem 
                      key={status.id} 
                      onSelect={() => handleUpdateStatus(status.id as Status)}
                    >
                      {status.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Main Actions Dropdown */}
            <Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-2 cursor-pointer">
                    Veiksmai
                    <Ellipsis className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onBack} className="gap-2 cursor-pointer">
                    <FileEditIcon className="size-4" />
                    Redaguoti (sukurti naują)
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={handleDownload} className="gap-2 cursor-pointer">
                    <DownloadIcon className="size-4" />
                    Atsisiųsti PDF
                  </DropdownMenuItem>

                  {savedId && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={`/invoices/${savedId}/payment`} className="flex items-center gap-2 w-full">
                          <CreditCard className="size-4" />
                          Mokėjimo nuoroda
                        </Link>
                      </DropdownMenuItem>

                      <Separator className="my-1" />

                      <DialogTrigger asChild>
                        <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                          <Trash2 className="size-4" />
                          Ištrinti sąskaitą
                        </DropdownMenuItem>
                      </DialogTrigger>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Delete Confirmation Dialog */}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ar tikrai norite ištrinti?</DialogTitle>
                  <DialogDescription>
                    Šis veiksmas negali būti atšauktas. Sąskaita bus visam laikui pašalinta iš sistemos.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <form action={deleteInvoiceAction}>
                    <input type="hidden" name="id" value={savedId} />
                    <Button variant="destructive" type="submit" className="gap-2">
                      <Trash2 className="size-4" />
                      Patvirtinti trynimą
                    </Button>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Invoice Visual Card */}
        <Card className="shadow-lg border-t-primary">
          <CardContent className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-primary">SĄSKAITOS FAKTŪRA</h2>
                <p className="text-muted-foreground text-sm mt-1 font-mono">Nr. {form.invoiceNumber}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">Data</p>
                <p className="text-muted-foreground">{new Date(form.date).toLocaleDateString("lt-LT")}</p>
              </div>
            </div>

            <Separator />

            {/* Parties */}
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pardavėjas</p>
                <p className="font-bold text-lg leading-tight">{partyName(form.from)}</p>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {form.from.personType === "legal" && form.from.companyCode && (
                    <p>Įm. kodas: {form.from.companyCode}</p>
                  )}
                  <p>{form.from.email}</p>
                  {form.from.phone && <p>{form.from.phone}</p>}
                  {form.from.address && <p className="pt-1 italic leading-snug">{form.from.address}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pirkėjas</p>
                <p className="font-bold text-lg leading-tight">{partyName(form.to)}</p>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {form.to.personType === "legal" && form.to.companyCode && (
                    <p>Įm. kodas: {form.to.companyCode}</p>
                  )}
                  <p>{form.to.email}</p>
                  {form.to.phone && <p>{form.to.phone}</p>}
                  {form.to.address && <p className="pt-1 italic leading-snug">{form.to.address}</p>}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-muted">
                    <th className="text-left pb-3 font-semibold text-muted-foreground">Aprašymas</th>
                    <th className="text-right pb-3 font-semibold text-muted-foreground w-20">Kiekis</th>
                    <th className="text-right pb-3 font-semibold text-muted-foreground w-28">Kaina</th>
                    <th className="text-right pb-3 font-semibold text-muted-foreground w-28">Suma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 text-slate-700">{item.description}</td>
                      <td className="py-4 text-right tabular-nums text-slate-600">{item.quantity}</td>
                      <td className="py-4 text-right tabular-nums text-slate-600">{fmt(item.amount)} €</td>
                      <td className="py-4 text-right tabular-nums font-semibold text-slate-900">
                        {fmt(item.quantity * item.amount)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end pt-4">
              <div className="w-full max-w-70 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Suma be mokesčių</span>
                  <span className="tabular-nums font-medium">{fmt(subtotal)} €</span>
                </div>
                {form.taxEnabled && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span className="text-muted-foreground">PVM ({form.taxRate}%)</span>
                    <span className="tabular-nums">{fmt(taxAmount)} €</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex justify-between items-center font-bold text-xl text-primary">
                    <span>Iš viso</span>
                    <span className="tabular-nums">{fmt(total)} €</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 cursor-pointer">
              <ArrowLeftIcon className="size-4" />
              Grįžti į sąrašą
            </Button>
          </Link>
          
          <Button variant="outline" onClick={onNew} className="gap-2 cursor-pointer">
            <PlusIcon className="size-4" />
            Sukurti naują
          </Button>
        </div>
      </div>
    </main>
  );
}