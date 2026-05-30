import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type SalesSource = "Offline" | "Instagram" | "WhatsApp" | "Exhibition";
export type PaymentMethod = "Cash" | "UPI" | "Card";
export type GSTRate = 5 | 12 | 18;

// ─── Sub-document interfaces ──────────────────────────────────────────────────

interface IBillItem {
  finishedProductId: Types.ObjectId;
  designName: string;
  barcodeId: string;
  qty: number;
  sellingPrice: number;
  discount: number;    // per unit discount
  lineTotal: number;   // (sellingPrice - discount) * qty
}

// ─── Main document interface ──────────────────────────────────────────────────

export interface IBillDocument extends Document {
  billNumber: string;       // DC-2024-0001 format, auto-generated
  customerName: string;
  customerPhone?: string;
  salesSource: SalesSource;
  items: IBillItem[];
  gstEnabled: boolean;
  gstRate?: GSTRate | null;
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

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const BillItemSchema = new Schema<IBillItem>(
  {
    finishedProductId: {
      type: Schema.Types.ObjectId,
      ref: "FinishedProduct",
      required: true,
    },
    designName: { type: String, required: true },
    barcodeId: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    sellingPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
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
    salesSource: {
      type: String,
      enum: ["Offline", "Instagram", "WhatsApp", "Exhibition"],
      required: true,
    },
    items: { type: [BillItemSchema], required: true, default: [] },
    gstEnabled: { type: Boolean, default: false },
    gstRate: { type: Number, enum: [5, 12, 18, null], default: null },
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

/** Sum of (sellingPrice × qty) before discount */
BillSchema.virtual("subtotal").get(function (this: IBillDocument) {
  return this.items.reduce((sum, item) => sum + item.sellingPrice * item.qty, 0);
});

/** Sum of all per-unit discounts × qty */
BillSchema.virtual("discountTotal").get(function (this: IBillDocument) {
  return this.items.reduce((sum, item) => sum + item.discount * item.qty, 0);
});

/** GST on (subtotal - discountTotal) */
BillSchema.virtual("taxAmount").get(function (this: IBillDocument) {
  if (!this.gstEnabled || !this.gstRate) return 0;
  const taxable =
    this.items.reduce((sum, item) => sum + item.sellingPrice * item.qty, 0) -
    this.items.reduce((sum, item) => sum + item.discount * item.qty, 0);
  return (taxable * this.gstRate) / 100;
});

/** Final amount payable */
BillSchema.virtual("grandTotal").get(function (this: IBillDocument) {
  const subtotal = this.items.reduce(
    (sum, item) => sum + item.sellingPrice * item.qty,
    0
  );
  const itemDiscounts = this.items.reduce(
    (sum, item) => sum + item.discount * item.qty,
    0
  );
  const billDiscount = this.billDiscount ?? 0;
  const taxable = Math.max(0, subtotal - itemDiscounts - billDiscount);
  const tax =
    this.gstEnabled && this.gstRate
      ? (taxable * this.gstRate) / 100
      : 0;
  return taxable + tax;
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

BillSchema.index({ billNumber: 1 }, { unique: true });
BillSchema.index({ billDate: -1 });
BillSchema.index({ customerPhone: 1 });
BillSchema.index({ salesSource: 1 });

export const Bill: Model<IBillDocument> =
  mongoose.models.Bill ?? mongoose.model<IBillDocument>("Bill", BillSchema);
