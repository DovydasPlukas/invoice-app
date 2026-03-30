export type PersonType = "physical" | "legal";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  amount: number;
}

export interface PartyInfo {
  personType: PersonType;
  // Physical person
  firstName: string;
  lastName: string;
  // Legal person
  companyName: string;
  companyCode: string;
  // Common
  email: string;
  phone: string;
  address: string;
}

export interface InvoiceFormData {
  invoiceNumber: string;
  date: string;
  from: PartyInfo;
  to: PartyInfo;
  items: InvoiceItem[];
  taxEnabled: boolean;
  taxRate: number;
}

export const TAX_RATE = 0.21;
export const TAX_LABEL = "PVM";
