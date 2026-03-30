"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PlusIcon, Trash2Icon } from "lucide-react";
import type { InvoiceItem } from "@/data/invoice-types";
import { cn } from "@/lib/utils";

interface Props {
  items: InvoiceItem[];
  taxEnabled: boolean;
  taxRate: number; // 0–100 as a percentage, e.g. 21
  onItemsChange: (items: InvoiceItem[]) => void;
  onTaxChange: (enabled: boolean) => void;
  onTaxRateChange: (rate: number) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function InvoiceItemsTab({
  items,
  taxEnabled,
  taxRate,
  onItemsChange,
  onTaxChange,
  onTaxRateChange,
}: Props) {
  const addItem = () => {
    onItemsChange([
      ...items,
      { id: generateId(), description: "", quantity: 1, amount: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof Omit<InvoiceItem, "id">,
    value: string
  ) => {
    onItemsChange(
      items.map((item) => {
        if (item.id !== id) return item;
        if (field === "quantity") {
          return { ...item, quantity: Math.max(1, parseFloat(value) || 1) };
        }
        if (field === "amount") {
          return { ...item, amount: parseFloat(value) || 0 };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleTaxRateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      onTaxRateChange(val);
    } else if (e.target.value === "" || e.target.value === ".") {
      onTaxRateChange(0);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.amount, 0);
  const taxMultiplier = taxRate / 100;
  const taxAmount = taxEnabled ? subtotal * taxMultiplier : 0;
  const total = subtotal + taxAmount;

  const fmt = (n: number) =>
    n.toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-lg">
          Nėra eilučių. Pridėkite pirmą prekę / paslaugą.
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3 font-medium text-muted-foreground w-full">
                  Aprašymas
                </th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground whitespace-nowrap w-24">
                  Kiekis
                </th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground whitespace-nowrap w-32">
                  Kaina (€)
                </th>
                <th className="text-right py-2 pl-3 font-medium text-muted-foreground whitespace-nowrap w-28">
                  Suma (€)
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b last:border-0 group">
                  <td className="py-2 pr-3">
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                      placeholder="Prekės / paslaugos aprašymas"
                      className="h-8"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      min={1}
                      step="any"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", e.target.value)
                      }
                      className="h-8 text-right w-24"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.amount === 0 ? "" : item.amount}
                      onChange={(e) =>
                        updateItem(item.id, "amount", e.target.value)
                      }
                      placeholder="0.00"
                      className="h-8 text-right w-32"
                    />
                  </td>
                  <td className="py-2 pl-3 text-right tabular-nums font-medium whitespace-nowrap">
                    {fmt(item.quantity * item.amount)}
                  </td>
                  <td className="py-2 pl-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Ištrinti ${index + 1} eilutę`}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add item */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="gap-2"
      >
        <PlusIcon className="size-4" />
        Pridėti eilutę
      </Button>

      <Separator />

      {/* Totals section */}
      <div className="flex justify-end">
        <div className="w-72 space-y-3">
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Suma be mokesčių</span>
            <span className="font-medium tabular-nums">{fmt(subtotal)} €</span>
          </div>

          {/* Tax row */}
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Switch
                id="tax-toggle"
                checked={taxEnabled}
                onCheckedChange={onTaxChange}
              />
              <Label htmlFor="tax-toggle" className="text-sm cursor-pointer whitespace-nowrap">
                PVM
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={taxRate}
                  onChange={handleTaxRateInput}
                  disabled={!taxEnabled}
                  className={cn(
                    "h-7 w-16 text-right px-2 text-sm",
                    !taxEnabled && "opacity-50"
                  )}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <span
              className={cn(
                "text-sm font-medium tabular-nums",
                !taxEnabled && "text-muted-foreground"
              )}
            >
              {fmt(taxAmount)} €
            </span>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-base">Iš viso</span>
            <span className="font-bold text-lg tabular-nums">{fmt(total)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}
