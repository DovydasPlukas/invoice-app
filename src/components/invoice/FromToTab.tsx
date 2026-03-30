"use client";

import { Separator } from "@/components/ui/separator";
import { PartyForm } from "./PartyForm";
import type { PartyInfo } from "@/data/invoice-types";

interface Props {
  from: PartyInfo;
  to: PartyInfo;
  onFromChange: (updated: PartyInfo) => void;
  onToChange: (updated: PartyInfo) => void;
}

export function FromToTab({ from, to, onFromChange, onToChange }: Props) {
  return (
    <div className="space-y-8">
      {/* Seller — starts collapsed, can be edited */}
      <PartyForm
        title="Pardavėjas (Nuo)"
        data={from}
        onChange={onFromChange}
        allowToggleEdit
      />

      <Separator />

      {/* Buyer — always editable */}
      <PartyForm
        title="Pirkėjas (Kam)"
        data={to}
        onChange={onToChange}
      />
    </div>
  );
}
