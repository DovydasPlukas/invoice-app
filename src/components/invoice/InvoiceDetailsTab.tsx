"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  invoiceNumber: string;
  date: string;
  onChange: (field: "invoiceNumber" | "date", value: string) => void;
}

export function InvoiceDetailsTab({ invoiceNumber, date, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber" className="text-sm font-medium">
            Sąskaitos numeris
          </Label>
          <Input
            id="invoiceNumber"
            value={invoiceNumber}
            onChange={(e) => onChange("invoiceNumber", e.target.value)}
            placeholder="INV-001"
          />
          <p className="text-xs text-muted-foreground">
            Automatiškai generuojamas iš sąskaitos ID
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceDate" className="text-sm font-medium">
            Data
          </Label>
          <Input
            id="invoiceDate"
            type="date"
            value={date}
            onChange={(e) => onChange("date", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Nustatyta į šiandienos datą
          </p>
        </div>
      </div>
    </div>
  );
}
