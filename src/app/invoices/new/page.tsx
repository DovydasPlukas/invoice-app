"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FileTextIcon,
  UsersIcon,
  ListIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ChevronLeftIcon,
  Loader2Icon,
} from "lucide-react";
import { InvoiceDetailsTab } from "@/components/invoice/InvoiceDetailsTab";
import { FromToTab } from "@/components/invoice/FromToTab";
import { InvoiceItemsTab } from "@/components/invoice/InvoiceItemsTab";
import { SELLER_INFO } from "@/data/seller";
import { saveInvoice } from "@/app/actions/save-invoice";
import type { InvoiceFormData, PartyInfo } from "@/data/invoice-types";
import { cn } from "@/lib/utils";

const InvoicePreview = dynamic(() => import("@/components/invoice/InvoicePreview").then(mod => ({ default: mod.InvoicePreview })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-screen">Loading...</div>,
});

function generateInvoiceId() {
  const seq = Math.floor(Math.random() * 90000) + 10000;
  return `INV-${seq}${Date.now()}`;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

const defaultParty = (): PartyInfo => ({
  personType: "physical",
  firstName: "",
  lastName: "",
  companyName: "",
  companyCode: "",
  email: "",
  phone: "",
  address: "",
});

const sellerParty = (): PartyInfo => ({
  personType: "legal",
  firstName: "",
  lastName: "",
  companyName: SELLER_INFO.companyName,
  companyCode: SELLER_INFO.companyCode,
  email: SELLER_INFO.email,
  phone: SELLER_INFO.phone,
  address: SELLER_INFO.address,
});

const initialForm = (): InvoiceFormData => ({
  invoiceNumber: generateInvoiceId(),
  date: todayISO(),
  from: sellerParty(),
  to: defaultParty(),
  items: [],
  taxEnabled: false,
  taxRate: 21,
});

const TABS = [
  { id: "details", label: "Sąskaita", icon: FileTextIcon },
  { id: "parties", label: "Nuo / Kam", icon: UsersIcon },
  { id: "items", label: "Eilutės", icon: ListIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function InvoiceCreatePage() {
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [form, setForm] = useState<InvoiceFormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | undefined>();
  const [showPreview, setShowPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const tabIndex = TABS.findIndex((t) => t.id === activeTab);

  const isDetailsValid = !!form.invoiceNumber && !!form.date;

  const isPartyValid = (p: PartyInfo) => {
    if (!p.email) return false;
    if (p.personType === "physical") return !!p.firstName && !!p.lastName;
    return !!p.companyName && !!p.companyCode;
  };

  const isPartiesValid = isPartyValid(form.from) && isPartyValid(form.to);
  const isItemsValid =
    form.items.length > 0 && form.items.every((i) => !!i.description && i.quantity > 0);

  const tabValidity: Record<TabId, boolean> = {
    details: isDetailsValid,
    parties: isPartiesValid,
    items: isItemsValid,
  };

  const canGoNext = tabValidity[activeTab];
  const isLastTab = tabIndex === TABS.length - 1;
  const isFirstTab = tabIndex === 0;

  const goNext = () => {
    if (!isLastTab) setActiveTab(TABS[tabIndex + 1].id);
  };
  const goPrev = () => {
    if (!isFirstTab) setActiveTab(TABS[tabIndex - 1].id);
  };

  const handleSubmit = async () => {
    if (!isDetailsValid || !isPartiesValid || !isItemsValid) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveInvoice(form);
      setSavedId(result.id);
    } catch (err) {
      // If DB is not configured, still show preview
      console.error("Failed to save invoice:", err);
      setSaveError("Nepavyko išsaugoti duomenų bazėje, bet galite atsisiųsti PDF.");
    } finally {
      setSaving(false);
      setShowPreview(true);
    }
  };

  const handleNew = () => {
    setShowPreview(false);
    setSavedId(undefined);
    setSaveError(null);
    setForm(initialForm());
    setActiveTab("details");
  };

  if (showPreview) {
    return (
      <InvoicePreview
        form={form}
        savedId={savedId}
        onBack={() => setShowPreview(false)}
        onNew={handleNew}
      />
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-balance">Sukurti sąskaitą faktūrą</h1>
          <p className="text-muted-foreground mt-1">
            Užpildykite visus laukus ir sukurkite sąskaitą
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            const isDone = tabValidity[tab.id] && tabIndex > idx;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
                {isDone && <CheckCircle2Icon className="size-3.5" />}
              </button>
            );
          })}
        </div>

        {/* Card with tabs */}
        <Card>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
            <TabsList className="hidden">
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileTextIcon className="size-5" />
                  Sąskaitos detalės
                </CardTitle>
                <CardDescription>Sąskaitos numeris ir data</CardDescription>
              </CardHeader>
              <CardContent>
                <InvoiceDetailsTab
                  invoiceNumber={form.invoiceNumber}
                  date={form.date}
                  onChange={(field, value) =>
                    setForm((prev) => ({ ...prev, [field]: value }))
                  }
                />
              </CardContent>
            </TabsContent>

            {/* From / To Tab */}
            <TabsContent value="parties" className="mt-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UsersIcon className="size-5" />
                  Nuo / Kam
                </CardTitle>
                <CardDescription>
                  Pardavėjo ir pirkėjo informacija
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FromToTab
                  from={form.from}
                  to={form.to}
                  onFromChange={(from) => setForm((prev) => ({ ...prev, from }))}
                  onToChange={(to) => setForm((prev) => ({ ...prev, to }))}
                />
              </CardContent>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="mt-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListIcon className="size-5" />
                  Sąskaitos eilutės
                </CardTitle>
                <CardDescription>
                  Pridėkite prekes ar paslaugas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InvoiceItemsTab
                  items={form.items}
                  taxEnabled={form.taxEnabled}
                  taxRate={form.taxRate}
                  onItemsChange={(items) => setForm((prev) => ({ ...prev, items }))}
                  onTaxChange={(taxEnabled) =>
                    setForm((prev) => ({ ...prev, taxEnabled }))
                  }
                  onTaxRateChange={(taxRate) =>
                    setForm((prev) => ({ ...prev, taxRate }))
                  }
                />
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Save error */}
        {saveError && (
          <p className="text-sm text-destructive mt-3">{saveError}</p>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={goPrev}
            disabled={isFirstTab}
            className="gap-2 cursor-pointer"
          >
            <ChevronLeftIcon className="size-4 cursor-pointer" />
            Atgal
          </Button>

          {!isLastTab ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="gap-2 cursor-pointer"
            >
              Toliau
              <ChevronRightIcon className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isItemsValid || saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckCircle2Icon className="size-4" />
              )}
              {saving ? "Išsaugoma..." : "Peržiūrėti ir išsaugoti"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}