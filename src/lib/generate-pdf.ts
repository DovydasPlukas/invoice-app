"use client";

import { jsPDF } from "jspdf";
import type { InvoiceFormData } from "@/data/invoice-types";
import { ROBOTO_REGULAR_BASE64 } from "./roboto-base64";

// Pagalbinė funkcija sumai žodžiu
function numberToWordsLT(num: number): string {
  if (num === 0) return "Nulis eurų 00 centų";

  const units = ["", "vienas", "du", "trys", "keturi", "penki", "šeši", "septyni", "aštuoni", "devyni"];
  const teens = ["dešimt", "vienuolika", "dvylika", "trylika", "keturiolika", "penkiolika", "šešiolika", "septyniolika", "aštuoniolika", "devyniolika"];
  const tens = ["", "", "dvidešimt", "trisdešimt", "keturiasdešimt", "penkiasdešimt", "šešiasdešimt", "septyniasdešimt", "aštuoniasdešimt", "devyniasdešimt"];

  function getHundreds(n: number): string {
    if (n === 0) return "";
    const h = Math.floor(n / 100);
    const rest = n % 100;
    let res = "";
    if (h === 1) res = "šimtas";
    else if (h > 1) res = units[h] + " šimtai";

    if (rest > 0) {
      if (rest < 10) res += (res ? " " : "") + units[rest];
      else if (rest < 20) res += (res ? " " : "") + teens[rest - 10];
      else {
        const t = Math.floor(rest / 10);
        const u = rest % 10;
        res += (res ? " " : "") + tens[t];
        if (u > 0) res += " " + units[u];
      }
    }
    return res;
  }

  const euros = Math.floor(num);
  const cents = Math.round((num - euros) * 100);

  let words = "";
  if (euros >= 1000) {
    const t = Math.floor(euros / 1000);
    const rest = euros % 1000;
    const tWords = getHundreds(t);

    let tEnding = "tūkstančių";
    const lastDigit = t % 10;
    const lastTwoDigits = t % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      tEnding = "tūkstančių";
    } else if (lastDigit === 1) {
      tEnding = "tūkstantis";
    } else if (lastDigit >= 2 && lastDigit <= 9) {
      tEnding = "tūkstančiai";
    }

    words += (tWords ? tWords + " " : "") + tEnding;
    if (rest > 0) words += " " + getHundreds(rest);
  } else if (euros > 0) {
    words = getHundreds(euros);
  } else {
    words = "nulis";
  }

  let euroWord = "eurų";
  const lastE = euros % 10;
  const lastTwoE = euros % 100;
  if (lastTwoE >= 11 && lastTwoE <= 19) euroWord = "eurų";
  else if (lastE === 1) euroWord = "euras";
  else if (lastE >= 2 && lastE <= 9) euroWord = "eurai";

  let centWord = "centų";
  const lastC = cents % 10;
  const lastTwoC = cents % 100;
  if (lastTwoC >= 11 && lastTwoC <= 19) centWord = "centų";
  else if (lastC === 1) centWord = "centas";
  else if (lastC >= 2 && lastC <= 9) centWord = "centai";

  const formattedWords = words.charAt(0).toUpperCase() + words.slice(1);
  const formattedCents = cents.toString().padStart(2, "0");

  return `${formattedWords} ${euroWord} ${formattedCents} ${centWord}`;
}

const EUR = (n: number) =>
  n.toLocaleString("lt-LT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";

function partyName(p: InvoiceFormData["from"] | InvoiceFormData["to"]): string {
  if (p.personType === "legal") return p.companyName;
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

function partyLines(p: InvoiceFormData["from"] | InvoiceFormData["to"]): string[] {
  const lines: string[] = [];
  if (p.personType === "legal" && p.companyCode) {
    lines.push(`Įmonės kodas: ${p.companyCode}`);
  }
  if (p.address) lines.push(p.address);
  if (p.email) lines.push(p.email);
  if (p.phone) lines.push(p.phone);
  return lines;
}

export async function generateInvoicePdf(form: InvoiceFormData, returnBuffer: boolean = false) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    putOnlyUsedFonts: true,
  });

  // Šrifto konfigūracija
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.setFont("Roboto");

  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;

  let y = 25;

  // ANTRAŠTĖ
  doc.setFontSize(22);
  doc.setTextColor(20);
  doc.text("SĄSKAITA FAKTŪRA", marginL, y);

  doc.setFontSize(10);
  doc.setTextColor(100);
  y += 10;
  doc.text(`Numeris: ${form.invoiceNumber}`, marginL, y);
  doc.text(`Data: ${form.date}`, pageW - marginR, y, { align: "right" });

  y += 20;

  // ŠALYS
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("PARDAVĖJAS", marginL, y);
  doc.text("PIRKĖJAS", marginL + contentW / 2, y);

  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text(partyName(form.from), marginL, y);
  doc.text(partyName(form.to), marginL + contentW / 2, y);

  doc.setFontSize(9);
  doc.setTextColor(80);
  const fromLines = partyLines(form.from);
  const toLines = partyLines(form.to);
  const maxLines = Math.max(fromLines.length, toLines.length);

  for (let i = 0; i < maxLines; i++) {
    y += 5;
    if (fromLines[i]) doc.text(fromLines[i], marginL, y);
    if (toLines[i]) doc.text(toLines[i], marginL + contentW / 2, y);
  }

  y += 25;

  // LENTELĖS ANTRAŠTĖ
  doc.setFontSize(8);
  doc.setTextColor(120);
  
  if (form.taxEnabled) {
    doc.text("Aprašymas", marginL, y);
    doc.text("Kiek.", 95, y, { align: "right" });
    doc.text("Kaina\n(be PVM)", 120, y - 3, { align: "right" });
    doc.text("Suma\n(be PVM)", 145, y - 3, { align: "right" });
    doc.text("Kaina\n(su PVM)", 167, y - 3, { align: "right" });
    doc.text("Suma\n(su PVM)", pageW - marginR, y - 3, { align: "right" });
    y += 3;
  } else {
    const qtyX = pageW - marginR - 55;
    const priceX = pageW - marginR - 30;
    doc.text("Aprašymas", marginL, y);
    doc.text("Kiekis", qtyX, y, { align: "right" });
    doc.text("Kaina", priceX, y, { align: "right" });
    doc.text("Suma", pageW - marginR, y, { align: "right" });
    y += 3;
  }

  doc.setDrawColor(200);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // PREKĖS
  doc.setTextColor(40);
  let subtotal = 0;

  form.items.forEach((item) => {
    const lineTotalWithoutTax = item.quantity * item.amount;
    subtotal += lineTotalWithoutTax;

    if (form.taxEnabled) {
      const priceWithTax = item.amount * (1 + form.taxRate / 100);
      const lineTotalWithTax = lineTotalWithoutTax * (1 + form.taxRate / 100);

      const wrapped = doc.splitTextToSize(item.description, 60) as string[];
      
      doc.text(wrapped, marginL, y);
      doc.text(String(item.quantity), 95, y, { align: "right" });
      doc.text(EUR(item.amount), 120, y, { align: "right" });
      doc.text(EUR(lineTotalWithoutTax), 145, y, { align: "right" });
      doc.text(EUR(priceWithTax), 167, y, { align: "right" });
      doc.text(EUR(lineTotalWithTax), pageW - marginR, y, { align: "right" });
      
      y += wrapped.length > 1 ? wrapped.length * 4 : 8;
    } else {
      const qtyX = pageW - marginR - 55;
      const priceX = pageW - marginR - 30;
      const wrapped = doc.splitTextToSize(item.description, contentW * 0.5) as string[];
      
      doc.text(wrapped, marginL, y);
      doc.text(String(item.quantity), qtyX, y, { align: "right" });
      doc.text(EUR(item.amount), priceX, y, { align: "right" });
      doc.text(EUR(lineTotalWithoutTax), pageW - marginR, y, { align: "right" });
      
      y += wrapped.length > 1 ? wrapped.length * 4 : 8;
    }
  });

  y += 2;
  doc.line(marginL, y, pageW - marginR, y);
  y += 10;

  // TOTALS
  const totalsX = pageW - marginR - 60;
  const taxAmount = subtotal * (form.taxRate / 100);
  const total = form.taxEnabled ? subtotal + taxAmount : subtotal;

  doc.setFontSize(10);
  doc.setTextColor(100);
  
  doc.text("Suma be PVM:", totalsX, y);
  doc.text(EUR(subtotal), pageW - marginR, y, { align: "right" });
  
  if (form.taxEnabled) {
    y += 6;
    doc.text(`PVM (${form.taxRate}%):`, totalsX, y);
    doc.text(EUR(taxAmount), pageW - marginR, y, { align: "right" });
  }

  y += 10;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("IŠ VISO MOKĖTI:", totalsX, y);
  doc.text(EUR(total), pageW - marginR, y, { align: "right" });

  // SUMA ŽODŽIU
  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Suma žodžiu: ", marginL, y);
  doc.setTextColor(40);
  doc.text(numberToWordsLT(total), marginL + 25, y);

  // Išsaugojimas ARBA Buffer grąžinimas
  if (returnBuffer) {
    return Buffer.from(doc.output("arraybuffer"));
  }
  
  doc.save(`Saskaita_${form.invoiceNumber}.pdf`);
}