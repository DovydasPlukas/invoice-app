import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { AVAILABLE_STATUSES } from "@/data/invoices";

export type Status = (typeof AVAILABLE_STATUSES)[number]["id"];

const statuses = AVAILABLE_STATUSES.map(({ id }) => id) as Array<Status>;

export const statusEnum = pgEnum(
  "status",
  statuses as [Status, ...Array<Status>],
);

export const customerTypeEnum = pgEnum("customer_type", ["physical", "legal"]);

export const Customers = pgTable("customers", {
  id: serial("id").primaryKey().notNull(),
  createTs: timestamp("createTs").defaultNow().notNull(),

  customerType: customerTypeEnum("customer_type").notNull(),

  // Physical person
  firstName: text("first_name"),
  lastName: text("last_name"),

  // Legal entity
  companyName: text("company_name"),
  companyCode: text("company_code"),

  // Shared
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),

  userId: text("user_id").notNull(),
  organizationId: text("organization_id"),
});

export const Invoices = pgTable("invoices", {
  id: serial("id").primaryKey().notNull(),
  createTs: timestamp("createTs").defaultNow().notNull(),
  value: integer("value").notNull(), // stored in cents
  description: text("description").notNull(),
  userId: text("user_id").notNull(),
  organizationId: text("organization_id"),

  customerId: integer("customer_id")
    .notNull()
    .references(() => Customers.id),

  status: statusEnum("status").notNull(),
});