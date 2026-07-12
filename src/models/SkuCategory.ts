import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISkuCategoryDocument extends Document {
  name: string;
  parentId?: mongoose.Types.ObjectId | null;
  isSizeFieldEnabled: boolean;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SkuCategorySchema = new Schema<ISkuCategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: "SkuCategory", default: null },
    isSizeFieldEnabled: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate names under the same parent
SkuCategorySchema.index({ name: 1, parentId: 1 }, { unique: true });

if (process.env.NODE_ENV === "development" && mongoose.models.SkuCategory) {
  delete mongoose.models.SkuCategory;
}

export const SkuCategory: Model<ISkuCategoryDocument> =
  mongoose.models.SkuCategory ??
  mongoose.model<ISkuCategoryDocument>("SkuCategory", SkuCategorySchema);
