import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRawMaterialUnitDocument extends Document {
  name: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RawMaterialUnitSchema = new Schema<IRawMaterialUnitDocument>(
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

RawMaterialUnitSchema.index({ name: 1 }, { unique: true });

export const RawMaterialUnit: Model<IRawMaterialUnitDocument> =
  mongoose.models.RawMaterialUnit ??
  mongoose.model<IRawMaterialUnitDocument>("RawMaterialUnit", RawMaterialUnitSchema);
