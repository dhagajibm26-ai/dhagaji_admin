import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRawMaterialCategoryDocument extends Document {
  name: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RawMaterialCategorySchema = new Schema<IRawMaterialCategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

RawMaterialCategorySchema.index({ name: 1 }, { unique: true });

export const RawMaterialCategory: Model<IRawMaterialCategoryDocument> =
  mongoose.models.RawMaterialCategory ??
  mongoose.model<IRawMaterialCategoryDocument>("RawMaterialCategory", RawMaterialCategorySchema);
