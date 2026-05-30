import mongoose, { Schema, Document, Model } from "mongoose";

export interface IThreadsStockDocument extends Document {
  threadCode: string;
  threadColour: string;
  threadCompanyName: string;
  weightPerUnit: number;   // grams per unit
  stockAdd: number;        // new stock added (grams)
  openingStock: number;    // prev closing + new stockAdd
  netUsed: number;         // total consumed (grams)
  costPerUnit: number;     // cost per gram
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
    threadCompanyName: { type: String, required: true, trim: true },
    weightPerUnit: { type: Number, required: true, min: 0 },
    stockAdd: { type: Number, default: 0, min: 0 },
    openingStock: { type: Number, default: 0, min: 0 },
    netUsed: { type: Number, default: 0, min: 0 },
    costPerUnit: { type: Number, required: true, min: 0 },
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

ThreadsStockSchema.index({ threadCode: 1 }, { unique: true });
ThreadsStockSchema.index({ threadColour: 1 });

export const ThreadsStock: Model<IThreadsStockDocument> =
  mongoose.models.ThreadsStock ??
  mongoose.model<IThreadsStockDocument>("ThreadsStock", ThreadsStockSchema);
