import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomerDocument extends Document {
  name: string;
  mobileNumbers: string[];
  address?: string;
  email?: string;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomerDocument>(
  {
    name: { type: String, required: true, trim: true },
    mobileNumbers: { type: [String], required: true, default: [] },
    address: { type: String, trim: true },
    email: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CustomerSchema.index({ name: 1 });
CustomerSchema.index({ isDeleted: 1 });

export const Customer: Model<ICustomerDocument> =
  mongoose.models.Customer ??
  mongoose.model<ICustomerDocument>("Customer", CustomerSchema);
