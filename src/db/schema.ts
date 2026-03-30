import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const customerTypeEnum = pgEnum("customer_type", ["physical", "legal"]);

export const statusEnum = pgEnum("status", [
  "open",
  "paid",
  "void",
  "uncollectible",
]);

export type Status = "open" | "paid" | "void" | "uncollectible";

export const Customers = pgTable("customers", {
  id: serial("id").primaryKey().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  customerType: customerTypeEnum("customer_type").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  companyName: text("company_name"),
  companyCode: text("company_code"),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  userId: text("user_id"),
  organizationId: text("organization_id"),
});

export const Invoices = pgTable("invoices", {
  id: serial("id").primaryKey().notNull(),
  createTs: timestamp("create_ts").defaultNow().notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  date: text("date").notNull(),
  // Seller snapshot
  sellerType: customerTypeEnum("seller_type").notNull(),
  sellerFirstName: text("seller_first_name"),
  sellerLastName: text("seller_last_name"),
  sellerCompanyName: text("seller_company_name"),
  sellerCompanyCode: text("seller_company_code"),
  sellerEmail: text("seller_email").notNull(),
  sellerPhone: text("seller_phone"),
  sellerAddress: text("seller_address"),
  // Buyer snapshot
  customerId: integer("customer_id").references(() => Customers.id),
  buyerType: customerTypeEnum("buyer_type").notNull(),
  buyerFirstName: text("buyer_first_name"),
  buyerLastName: text("buyer_last_name"),
  buyerCompanyName: text("buyer_company_name"),
  buyerCompanyCode: text("buyer_company_code"),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone"),
  buyerAddress: text("buyer_address"),
  // Financials
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxEnabled: boolean("tax_enabled").notNull().default(false),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  // Status
  status: statusEnum("status").notNull().default("open"),
  // Auth
  userId: text("user_id"),
  organizationId: text("organization_id"),
});

export const InvoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey().notNull(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => Invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
});