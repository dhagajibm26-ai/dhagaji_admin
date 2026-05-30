import mongoose, { Schema, Document, Model } from "mongoose";

interface IBankDetails {
  accountNo?: string;
  ifsc?: string;
  bankName?: string;
}

export interface IWorkerDocument extends Document {
  name: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  bankDetails?: IBankDetails;
  totalEarned: number;  // lifetime wages due
  totalPaid: number;    // lifetime amount paid
  // virtual
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const BankDetailsSchema = new Schema<IBankDetails>(
  {
    accountNo: { type: String, trim: true },
    ifsc: { type: String, trim: true, uppercase: true },
    bankName: { type: String, trim: true },
  },
  { _id: false }
);

const WorkerSchema = new Schema<IWorkerDocument>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    bankDetails: { type: BankDetailsSchema },
    totalEarned: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** Outstanding balance = totalEarned - totalPaid */
WorkerSchema.virtual("balance").get(function (this: IWorkerDocument) {
  return this.totalEarned - this.totalPaid;
});

WorkerSchema.index({ name: 1 });
WorkerSchema.index({ isActive: 1 });

export const Worker: Model<IWorkerDocument> =
  mongoose.models.Worker ??
  mongoose.model<IWorkerDocument>("Worker", WorkerSchema);
