import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHsnCodeDocument extends Document {
  code: string;
  gstPercentage: number;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HsnCodeSchema = new Schema<IHsnCodeDocument>(
  {
    code: { type: String, required: true, trim: true },
    gstPercentage: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

HsnCodeSchema.index({ code: 1 }, { unique: true });

if (process.env.NODE_ENV === "development" && mongoose.models.HsnCode) {
  delete mongoose.models.HsnCode;
}

export const HsnCode: Model<IHsnCodeDocument> =
  mongoose.models.HsnCode ??
  mongoose.model<IHsnCodeDocument>("HsnCode", HsnCodeSchema);
