import mongoose, { Document, Model, Schema } from "mongoose";
//test
export interface IBangleSizeDocument extends Document {
  name: string;
  normalizedName: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BangleSizeSchema = new Schema<IBangleSizeDocument>(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

BangleSizeSchema.index({ normalizedName: 1 }, { unique: true });

export const BangleSize: Model<IBangleSizeDocument> =
  mongoose.models.BangleSize ??
  mongoose.model<IBangleSizeDocument>("BangleSize", BangleSizeSchema);
