CREATE TYPE "public"."customer_type" AS ENUM('physical', 'legal');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('open', 'paid', 'void', 'uncollectible');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"createTs" timestamp DEFAULT now() NOT NULL,
	"customer_type" "customer_type" NOT NULL,
	"first_name" text,
	"last_name" text,
	"company_name" text,
	"company_code" text,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"user_id" text NOT NULL,
	"organization_id" text
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"createTs" timestamp DEFAULT now() NOT NULL,
	"value" integer NOT NULL,
	"description" text NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"customer_id" integer NOT NULL,
	"status" "status" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;