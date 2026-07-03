import { z } from "zod";

export interface IPurchaseEntry {
  quantity: number;
  totalAmount: number;
  ratePerUnit: number;
  purchasedAt: string;
}

const purchaseEntrySchema = z.object({
  quantity: z.number().min(0),
  totalAmount: z.number().min(0),
  ratePerUnit: z.number().min(0),
  purchasedAt: z.string(),
});

// ─── Auth ────────────────────────────────────────────────────────────────────
/** `username` key is required by next-auth Credentials; the VALUE is the email */
export const loginSchema = z.object({
  username: z.string().min(1, "Email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ─── User / Role ─────────────────────────────────────────────────────────────
export type UserRole = "owner" | "staff";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Raw Material ─────────────────────────────────────────────────────────────
export type RawMaterialCategory = string;

export type RawMaterialUnit = "gram" | "pcs" | "tube" | "box" | "meter";

export interface IRawMaterial {
  _id: string;
  itemName: string;
  category: RawMaterialCategory;
  colorType?: string;
  hsnCodes?: string[];
  unit: RawMaterialUnit;
  unitsPerPack?: number;
  openingStock: number;
  purchasedQty: number;
  usedQty: number;
  ratePerUnit: number;
  lowStockThreshold: number;
  supplier?: string;
  lastPurchaseDate?: string;
  purchaseHistory?: IPurchaseEntry[];
  // virtuals
  closingStock: number;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export const rawMaterialSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  category: z.string().min(1, "Category required"),
  colorType: z.string().optional(),
  hsnCodes: z.array(z.string()).optional(),
  unit: z.enum(["gram", "pcs", "tube", "box", "meter"]),
  unitsPerPack: z.number().min(1).default(1),
  openingStock: z.number().min(0).default(0),
  purchasedQty: z.number().min(0).default(0),
  usedQty: z.number().min(0).default(0),
  ratePerUnit: z.number().min(0),
  lowStockThreshold: z.number().min(0).default(10),
  supplier: z.string().optional(),
  lastPurchaseDate: z.string().optional(),
  purchaseHistory: z.array(purchaseEntrySchema).optional(),
});
export type RawMaterialInput = z.infer<typeof rawMaterialSchema>;

// ─── Bangles Stock ────────────────────────────────────────────────────────────
export type CutType = "C1" | "C2" | "C4" | "C6";

export interface IBanglesStock {
  _id: string;
  size: string;
  cutType: CutType;
  quantityAdd: number;
  pricePerPiece: number;
  netUsed: number;
  purchaseHistory?: IPurchaseEntry[];
  // virtuals
  peta: number;
  totalQuantity: number;
  totalPieces: number;
  totalValue: number;
  closingStock: number;
  status: "OK" | "Low Stock" | "Out of Stock";
  createdAt: Date;
  updatedAt: Date;
}

export const banglesStockSchema = z.object({
  size: z.string().min(1, "Bangle size is required (e.g. 2.4 or 2,4)"),
  cutType: z.enum(["C1", "C2", "C4", "C6"]),
  quantityAdd: z.number().min(0, "Quantity must be 0 or more"),
  pricePerPiece: z.number().min(0, "Price must be 0 or more"),
  netUsed: z.number().min(0).default(0),
  purchaseHistory: z.array(purchaseEntrySchema).optional(),
});
export type BanglesStockInput = z.infer<typeof banglesStockSchema>;

export interface IBangleSize {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const bangleSizeSchema = z.object({
  name: z.string().min(1, "Bangle size name required"),
  isActive: z.boolean().default(true),
});
export type BangleSizeInput = z.infer<typeof bangleSizeSchema>;

// ─── Threads Stock ────────────────────────────────────────────────────────────
export interface IThreadsStock {
  _id: string;
  threadCode: string;
  threadColour: string;
  threadCompanyName: string;
  weightPerUnit: number;
  stockAdd: number;
  openingStock: number;
  netUsed: number;
  costPerUnit: number;
  purchaseHistory?: IPurchaseEntry[];
  // virtuals
  closingStock: number;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export const threadsStockSchema = z.object({
  threadCode: z.string().min(1, "Thread code required"),
  threadColour: z.string().min(1, "Colour required"),
  threadCompanyName: z.string().min(1, "Company name required"),
  weightPerUnit: z.number().min(0).default(0),
  stockAdd: z.number().min(0).default(0),
  openingStock: z.number().min(0).default(0),
  netUsed: z.number().min(0).default(0),
  costPerUnit: z.number().min(0, "Cost must be 0 or more"),
  purchaseHistory: z.array(purchaseEntrySchema).optional(),
});
export type ThreadsStockInput = z.infer<typeof threadsStockSchema>;

// ─── Worker ───────────────────────────────────────────────────────────────────
export interface IWorker {
  _id: string;
  name: string;
  nameGu?: string;
  fatherOrHusbandName?: string;
  fatherOrHusbandNameGu?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  bloodGroup?: string;
  mobile?: string;
  emergencyContact?: string;
  phone?: string;
  address?: string;
  addressGu?: string;
  aadhaarNumber?: string;
  designation?: string;
  joiningDate?: string;
  photoDataUrl?: string;
  isActive: boolean;
  bankDetails?: {
    accountNo?: string;
    ifsc?: string;
    bankName?: string;
  };
  totalEarned: number;
  totalPaid: number;
  // virtual
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export const workerSchema = z.object({
  name: z.string().min(1, "Name required"),
  nameGu: z.string().optional(),
  fatherOrHusbandName: z.string().optional(),
  fatherOrHusbandNameGu: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  bloodGroup: z.string().optional(),
  mobile: z.string().optional(),
  emergencyContact: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  addressGu: z.string().optional(),
  aadhaarNumber: z
    .string()
    .regex(/^\d{4}\s\d{4}\s\d{4}$/, "Aadhaar must be in XXXX XXXX XXXX format")
    .optional()
    .or(z.literal("")),
  designation: z.string().optional(),
  joiningDate: z.string().optional(),
  photoDataUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  bankDetails: z
    .object({
      accountNo: z.string().optional(),
      ifsc: z.string().optional(),
      bankName: z.string().optional(),
    })
    .optional(),
});
export type WorkerInput = z.infer<typeof workerSchema>;

export interface IRawMaterialCategory {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const rawMaterialCategorySchema = z.object({
  name: z.string().min(1, "Category name required"),
  isActive: z.boolean().default(true),
});
export type RawMaterialCategoryInput = z.infer<typeof rawMaterialCategorySchema>;

// ─── Work Order schemas ───────────────────────────────────────────────────────

export const banglesGivenItemSchema = z.object({
  banglesStockId: z.string().min(1, "Bangles stock ID required"),
  size: z.string().optional(),
  cutType: z.enum(["C1", "C2", "C4", "C6"]),
  cuts: z.number().min(0),
  pieces: z.number().min(0),
});

export const threadGivenItemSchema = z.object({
  threadStockId: z.string().min(1, "Thread stock ID required"),
  threadCode: z.string().min(1),
  threadColour: z.string().min(1),
  grams: z.number().min(0),
});

export const rawMaterialGivenItemSchema = z.object({
  rawMaterialId: z.string().min(1, "Raw material ID required"),
  itemName: z.string().min(1),
  qty: z.number().min(0),
  kind: z.string().min(1),
  unit: z.string().optional(),
});

export const workOrderCreateSchema = z.object({
  workerId: z.string().min(1, "Worker required"),
  date: z.string().optional(),
  workType: z.string().min(1, "Work type required"),
  perPieceRate: z.number().min(0, "Rate required"),
  // ASSIGNMENT TYPE
  assignmentType: z.enum(["full", "half"]).default("full"),
  parentWorkOrderId: z.string().optional(),
  allowReturn: z.boolean().default(true),
  // DENA
  banglesGiven: z.array(banglesGivenItemSchema).default([]),
  threadItemsGiven: z.array(threadGivenItemSchema).default([]),
  threadsGiven: z.number().min(0).default(0),
  /** Optional — ID of the ThreadsStock to deduct from */
  threadStockId: z.string().optional(),
  rawMaterialsGiven: z.array(rawMaterialGivenItemSchema).default([]),
  glueGiven: z.number().min(0).default(0),
  cutterGiven: z.number().min(0).default(0),
  /** Optional — ID of the RawMaterial (glue) to deduct from */
  glueStockId: z.string().optional(),
  otherMaterialGiven: z
    .array(z.object({ name: z.string().min(1), qty: z.number().min(0) }))
    .default([]),
});
export type WorkOrderCreateInput = z.infer<typeof workOrderCreateSchema>;

/** New finished product created directly from a worker return. */
export const newFinishedProductSchema = z.object({
  category: z.string().min(1).default("Bangle"),
  designName: z.string().min(1, "Design name required"),
  designCode: z.string().optional(),
  size: z.string().min(1, "Size required"),
  makingCostPerPc: z.number().min(0).optional(),
  otherCostPerPc: z.number().min(0).optional(),
});
export type NewFinishedProductInput = z.infer<typeof newFinishedProductSchema>;

export const workOrderReturnSchema = z.object({
  banglesReturned: z
    .array(
      z.object({
        banglesStockId: z.string().optional(),
        size: z.string().optional(),
        cutType: z.enum(["C1", "C2", "C4", "C6"]),
        cuts: z.number().min(0),
        pieces: z.number().min(0),
      })
    )
    .default([]),
  rawMaterialsReturned: z
    .array(
      z.object({
        rawMaterialId: z.string().min(1),
        itemName: z.string().min(1),
        qty: z.number().min(0),
      })
    )
    .default([]),
  threadsReturned: z.number().min(0).default(0),
  glueReturned: z.number().min(0).default(0),
  cutterReturned: z.number().min(0).default(0),
  otherReturned: z
    .array(z.object({ name: z.string().min(1), qty: z.number().min(0) }))
    .default([]),
  finishedPieces: z.number().min(0),
  qualityOK: z.number().min(0),
  finishedProductId: z.string().optional(),
  newFinishedProduct: newFinishedProductSchema.optional(),
  perPieceRate: z.number().min(0).optional(),
  damageNotes: z.string().optional(),
  /** For half-work final leg: return data for each ancestor in the chain */
  chainReturns: z
    .array(
      z.object({
        orderId: z.string().min(1),
        banglesReturned: z
          .array(
            z.object({
              banglesStockId: z.string().optional(),
              size: z.string().optional(),
              cutType: z.enum(["C1", "C2", "C4", "C6"]),
              cuts: z.number().min(0),
              pieces: z.number().min(0),
            })
          )
          .default([]),
        rawMaterialsReturned: z
          .array(
            z.object({
              rawMaterialId: z.string().min(1),
              itemName: z.string().min(1),
              qty: z.number().min(0),
            })
          )
          .default([]),
        threadsReturned: z.number().min(0).default(0),
      })
    )
    .default([]),
}).refine((d) => d.qualityOK <= d.finishedPieces, {
  message: "qualityOK cannot exceed finishedPieces",
  path: ["qualityOK"],
});
export type WorkOrderReturnInput = z.infer<typeof workOrderReturnSchema>;

export const paymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be > 0"),
  paymentMethod: z.enum(["Cash", "UPI", "Card"]).default("Cash"),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

// ─── Work Order ───────────────────────────────────────────────────────────────
export interface IWorkOrder {
  _id: string;
  workerId: string;
  date: Date;
  workType: string;
  // ASSIGNMENT TYPE
  assignmentType: "full" | "half";
  parentWorkOrderId?: string;
  allowReturn: boolean;
  // DENA
  banglesGiven: Array<{
    banglesStockId: string;
    size?: string;
    cutType: CutType;
    cuts: number;
    pieces: number;
  }>;
  threadItemsGiven?: Array<{
    threadStockId: string;
    threadCode: string;
    threadColour: string;
    grams: number;
  }>;
  threadsGiven: number;
  rawMaterialsGiven?: Array<{
    rawMaterialId: string;
    itemName: string;
    qty: number;
    kind: string;
    unit?: string;
  }>;
  glueGiven: number;
  cutterGiven?: number;
  otherMaterialGiven: Array<{ name: string; qty: number }>;
  // LENA
  banglesReturned: Array<{
    banglesStockId?: string;
    size?: string;
    cutType: CutType;
    cuts: number;
    pieces: number;
  }>;
  rawMaterialsReturned?: Array<{
    rawMaterialId: string;
    itemName: string;
    qty: number;
  }>;
  threadsReturned: number;
  glueReturned: number;
  cutterReturned?: number;
  otherReturned: Array<{ name: string; qty: number }>;
  // OUTPUT
  finishedPieces: number;
  qualityOK: number;
  finishedProductId?: string;
  // NOTES
  damageNotes?: string;
  // PAYMENT
  perPieceRate: number;
  amountPaid: number;
  status: "Open" | "Returned" | "Completed";
  // virtuals
  netBangles: number;
  netThreads: number;
  netGlue: number;
  rejected: number;
  amountDue: number;          // gross OK earnings
  rejectionDeduction: number; // 50% penalty on rejected pieces
  netAmountDue: number;       // amountDue - rejectionDeduction
  balance: number;
  paymentStatus: "Paid" | "Partial" | "Unpaid";
  createdAt: Date;
  updatedAt: Date;
}

// ─── Finished Product ─────────────────────────────────────────────────────────

/** Categories used to classify what a worker finished (shown in Finished Stock). */
export const FINISHED_PRODUCT_CATEGORIES = [
  "Bangle",
  "Thread Work",
  "Kundan Work",
  "Mix Set",
  "Other",
] as const;

export interface IFinishedProduct {
  _id: string;
  designName: string;
  designCode: string;
  category: string;
  size: string;
  makingCostPerPc: number;
  otherCostPerPc: number;
  MRP: number;
  wholesalePrice: number;
  sellingPrice: number;
  mrpMarginOverride: boolean;
  readyStock: number;
  totalSold: number;
  barcodeId: string;
  // virtuals
  totalCost: number;
  totalRevenue: number;
  profitPerPc: number;
  createdAt: Date;
  updatedAt: Date;
}

export const finishedProductSchema = z.object({
  designName: z.string().min(1, "Design name required"),
  designCode: z.string().min(1, "Design code required"),
  category: z.string().min(1).default("Bangle"),
  size: z.string().min(1, "Size required"),
  makingCostPerPc: z.number().min(0),
  otherCostPerPc: z.number().min(0).default(0),
  MRP: z.number().min(0),
  wholesalePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  mrpMarginOverride: z.boolean().default(false),
  readyStock: z.number().min(0).default(0),
});
export type FinishedProductInput = z.infer<typeof finishedProductSchema>;

// ─── Bill / Invoice ───────────────────────────────────────────────────────────
export type SalesSource = "Offline" | "Instagram" | "WhatsApp" | "Exhibition";
export type PaymentMethod = "Cash" | "UPI" | "Card";

export interface IBillItem {
  finishedProductId: string;
  designName: string;
  barcodeId: string;
  qty: number;
  sellingPrice: number;
  discount: number;
  lineTotal: number;
  hsnCodes?: string[];
}

export interface IBill {
  _id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  salesSource: SalesSource;
  items: IBillItem[];
  gstEnabled: boolean;
  gstRate?: number | null;
  gstNumber?: string;
  paymentMethod: PaymentMethod;
  billDate: Date;
  notes?: string;
  billDiscount?: number;
  // virtuals
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  grandTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export const billItemSchema = z.object({
  finishedProductId: z.string().min(1),
  designName: z.string().min(1),
  barcodeId: z.string().min(1),
  qty: z.number().min(1),
  sellingPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  lineTotal: z.number().min(0),
  hsnCodes: z.array(z.string()).optional(),
});

export const billSchema = z.object({
  customerName: z.string().min(1, "Customer name required"),
  customerPhone: z.string().optional(),
  salesSource: z.enum(["Offline", "Instagram", "WhatsApp", "Exhibition"]),
  items: z.array(billItemSchema).min(1, "At least one item required"),
  gstEnabled: z.boolean().default(false),
  gstRate: z
    .number()
    .nullable()
    .optional(),
  gstNumber: z.string().optional(),
  paymentMethod: z.enum(["Cash", "UPI", "Card"]),
  billDate: z.string().optional(),
  notes: z.string().optional(),
  billDiscount: z.number().min(0).default(0).optional(),
});
export type BillInput = z.infer<typeof billSchema>;

// ─── Expense ──────────────────────────────────────────────────────────────────
export type ExpenseCategory =
  | "Rent"
  | "Electricity"
  | "Transport"
  | "Marketing"
  | "Other";

export interface IExpense {
  _id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: Date;
  paidBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
