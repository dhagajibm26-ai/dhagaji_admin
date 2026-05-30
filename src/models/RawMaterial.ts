import mongoose, { Schema, Document, Model } from "mongoose";

export type RawMaterialCategory =
  | "Beads & Stones"
  | "Wire & Hook"
  | "Glue & Cutter"
  | "Tool"
  | "Work Box"
  | "Packaging"
  | "Thread"
  | "Bangle";

export type RawMaterialUnit = "gram" | "pcs" | "tube" | "box" | "meter";

export interface IRawMaterialDocument extends Document {
  itemName: string;
  category: RawMaterialCategory;
  colorType?: string;
  unit: RawMaterialUnit;
  openingStock: number;
  purchasedQty: number;
  usedQty: number;
  ratePerUnit: number;
  lowStockThreshold: number;
  supplier?: string;
  lastPurchaseDate?: Date;
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
      enum: [
        "Beads & Stones",
        "Wire & Hook",
        "Glue & Cutter",
        "Tool",
        "Work Box",
        "Packaging",
        "Thread",
        "Bangle",
      ],
      required: true,
    },
    colorType: { type: String, trim: true },
    unit: {
      type: String,
      enum: ["gram", "pcs", "tube", "box", "meter"],
      required: true,
    },
    openingStock: { type: Number, required: true, default: 0, min: 0 },
    purchasedQty: { type: Number, default: 0, min: 0 },
    usedQty: { type: Number, default: 0, min: 0 },
    ratePerUnit: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    supplier: { type: String, trim: true },
    lastPurchaseDate: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
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

export const RawMaterial: Model<IRawMaterialDocument> =
  mongoose.models.RawMaterial ??
  mongoose.model<IRawMaterialDocument>("RawMaterial", RawMaterialSchema);
