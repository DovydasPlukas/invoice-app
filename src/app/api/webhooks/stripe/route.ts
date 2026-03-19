import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { Invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const stripe = new Stripe(String(process.env.STRIPE_API_SECRET));
const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Extract invoice ID from the metadata or success URL
        // The success URL format: /invoices/{id}/payment?status=success&session_id={CHECKOUT_SESSION_ID}
        const invoiceId = session.metadata?.invoiceId
          ? Number.parseInt(session.metadata.invoiceId)
          : null;

        if (invoiceId && session.payment_status === "paid") {
          await db
            .update(Invoices)
            .set({ status: "paid" })
            .where(eq(Invoices.id, invoiceId));

          revalidatePath(`/invoices/${invoiceId}`);
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Payment failed for session:", session.id);
        // You can emit an event or send a notification here
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoiceId
          ? Number.parseInt(session.metadata.invoiceId)
          : null;

        if (invoiceId) {
          await db
            .update(Invoices)
            .set({ status: "paid" })
            .where(eq(Invoices.id, invoiceId));

          revalidatePath(`/invoices/${invoiceId}`);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
