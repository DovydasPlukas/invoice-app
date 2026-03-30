"use server";

/* eslint-disable */

import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { jsPDF } from "jspdf";

import { db } from "@/db";
import { Invoices, Customers, InvoiceItems } from "@/db/schema";
import { sendInvoiceEmail } from "@/emails/invoice-created-stripe";
import type { InvoiceFormData } from "@/data/invoice-types";
import { sendInvoicePaidEmail } from "@/emails/invoice-paid";
import { ROBOTO_REGULAR_BASE64 } from "@/lib/roboto-base64";

const stripe = new Stripe(String(process.env.STRIPE_API_SECRET));

// PDF generavimo funkcija

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
  }) + " EUR";

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

async function generateServerPdf(form: InvoiceFormData): Promise<Buffer> {
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
  
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}



// Send email with PDF attachment
export async function sendInvoiceEmailAction(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Neprisijungęs vartotojas.");

  const headersList = await headers();
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Gauname duomenis
  const [invoiceData] = await db
    .select()
    .from(Invoices)
    .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
    .where(eq(Invoices.id, id))
    .limit(1);

  if (!invoiceData) throw new Error("Sąskaita nerasta.");
  const { invoices: invoice, customers: customer } = invoiceData;

  const items = await db
    .select()
    .from(InvoiceItems)
    .where(eq(InvoiceItems.invoiceId, id));

  // PDF KŪRIMAS
  const pdfData: InvoiceFormData = {
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date || new Date().toISOString().split("T")[0],
    taxEnabled: invoice.taxEnabled ?? false,
    taxRate: typeof invoice.taxRate === "string" ? parseFloat(invoice.taxRate) : (invoice.taxRate ?? 0),
    items: items.map((item) => ({
      id: item.id.toString(),
      description: item.description,
      quantity: parseFloat(item.quantity.toString()),
      amount: parseFloat(item.amount.toString()),
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
      personType: customer.customerType as "physical" | "legal",
      firstName: customer.firstName ?? "",
      lastName: customer.lastName ?? "",
      companyName: customer.companyName ?? "",
      companyCode: customer.companyCode ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
    },
  };

  const pdfBuffer = await generateServerPdf(pdfData);

  // STRIPE
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
    price_data: {
      currency: "eur",
      product_data: {
        name: item.description || "Paslauga / Prekė",
        description: `Kiekis: ${Number(item.quantity)}`,
      },
      unit_amount: Math.round(Number(item.lineTotal) * 100),
    },
    quantity: 1,
  }));

  const taxAmountNum = Number(invoice.taxAmount);
  if (taxAmountNum > 0) {
    stripeLineItems.push({
      price_data: {
        currency: "eur",
        product_data: { name: "PVM (Mokesčiai)" },
        unit_amount: Math.round(taxAmountNum * 100),
      },
      quantity: 1,
    });
  }

  if (stripeLineItems.length === 0) {
    stripeLineItems.push({
      price_data: {
        currency: "eur",
        product_data: { name: `Sąskaita faktūra ${invoice.invoiceNumber}` },
        unit_amount: Math.round(Number(invoice.total) * 100),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    line_items: stripeLineItems,
    mode: "payment",
    locale: "lt",
    customer_email: invoice.buyerEmail || customer.email,
    metadata: { invoiceId: String(id) },
    success_url: `${origin}/invoices/${id}/payment?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/invoices/${id}/payment?status=canceled`,
  });

  if (!session.url) throw new Error("Nepavyko sukurti Stripe sesijos.");

  const description = items.map(i => i.description).join(", ") || "Sąskaita už paslaugas / prekes";

  // Išsiunčiame el. laišką
  await sendInvoiceEmail({
    email: invoice.buyerEmail || customer.email,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    amount: Math.round(Number(invoice.total) * 100),
    description: description,
    stripeCheckoutUrl: session.url,

    customerType: customer.customerType as "physical" | "legal",
    firstName: customer.firstName,
    lastName: customer.lastName,
    companyName: customer.companyName,
    companyCode: customer.companyCode,
    phone: customer.phone,
    address: customer.address,

    sellerType: invoice.sellerType as "physical" | "legal",
    sellerFirstName: invoice.sellerFirstName,
    sellerLastName: invoice.sellerLastName,
    sellerCompanyName: invoice.sellerCompanyName,
    sellerCompanyCode: invoice.sellerCompanyCode,
    sellerPhone: invoice.sellerPhone,
    sellerAddress: invoice.sellerAddress,
    sellerEmail: invoice.sellerEmail,

    invoiceDate: invoice.date || invoice.createTs,
    pdfAttachment: pdfBuffer,
  });
}

// Nauja funkcija apmokėtoms sąskaitoms
export async function sendPaidInvoiceEmailAction(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Neprisijungęs.");

  // Gaunami duomenis
  const [invoiceData] = await db
    .select()
    .from(Invoices)
    .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
    .where(eq(Invoices.id, id))
    .limit(1);

  if (!invoiceData) throw new Error("Sąskaita nerasta.");
  const { invoices: invoice, customers: customer } = invoiceData;

  const items = await db
    .select()
    .from(InvoiceItems)
    .where(eq(InvoiceItems.invoiceId, id));

  // Paruošiama duomenis PDF generavimui
  const pdfData: InvoiceFormData = {
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date || new Date().toISOString().split("T")[0],
    taxEnabled: invoice.taxEnabled ?? false,
    taxRate: typeof invoice.taxRate === "string" ? parseFloat(invoice.taxRate) : (invoice.taxRate ?? 0),
    items: items.map((item) => ({
      id: item.id.toString(),
      description: item.description,
      quantity: parseFloat(item.quantity.toString()),
      amount: parseFloat(item.amount.toString()),
    })),
    from: {
      personType: invoice.sellerType as any,
      firstName: invoice.sellerFirstName ?? "",
      lastName: invoice.sellerLastName ?? "",
      companyName: invoice.sellerCompanyName ?? "",
      companyCode: invoice.sellerCompanyCode ?? "",
      email: invoice.sellerEmail ?? "",
      phone: invoice.sellerPhone ?? "",
      address: invoice.sellerAddress ?? "",
    },
    to: {
      personType: customer.customerType as any,
      firstName: customer.firstName ?? "",
      lastName: customer.lastName ?? "",
      companyName: customer.companyName ?? "",
      companyCode: customer.companyCode ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
    },
  };

  // Sugeneruojama PDF buferį
  const pdfBuffer = await generateServerPdf(pdfData);

  await sendInvoicePaidEmail({
    email: invoice.buyerEmail || customer.email,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    amount: Math.round(Number(invoice.total) * 100),
    invoiceDate: invoice.date || invoice.createTs,
    
    // PDF
    pdfAttachment: pdfBuffer,
  });
}