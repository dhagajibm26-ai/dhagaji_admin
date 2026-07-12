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

export interface IThreadsStockDocument extends Document {
  threadCode: string;
  threadColour: string;
  threadColourHex?: string;
  threadCompanyName: string;
  weightPerUnit: number;   // grams per unit
  stockAdd: number;        // new stock added (grams)
  openingStock: number;    // prev closing + new stockAdd
  netUsed: number;         // total consumed (grams)
  costPerUnit: number;     // cost per gram
  purchaseHistory?: Array<{
    quantity: number;
    totalAmount: number;
    ratePerUnit: number;
    purchasedAt: Date;
  }>;
  isDeleted?: boolean;
  // virtuals
  closingStock: number;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const ThreadsStockSchema = new Schema<IThreadsStockDocument>(
  {
    threadCode: { type: String, required: true, trim: true },
    threadColour: { type: String, required: true, trim: true },
    threadColourHex: { type: String, default: "#000000", trim: true },
    threadCompanyName: { type: String, required: true, trim: true },
    weightPerUnit: { type: Number, default: 0, min: 0 },
    stockAdd: { type: Number, default: 0, min: 0 },
    openingStock: { type: Number, default: 0, min: 0 },
    netUsed: { type: Number, default: 0, min: 0 },
    costPerUnit: { type: Number, required: true, min: 0 },
    purchaseHistory: { type: [PurchaseEntrySchema], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ThreadsStockSchema.virtual("closingStock").get(function (
  this: IThreadsStockDocument
) {
  return this.openingStock + this.stockAdd - this.netUsed;
});

ThreadsStockSchema.virtual("totalValue").get(function (
  this: IThreadsStockDocument
) {
  return (this.openingStock + this.stockAdd - this.netUsed) * this.costPerUnit;
});

// Non-unique index for fast lookups by code and colour
ThreadsStockSchema.index({ threadCode: 1 });
ThreadsStockSchema.index({ threadColour: 1 });

if (process.env.NODE_ENV === "development" && mongoose.models.ThreadsStock) {
  delete mongoose.models.ThreadsStock;
}

export const ThreadsStock: Model<IThreadsStockDocument> =
  mongoose.models.ThreadsStock ??
  mongoose.model<IThreadsStockDocument>("ThreadsStock", ThreadsStockSchema);
