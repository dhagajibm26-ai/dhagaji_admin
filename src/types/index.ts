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

export type RawMaterialUnit = string;

export interface IRawMaterial {
  _id: string;
  itemName: string;
  category: RawMaterialCategory;
  colorType?: string;
  hsnCode?: string;
  gstPercentage?: number;
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
  hsnCode: z.string().optional().nullable(),
  gstPercentage: z.number().optional().nullable(),
  hsnCodes: z.array(z.string()).optional(),
  unit: z.string().min(1, "Unit required"),
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
  totalPurchaseAmount?: number;
  netUsed: number;
  hsnCode?: string;
  gstPercentage?: number;
  hsnCodes?: string[];
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
  totalPurchaseAmount: z.number().min(0, "Total purchase amount must be 0 or more").optional(),
  netUsed: z.number().min(0).default(0),
  hsnCode: z.string().optional().nullable(),
  gstPercentage: z.number().optional().nullable(),
  hsnCodes: z.array(z.string()).optional(),
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
  threadColourHex?: string;
  threadCompanyName: string;
  weightPerUnit: number;
  stockAdd: number;
  openingStock: number;
  netUsed: number;
  costPerUnit: number;
  hsnCode?: string;
  gstPercentage?: number;
  hsnCodes?: string[];
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
  threadColourHex: z.string().optional(),
  threadCompanyName: z.string().min(1, "Company name required"),
  weightPerUnit: z.number().min(0).default(0),
  stockAdd: z.number().min(0).default(0),
  openingStock: z.number().min(0).default(0),
  netUsed: z.number().min(0).default(0),
  costPerUnit: z.number().min(0, "Cost must be 0 or more"),
  hsnCode: z.string().optional().nullable(),
  gstPercentage: z.number().optional().nullable(),
  hsnCodes: z.array(z.string()).optional(),
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

export interface IRawMaterialUnit {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const rawMaterialUnitSchema = z.object({
  name: z.string().min(1, "Unit name required"),
  isActive: z.boolean().default(true),
});
export type RawMaterialUnitInput = z.infer<typeof rawMaterialUnitSchema>;

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

export type WorkOrderStatus = "Open" | "Returned" | "Completed" | "Rejected";

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
  status: "Open" | "Returned" | "Completed" | "Rejected";
  isHold?: boolean;
  /** How many of the originally rejected pieces have been resolved via rework */
  rejectedResolved: number;
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
  hsnCodes?: string[];
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
  finishedProductId?: string;
  designName: string;
  barcodeId?: string;
  qty: number;
  sellingPrice: number;
  discount: number;
  lineTotal: number;
  hsnCodes?: string[];
}

export type GSTType = "cgst_sgst" | "igst";

export interface IBill {
  _id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerEmail?: string;
  salesSource: SalesSource;
  items: IBillItem[];
  manualAmount?: number;
  manualNotes?: string;
  gstEnabled: boolean;
  gstType?: GSTType;
  gstRate?: number | null;
  cgstRate?: number | null;
  sgstRate?: number | null;
  gstNumber?: string;
  paymentMethod: PaymentMethod;
  billDate: Date;
  notes?: string;
  billDiscount?: number;
  // virtuals
  subtotal: number;
  discountTotal: number;
  cgstAmount: number;
  sgstAmount: number;
  taxAmount: number;
  grandTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export const billItemSchema = z.object({
  finishedProductId: z.string().optional(),
  designName: z.string().min(1, "Item description required"),
  barcodeId: z.string().optional(),
  qty: z.number().min(1),
  sellingPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  lineTotal: z.number().min(0),
  hsnCodes: z.array(z.string()).optional(),
});

export const billSchema = z
  .object({
    customerName: z.string().min(1, "Customer name required"),
    customerPhone: z.string().optional(),
    customerAddress: z.string().optional(),
    customerEmail: z.string().optional(),
    salesSource: z.enum(["Offline", "Instagram", "WhatsApp", "Exhibition"]),
    items: z.array(billItemSchema).default([]),
    manualAmount: z.number().min(0).optional(),
    manualNotes: z.string().optional(),
    gstEnabled: z.boolean().default(false),
    gstType: z.enum(["cgst_sgst", "igst"]).default("cgst_sgst").optional(),
    gstRate: z
      .number()
      .nullable()
      .optional(),
    cgstRate: z
      .number()
      .nullable()
      .optional(),
    sgstRate: z
      .number()
      .nullable()
      .optional(),
    gstNumber: z.string().optional(),
    paymentMethod: z.enum(["Cash", "UPI", "Card"]),
    billDate: z.string().optional(),
    notes: z.string().optional(),
    billDiscount: z.number().min(0).default(0).optional(),
  })
  .refine(
    (data) => (data.items && data.items.length > 0) || ((data.manualAmount ?? 0) > 0),
    { message: "Either add items or enter a bill amount", path: ["items"] }
  );
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

// ─── SKU Category ─────────────────────────────────────────────────────────────
export interface ISkuCategory {
  _id: string;
  name: string;
  parentId?: string | { _id: string; name: string } | null;
  isSizeFieldEnabled: boolean;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const skuCategorySchema = z.object({
  name: z.string().min(1, "Category name required"),
  parentId: z.string().nullable().optional(),
  isSizeFieldEnabled: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export type SkuCategoryInput = z.infer<typeof skuCategorySchema>;

// ─── Customer ─────────────────────────────────────────────────────────────────
export interface ICustomer {
  _id: string;
  name: string;
  mobileNumbers: string[];
  address?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const customerSchema = z.object({
  name: z.string().min(1, "Name required"),
  mobileNumbers: z
    .array(z.string().min(1, "Mobile number cannot be empty"))
    .min(1, "At least one mobile number is required"),
  address: z.string().optional(),
  email: z.string().optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

// ─── Coupon ───────────────────────────────────────────────────────────────────
export interface ICoupon {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  assignedType: "general" | "customer";
  customerIds: string[] | { _id: string; name: string; mobileNumbers?: string[] }[];
  isActive: boolean;
  neverExpires: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const couponBaseSchema = z.object({
  code: z
    .string()
    .min(1, "Coupon code is required")
    .transform((val) => val.toUpperCase().trim()),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().min(0, "Discount value must be 0 or more"),
  assignedType: z.enum(["general", "customer"]),
  customerIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  neverExpires: z.boolean().default(true),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export const couponSchema = couponBaseSchema
  .refine(
    (data) => {
      if (data.assignedType === "customer" && data.customerIds.length === 0) {
        return false;
      }
      return true;
    },
    {
      message: "At least one customer must be selected for customer-specific coupons",
      path: ["customerIds"],
    }
  )
  .refine(
    (data) => {
      if (!data.neverExpires) {
        return !!data.startDate && !!data.endDate;
      }
      return true;
    },
    {
      message: "Start date and End date are required when coupon has an expiry",
      path: ["endDate"],
    }
  );
export type CouponInput = z.infer<typeof couponSchema>;

// ─── HSN Code ────────────────────────────────────────────────────────────────
export interface IHsnCode {
  _id: string;
  code: string;
  label?: string;
  scope?: string;
  gstPercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const hsnCodeSchema = z.object({
  code: z.string().min(1, "HSN Code required"),
  label: z.string().optional(),
  scope: z.string().optional(),
  gstPercentage: z.number().min(0, "GST percentage must be 0 or more").max(100, "GST percentage cannot exceed 100"),
  isActive: z.boolean().default(true),
});
export type HsnCodeInput = z.infer<typeof hsnCodeSchema>;

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
