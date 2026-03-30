"use client";

/*eslint-disable */

import type { InvoiceFormData } from "@/data/invoice-types";

// jsPDF's does not support Lithuanian characters (ą č ę ė į š ų ū ž).
const LT_MAP: Record<string, string> = {
  ą: "a", Ą: "A",
  č: "c", Č: "C",
  ę: "e", Ę: "E",
  ė: "e", Ė: "E",
  į: "i", Į: "I",
  š: "s", Š: "S",
  ų: "u", Ų: "U",
  ū: "u", Ū: "U",
  ž: "z", Ž: "Z",
};

function lt(text: string): string {
  return text.replace(/[ąĄčČęĘėĖįĮšŠųŲūŪžŽ]/g, (ch) => LT_MAP[ch] ?? ch);
}

const EUR = (n: number) =>
  n.toLocaleString("lt-LT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " EUR";

function partyName(p: InvoiceFormData["from"] | InvoiceFormData["to"]): string {
  if (p.personType === "legal") return p.companyName;
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

function partyLines(p: InvoiceFormData["from"] | InvoiceFormData["to"]): string[] {
  const lines: string[] = [];
  if (p.personType === "legal" && p.companyCode) {
    lines.push(`Im. kodas: ${p.companyCode}`);
  }
  if (p.email) lines.push(p.email);
  if (p.phone) lines.push(p.phone);
  if (p.address) lines.push(p.address);
  return lines;
}

async function buildDoc(form: InvoiceFormData) {
  //(fflate)
  const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js" as any);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.amount, 0);
  const taxMultiplier = form.taxRate / 100;
  const taxAmount = form.taxEnabled ? subtotal * taxMultiplier : 0;
  const total = subtotal + taxAmount;

  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(lt("SASKAITA FAKTURA"), marginL, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Nr. ${form.invoiceNumber}`, pageW - marginR, y, { align: "right" });
  y += 6;
  doc.text(
    `Data: ${new Date(form.date).toLocaleDateString("lt-LT")}`,
    pageW - marginR,
    y,
    { align: "right" }
  );
  doc.setTextColor(0);
  y += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // From / To
  const colRight = marginL + contentW / 2 + 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text(lt("PARDAVEJAS"), marginL, y);
  doc.text(lt("PIRKEJAS"), colRight, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(lt(partyName(form.from)), marginL, y);
  doc.text(lt(partyName(form.to)), colRight, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);

  const fromLines = partyLines(form.from);
  const toLines = partyLines(form.to);
  const maxLines = Math.max(fromLines.length, toLines.length);

  for (let i = 0; i < maxLines; i++) {
    if (fromLines[i]) doc.text(lt(fromLines[i]), marginL, y);
    if (toLines[i]) doc.text(lt(toLines[i]), colRight, y);
    y += 5;
  }

  doc.setTextColor(0);
  y += 6;

  // Items table header
  doc.setDrawColor(200);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  const qtyX = marginL + contentW * 0.55;
  const priceX = marginL + contentW * 0.70;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text(lt("APRASYMAS"), marginL, y);
  doc.text(lt("KIEKIS"), qtyX, y, { align: "right" });
  doc.text(lt("KAINA"), priceX, y, { align: "right" });
  doc.text(lt("SUMA"), pageW - marginR, y, { align: "right" });
  y += 4;

  doc.setDrawColor(180);
  doc.line(marginL, y, pageW - marginR, y);
  y += 5;

  // Item rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.setFontSize(9);

  form.items.forEach((item) => {
    const lineTotal = item.quantity * item.amount;
    const wrapped = doc.splitTextToSize(lt(item.description), contentW * 0.52) as string[];
    doc.text(wrapped, marginL, y);
    doc.text(String(item.quantity), qtyX, y, { align: "right" });
    doc.text(EUR(item.amount), priceX, y, { align: "right" });
    doc.text(EUR(lineTotal), pageW - marginR, y, { align: "right" });
    y += wrapped.length > 1 ? wrapped.length * 5 : 7;
  });

  y += 2;
  doc.setDrawColor(180);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // Totals
  const totalsX = pageW - marginR - 80;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(lt("Suma be mokesciu:"), totalsX, y);
  doc.text(EUR(subtotal), pageW - marginR, y, { align: "right" });
  y += 6;

  if (form.taxEnabled) {
    doc.text(`PVM (${form.taxRate}%):`, totalsX, y);
    doc.text(EUR(taxAmount), pageW - marginR, y, { align: "right" });
    y += 6;
  }

  doc.setDrawColor(180);
  doc.line(totalsX, y, pageW - marginR, y);
  y += 6;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(lt("IS VISO:"), totalsX, y);
  doc.text(EUR(total), pageW - marginR, y, { align: "right" });

  return doc;
}

export async function generatePDF(form: InvoiceFormData): Promise<void> {
  if (typeof window === "undefined") return;
  const doc = await buildDoc(form);
  doc.save(`saskaita-${form.invoiceNumber}.pdf`);
}