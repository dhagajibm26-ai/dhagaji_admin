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

export type RawMaterialCategory = string;

export type RawMaterialUnit = string;

export interface IRawMaterialDocument extends Document {
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
  lastPurchaseDate?: Date;
  purchaseHistory?: Array<{
    quantity: number;
    totalAmount: number;
    ratePerUnit: number;
    purchasedAt: Date;
  }>;
  /** Soft-delete flag — filtered out in all list queries */
  isDeleted?: boolean;
  // virtuals
  closingStock: number;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const RawMaterialSchema = new Schema<IRawMaterialDocument>(
  {
    itemName: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    colorType: { type: String, trim: true },
    hsnCode: { type: String, trim: true },
    gstPercentage: { type: Number, default: 0 },
    hsnCodes: { type: [String], default: [] },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    unitsPerPack: { type: Number, default: 1, min: 1 },
    openingStock: { type: Number, required: true, default: 0, min: 0 },
    purchasedQty: { type: Number, default: 0, min: 0 },
    usedQty: { type: Number, default: 0, min: 0 },
    ratePerUnit: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    supplier: { type: String, trim: true },
    lastPurchaseDate: { type: Date },
    purchaseHistory: { type: [PurchaseEntrySchema], default: [] },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (!ret.hsnCodes || ret.hsnCodes.length === 0) {
          ret.hsnCodes = ret.hsnCode ? [ret.hsnCode] : [];
        }
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        if (!ret.hsnCodes || ret.hsnCodes.length === 0) {
          ret.hsnCodes = ret.hsnCode ? [ret.hsnCode] : [];
        }
        return ret;
      }
    },
  }
);

RawMaterialSchema.virtual("closingStock").get(function (
  this: IRawMaterialDocument
) {
  return this.openingStock + this.purchasedQty - this.usedQty;
});

RawMaterialSchema.virtual("totalValue").get(function (
  this: IRawMaterialDocument
) {
  return (this.openingStock + this.purchasedQty - this.usedQty) * this.ratePerUnit;
});

RawMaterialSchema.index({ itemName: 1 });
RawMaterialSchema.index({ category: 1 });

if (process.env.NODE_ENV === "development" && mongoose.models.RawMaterial) {
  delete mongoose.models.RawMaterial;
}

export const RawMaterial: Model<IRawMaterialDocument> =
  mongoose.models.RawMaterial ??
  mongoose.model<IRawMaterialDocument>("RawMaterial", RawMaterialSchema);
