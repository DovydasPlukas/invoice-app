CREATE TYPE "public"."customer_type" AS ENUM('physical', 'legal');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('open', 'paid', 'void', 'uncollectible');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"customer_type" "customer_type" NOT NULL,
	"first_name" text,
	"last_name" text,
	"company_name" text,
	"company_code" text,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"user_id" text,
	"organization_id" text
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"create_ts" timestamp DEFAULT now() NOT NULL,
	"invoice_number" text NOT NULL,
	"date" text NOT NULL,
	"seller_type" "customer_type" NOT NULL,
	"seller_first_name" text,
	"seller_last_name" text,
	"seller_company_name" text,
	"seller_company_code" text,
	"seller_email" text NOT NULL,
	"seller_phone" text,
	"seller_address" text,
	"customer_id" integer,
	"buyer_type" "customer_type" NOT NULL,
	"buyer_first_name" text,
	"buyer_last_name" text,
	"buyer_company_name" text,
	"buyer_company_code" text,
	"buyer_email" text NOT NULL,
	"buyer_phone" text,
	"buyer_address" text,
	"subtotal" numeric(12, 2) NOT NULL,
	"tax_enabled" boolean DEFAULT false NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"status" "status" DEFAULT 'open' NOT NULL,
	"user_id" text,
	"organization_id" text
);
--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;