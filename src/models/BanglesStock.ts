import mongoose, { Schema, Document, Model } from "mongoose";

const PurchaseEntrySchema = new Schema(
  {
    quantity: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    ratePerUnit: { type: Number, required: true, min: 0 },
    purchasedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

export type CutType = "C1" | "C2" | "C4" | "C6";

/** Pieces per cut: C1=12, C2=24, C4=48, C6=72 */
const PETA_MAP: Record<CutType, number> = {
  C1: 12,
  C2: 24,
  C4: 48,
  C6: 72,
};

export interface IBanglesStockDocument extends Document {
  size: string;        // diameter, e.g. "2.4", "2.6"
  cutType: CutType;
  quantityAdd: number; // number of cuts added
  pricePerPiece: number;
  netUsed: number;     // pieces deducted when given to worker
  purchaseHistory?: Array<{
    quantity: number;
    totalAmount: number;
    ratePerUnit: number;
    purchasedAt: Date;
  }>;
  isDeleted?: boolean;
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

const BanglesStockSchema = new Schema<IBanglesStockDocument>(
  {
    size: { type: String, required: true, trim: true },
    cutType: {
      type: String,
      enum: ["C1", "C2", "C4", "C6"],
      required: true,
    },
    quantityAdd: { type: Number, required: true, min: 0, default: 0 },
    pricePerPiece: { type: Number, required: true, min: 0 },
    netUsed: { type: Number, default: 0, min: 0 },
    purchaseHistory: { type: [PurchaseEntrySchema], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

BanglesStockSchema.virtual("peta").get(function (this: IBanglesStockDocument) {
  return PETA_MAP[this.cutType];
});

BanglesStockSchema.virtual("totalQuantity").get(function (
  this: IBanglesStockDocument
) {
  return this.quantityAdd;
});

BanglesStockSchema.virtual("totalPieces").get(function (
  this: IBanglesStockDocument
) {
  return this.quantityAdd * PETA_MAP[this.cutType];
});

BanglesStockSchema.virtual("totalValue").get(function (
  this: IBanglesStockDocument
) {
  return this.quantityAdd * PETA_MAP[this.cutType] * this.pricePerPiece;
});

BanglesStockSchema.virtual("closingStock").get(function (
  this: IBanglesStockDocument
) {
  return this.quantityAdd * PETA_MAP[this.cutType] - this.netUsed;
});

BanglesStockSchema.virtual("status").get(function (
  this: IBanglesStockDocument
) {
  const closing = this.quantityAdd * PETA_MAP[this.cutType] - this.netUsed;
  if (closing <= 0) return "Out of Stock";
  if (closing <= 50) return "Low Stock";
  return "OK";
});

BanglesStockSchema.index({ size: 1, cutType: 1 });

export const BanglesStock: Model<IBanglesStockDocument> =
  mongoose.models.BanglesStock ??
  mongoose.model<IBanglesStockDocument>("BanglesStock", BanglesStockSchema);
