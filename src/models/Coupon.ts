import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICouponDocument extends Document {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  assignedType: "general" | "customer";
  customerIds: Types.ObjectId[];
  isActive: boolean;
  isDeleted?: boolean;
  neverExpires: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICouponDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["percentage", "fixed"], default: "percentage", required: true },
    discountValue: { type: Number, required: true, min: 0 },
    assignedType: { type: String, enum: ["general", "customer"], default: "general", required: true },
    customerIds: { type: [{ type: Schema.Types.ObjectId, ref: "Customer" }], default: [] },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    neverExpires: { type: Boolean, default: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ isDeleted: 1 });

export const Coupon: Model<ICouponDocument> =
  mongoose.models.Coupon ??
  mongoose.model<ICouponDocument>("Coupon", CouponSchema);
