"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PencilIcon, XIcon } from "lucide-react";
import { isValidEmail } from "@/lib/utils";
import type { PartyInfo, PersonType } from "@/data/invoice-types";

interface Props {
  title: string;
  data: PartyInfo;
  onChange: (updated: PartyInfo) => void;
  /** When true, fields start as read-only with an "Edit" toggle */
  allowToggleEdit?: boolean;
}

export function PartyForm({ title, data, onChange, allowToggleEdit = false }: Props) {
  const [editing, setEditing] = useState(!allowToggleEdit);

  const readOnly = allowToggleEdit && !editing;

  const update = (field: keyof PartyInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handlePersonTypeChange = (value: string) => {
    onChange({ ...data, personType: value as PersonType });
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, +, spaces, dashes, parentheses — and max 20 chars
    const filtered = e.target.value.replace(/[^\d+\s\-()]/g, "").slice(0, 20);
    update("phone", filtered);
  };

  const displayName =
    data.personType === "legal"
      ? data.companyName || "—"
      : [data.firstName, data.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        {allowToggleEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 h-7 px-2 text-xs"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? (
              <>
                <XIcon className="size-3" />
                Atšaukti
              </>
            ) : (
              <>
                <PencilIcon className="size-3" />
                Redaguoti
              </>
            )}
          </Button>
        )}
      </div>

      {/* Collapsed read-only summary */}
      {readOnly && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-1 text-sm">
          <p className="font-medium">{displayName}</p>
          {data.personType === "legal" && data.companyCode && (
            <p className="text-muted-foreground">Įm. kodas: {data.companyCode}</p>
          )}
          {data.email && <p className="text-muted-foreground">{data.email}</p>}
          {data.phone && <p className="text-muted-foreground">{data.phone}</p>}
          {data.address && <p className="text-muted-foreground">{data.address}</p>}
        </div>
      )}

      {/* Editable fields */}
      {editing && (
        <>
          {/* Person Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Asmens tipas</Label>
            <Select value={data.personType} onValueChange={handlePersonTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pasirinkite tipą" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Fizinis asmuo</SelectItem>
                <SelectItem value="legal">Juridinis asmuo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Physical person fields */}
          {data.personType === "physical" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${title}-firstName`} className="text-sm font-medium">
                  Vardas <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${title}-firstName`}
                  value={data.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  placeholder="Jonas"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${title}-lastName`} className="text-sm font-medium">
                  Pavardė <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${title}-lastName`}
                  value={data.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  placeholder="Jonaitis"
                  required
                />
              </div>
            </div>
          )}

          {/* Legal entity fields */}
          {data.personType === "legal" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${title}-companyName`} className="text-sm font-medium">
                  Įmonės pavadinimas <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${title}-companyName`}
                  value={data.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                  placeholder="UAB Pavyzdinė Įmonė"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${title}-companyCode`} className="text-sm font-medium">
                  Įmonės kodas <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${title}-companyCode`}
                  value={data.companyCode}
                  onChange={(e) => update("companyCode", e.target.value)}
                  placeholder="123456789"
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor={`${title}-email`} className="text-sm font-medium">
              El. paštas <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${title}-email`}
              type="email"
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="jonas@pavyzdys.lt"
              required
              className={data.email && !isValidEmail(data.email) ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {data.email && !isValidEmail(data.email) && (
              <p className="text-xs text-destructive">Neteisingas el. pašto formatas</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor={`${title}-phone`} className="text-sm font-medium">
              Telefonas{" "}
              <span className="text-xs text-muted-foreground font-normal">(nebūtina)</span>
            </Label>
            <Input
              id={`${title}-phone`}
              type="tel"
              value={data.phone}
              onChange={handlePhoneInput}
              placeholder="+370 600 12345"
              maxLength={12}
              inputMode="tel"
            />
            <p className="text-xs text-muted-foreground text-right">
              {data.phone.length}/12
            </p>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor={`${title}-address`} className="text-sm font-medium">
              Adresas{" "}
              <span className="text-xs text-muted-foreground font-normal">(nebūtina)</span>
            </Label>
            <Input
              id={`${title}-address`}
              value={data.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Gedimino g. 1, Vilnius"
            />
          </div>
        </>
      )}
    </div>
  );
}
