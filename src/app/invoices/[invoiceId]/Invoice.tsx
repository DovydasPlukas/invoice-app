"use client";
import { ChevronDown, CreditCard, Ellipsis, Trash2 } from "lucide-react";
import { useOptimistic, useTransition } from "react";

import Container from "@/components/Container";
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
import type { Customers, Invoices } from "@/db/schema";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { deleteInvoiceAction, updateStatusAction } from "@/app/actions";
import { AVAILABLE_STATUSES } from "@/data/invoices";
import Link from "next/link";

interface InvoiceProps {
  invoice: typeof Invoices.$inferSelect & {
    customer: typeof Customers.$inferSelect;
  };
}

export default function Invoice({ invoice }: InvoiceProps) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useOptimistic(
    invoice.status,
    (_state, newStatus) => {
      return String(newStatus);
    },
  );

  async function handleOnUpdateStatus(newStatus: string) {
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
  return (
    <main className="w-full h-full">
      <Container>
        <div className="flex justify-between mb-8">
          <h1 className="flex items-center gap-4 text-3xl font-semibold">
            Sąskaita {invoice.id}
            <Badge
              className={cn(
                "rounded-full capitalize",
                currentStatus === "open" && "bg-blue-500",
                currentStatus === "paid" && "bg-green-600",
                currentStatus === "void" && "bg-zinc-700",
                currentStatus === "uncollectible" && "bg-red-600",
              )}
            >
              {currentStatus}
            </Badge>
          </h1>

          <div className="flex gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="flex items-center gap-2"
                  variant="outline"
                  type="button"
                >
                  Keisti statusą
                  <ChevronDown className="w-4 h-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {AVAILABLE_STATUSES.map((status) => {
                  return (
                    <DropdownMenuItem
                      key={status.id}
                      onSelect={() => {
                        handleOnUpdateStatus(status.id);
                      }}
                    >
                      {status.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="flex items-center gap-2"
                    variant="outline"
                    type="button"
                  >
                    <span className="sr-only">Daugiau parinkčių</span>
                    <Ellipsis className="w-4 h-auto" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-2" type="submit">
                        <Trash2 className="w-4 h-auto" />
                        Ištrinti
                      </button>
                    </DialogTrigger>
                  </DropdownMenuItem>

                  <DropdownMenuItem>
                    <Link
                      href={`/invoices/${invoice.id}/payment`}
                      className="flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-auto" />
                      Mokėjimas
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    Ištrinti sąskaita?
                  </DialogTitle>
                  <DialogDescription>
                    Šis veiksmas negali būti atšauktas. Tai visam laikui ištrins
                    jūsų sąskaita ir pašalins jūsų duomenis iš mūsų serverių.
                  </DialogDescription>
                  <DialogFooter>
                    <form
                      className="flex justify-center"
                      action={deleteInvoiceAction}
                    >
                      <input type="hidden" name="id" value={invoice.id} />
                      <Button
                        variant="destructive"
                        className="flex items-center gap-2"
                        type="submit"
                      >
                        <Trash2 className="w-4 h-auto" />
                        Ištrinti sąskaita
                      </Button>
                    </form>
                  </DialogFooter>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <p className="text-3xl mb-3">{(invoice.value / 100).toFixed(2)} €</p>

        <p className="text-lg mb-8">{invoice.description}</p>

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
            <span>
              {new Date(invoice.createTs).toISOString().split('T')[0]}
            </span>
          </li>
          <li className="flex gap-4">
            <strong className="block w-28 shrink-0 font-medium text-sm">
              Atsiskaitymo pavadinimas
            </strong>
            <span>{invoice.customer.name}</span>
          </li>
          <li className="flex gap-4">
            <strong className="block w-28 shrink-0 font-medium text-sm">
              Atsiskaitymo el. paštas
            </strong>
            <span>{invoice.customer.email}</span>
          </li>
        </ul>
      </Container>
    </main>
  );
}