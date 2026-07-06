export type TgemApprovalStatus = "approved" | "current" | "waiting" | "rejected";

export type TgemApprovalStep = {
  id: string;
  role: string;
  person: string;
  status: TgemApprovalStatus;
  dueDate: string;
  comment?: string;
};

export type TgemInvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};

export type TgemInvoice = {
  id: string;
  number: string;
  supplier: string;
  supplierRegNo: string;
  project: string;
  contract: string;
  receivedDate: string;
  dueDate: string;
  servicePeriod: string;
  currency: string;
  subtotal: number;
  vat: number;
  total: number;
  status: "Needs review" | "In approval" | "Approved";
  risk: "Low" | "Medium" | "High";
  paymentTerm: string;
  bankAccount: string;
  reference: string;
  lines: TgemInvoiceLine[];
  approvals: TgemApprovalStep[];
};
