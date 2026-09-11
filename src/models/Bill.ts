import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type SalesSource = "Offline" | "Instagram" | "WhatsApp" | "Exhibition";
export type PaymentMethod = "Cash" | "UPI" | "Card";
export type GSTRate = number;
export type GSTType = "cgst_sgst" | "igst";

// ─── Sub-document interfaces ──────────────────────────────────────────────────

interface IBillItem {
  finishedProductId?: Types.ObjectId;
  designName: string;
  barcodeId?: string;
  qty: number;
  sellingPrice: number;
  discount: number;    // per unit discount
  lineTotal: number;   // (sellingPrice - discount) * qty
  hsnCodes?: string[];
}

// ─── Main document interface ──────────────────────────────────────────────────

export interface IBillDocument extends Document {
  billNumber: string;       // DC-2024-0001 format, auto-generated
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
  gstRate?: GSTRate | null;
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

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const BillItemSchema = new Schema<IBillItem>(
  {
    finishedProductId: {
      type: Schema.Types.ObjectId,
      ref: "FinishedProduct",
      required: false,
    },
    designName: { type: String, required: true },
    barcodeId: { type: String, required: false },
    qty: { type: Number, required: true, min: 1 },
    sellingPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    hsnCodes: { type: [String], default: [] },
  },
  { _id: false }
);

// ─── Auto bill number ─────────────────────────────────────────────────────────

async function generateBillNumber(model: Model<IBillDocument>): Promise<string> {
  const year = new Date().getFullYear();
  const count = await model.countDocuments();
  return `DC-${year}-${String(count + 1).padStart(4, "0")}`;
}

// ─── Main schema ──────────────────────────────────────────────────────────────

const BillSchema = new Schema<IBillDocument>(
  {
    billNumber: { type: String, unique: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    customerAddress: { type: String, trim: true },
    customerEmail: { type: String, trim: true },
    salesSource: {
      type: String,
      enum: ["Offline", "Instagram", "WhatsApp", "Exhibition"],
      required: true,
    },
    items: { type: [BillItemSchema], default: [] },
    manualAmount: { type: Number, default: 0, min: 0 },
    manualNotes: { type: String, trim: true },
    gstEnabled: { type: Boolean, default: false },
    gstType: { type: String, enum: ["cgst_sgst", "igst"], default: "cgst_sgst" },
    gstRate: { type: Number, default: null },
    cgstRate: { type: Number, default: null },
    sgstRate: { type: Number, default: null },
    gstNumber: { type: String, trim: true },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card"],
      required: true,
    },
    billDate: { type: Date, required: true, default: Date.now },
    notes: { type: String },
    billDiscount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Pre-save: auto-generate billNumber ───────────────────────────────────────

BillSchema.pre("validate", async function (this: IBillDocument) {
  if (!this.billNumber) {
    const BillModel = mongoose.models.Bill as Model<IBillDocument>;
    this.billNumber = await generateBillNumber(BillModel);
  }
});

// ─── Virtuals ─────────────────────────────────────────────────────────────────

/** Sum of (sellingPrice × qty) before discount, or manualAmount if no items */
BillSchema.virtual("subtotal").get(function (this: IBillDocument) {
  const itemTotal = (this.items || []).reduce((sum, item) => sum + item.sellingPrice * item.qty, 0);
  return itemTotal > 0 ? itemTotal : (this.manualAmount || 0);
});

/** Sum of all per-unit discounts × qty */
BillSchema.virtual("discountTotal").get(function (this: IBillDocument) {
  return (this.items || []).reduce((sum, item) => sum + (item.discount || 0) * item.qty, 0);
});

/** CGST on taxable amount */
BillSchema.virtual("cgstAmount").get(function (this: IBillDocument) {
  if (!this.gstEnabled) return 0;
  const itemTotal = (this.items || []).reduce((sum, item) => sum + item.sellingPrice * item.qty, 0);
  const subtotal = itemTotal > 0 ? itemTotal : (this.manualAmount || 0);
  const itemDiscounts = (this.items || []).reduce((sum, item) => sum + (item.discount || 0) * item.qty, 0);
  const taxable = Math.max(0, subtotal - itemDiscounts - (this.billDiscount ?? 0));
  const rate = this.cgstRate ?? (this.gstType === "cgst_sgst" && this.gstRate ? this.gstRate / 2 : 0);
  return (taxable * rate) / 100;
});

/** SGST on taxable amount */
BillSchema.virtual("sgstAmount").get(function (this: IBillDocument) {
  if (!this.gstEnabled) return 0;
  const itemTotal = (this.items || []).reduce((sum, item) => sum + item.sellingPrice * item.qty, 0);
  const subtotal = itemTotal > 0 ? itemTotal : (this.manualAmount || 0);
  const itemDiscounts = (this.items || []).reduce((sum, item) => sum + (item.discount || 0) * item.qty, 0);
  const taxable = Math.max(0, subtotal - itemDiscounts - (this.billDiscount ?? 0));
  const rate = this.sgstRate ?? (this.gstType === "cgst_sgst" && this.gstRate ? this.gstRate / 2 : 0);
  return (taxable * rate) / 100;
});

/** Total Tax (CGST+SGST or IGST) */
BillSchema.virtual("taxAmount").get(function (this: IBillDocument) {
  if (!this.gstEnabled) return 0;
  const itemTotal = (this.items || []).reduce((sum, item) => sum + item.sellingPrice * item.qty, 0);
  const subtotal = itemTotal > 0 ? itemTotal : (this.manualAmount || 0);
  const itemDiscounts = (this.items || []).reduce((sum, item) => sum + (item.discount || 0) * item.qty, 0);
  const taxable = Math.max(0, subtotal - itemDiscounts - (this.billDiscount ?? 0));
  
  if (this.gstType === "cgst_sgst") {
    const cgst = this.cgstRate ?? (this.gstRate ? this.gstRate / 2 : 0);
    const sgst = this.sgstRate ?? (this.gstRate ? this.gstRate / 2 : 0);
    return (taxable * (cgst + sgst)) / 100;
  }
  if (!this.gstRate) return 0;
  return (taxable * this.gstRate) / 100;
});

/** Final amount payable */
BillSchema.virtual("grandTotal").get(function (this: IBillDocument) {
  const itemTotal = (this.items || []).reduce((sum, item) => sum + item.sellingPrice * item.qty, 0);
  const subtotal = itemTotal > 0 ? itemTotal : (this.manualAmount || 0);
  const itemDiscounts = (this.items || []).reduce((sum, item) => sum + (item.discount || 0) * item.qty, 0);
  const billDiscount = this.billDiscount ?? 0;
  const taxable = Math.max(0, subtotal - itemDiscounts - billDiscount);

  let tax = 0;
  if (this.gstEnabled) {
    if (this.gstType === "cgst_sgst") {
      const cgst = this.cgstRate ?? (this.gstRate ? this.gstRate / 2 : 0);
      const sgst = this.sgstRate ?? (this.gstRate ? this.gstRate / 2 : 0);
      tax = (taxable * (cgst + sgst)) / 100;
    } else if (this.gstRate) {
      tax = (taxable * this.gstRate) / 100;
    }
  }
  return taxable + tax;
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

BillSchema.index({ billNumber: 1 }, { unique: true });
BillSchema.index({ billDate: -1 });
BillSchema.index({ customerPhone: 1 });
BillSchema.index({ salesSource: 1 });

if (process.env.NODE_ENV === "development" && mongoose.models.Bill) {
  delete mongoose.models.Bill;
}

export const Bill: Model<IBillDocument> =
  mongoose.models.Bill ?? mongoose.model<IBillDocument>("Bill", BillSchema);
