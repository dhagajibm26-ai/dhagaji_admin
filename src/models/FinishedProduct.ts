import mongoose, { Schema, Document, Model } from "mongoose";

function generateBarcodeId(): string {
  return (
    "DC" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 5).toUpperCase()
  );
}

export interface IFinishedProductDocument extends Document {
  designName: string;
  designCode: string;
  /** What kind of finished item this is — e.g. Bangle, Thread Work, Mix Set */
  category: string;
  size: string;
  makingCostPerPc: number;
  otherCostPerPc: number;
  /**
   * MRP — default totalCost * 4, overridable via mrpMarginOverride.
   * Store final MRP directly; UI can auto-suggest from totalCost * 4.
   */
  MRP: number;
  wholesalePrice: number;   // default: totalCost * 2.5
  sellingPrice: number;     // default: totalCost * 3
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

const FinishedProductSchema = new Schema<IFinishedProductDocument>(
  {
    designName: { type: String, required: true, trim: true },
    designCode: { type: String, required: true, trim: true },
    category: { type: String, default: "Bangle", trim: true },
    size: { type: String, required: true, trim: true },
    makingCostPerPc: { type: Number, required: true, min: 0 },
    otherCostPerPc: { type: Number, default: 0, min: 0 },
    MRP: { type: Number, required: true, min: 0 },
    wholesalePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    mrpMarginOverride: { type: Boolean, default: false },
    readyStock: { type: Number, default: 0, min: 0 },
    totalSold: { type: Number, default: 0, min: 0 },
    barcodeId: {
      type: String,
      unique: true,
      default: generateBarcodeId,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** making + other cost per piece */
FinishedProductSchema.virtual("totalCost").get(function (
  this: IFinishedProductDocument
) {
  return this.makingCostPerPc + this.otherCostPerPc;
});

/** totalSold × sellingPrice */
FinishedProductSchema.virtual("totalRevenue").get(function (
  this: IFinishedProductDocument
) {
  return this.totalSold * this.sellingPrice;
});

/** sellingPrice − (making + other) */
FinishedProductSchema.virtual("profitPerPc").get(function (
  this: IFinishedProductDocument
) {
  return this.sellingPrice - (this.makingCostPerPc + this.otherCostPerPc);
});

FinishedProductSchema.index({ barcodeId: 1 }, { unique: true });
FinishedProductSchema.index({ designCode: 1 });
FinishedProductSchema.index({ designName: 1 });
FinishedProductSchema.index({ category: 1 });

export const FinishedProduct: Model<IFinishedProductDocument> =
  mongoose.models.FinishedProduct ??
  mongoose.model<IFinishedProductDocument>(
    "FinishedProduct",
    FinishedProductSchema
  );
