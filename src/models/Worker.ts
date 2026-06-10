import mongoose, { Schema, Document, Model } from "mongoose";

interface IBankDetails {
  accountNo?: string;
  ifsc?: string;
  bankName?: string;
}

export interface IWorkerDocument extends Document {
  name: string;
  nameGu?: string;
  fatherOrHusbandName?: string;
  fatherOrHusbandNameGu?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  bloodGroup?: string;
  mobile?: string;
  emergencyContact?: string;
  phone?: string;
  address?: string;
  addressGu?: string;
  aadhaarNumber?: string;
  designation?: string;
  joiningDate?: Date;
  photoDataUrl?: string;
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
    nameGu: { type: String, trim: true },
    fatherOrHusbandName: { type: String, trim: true },
    fatherOrHusbandNameGu: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    bloodGroup: { type: String, trim: true },
    mobile: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    addressGu: { type: String, trim: true },
    aadhaarNumber: { type: String, trim: true },
    designation: { type: String, trim: true },
    joiningDate: { type: Date },
    photoDataUrl: { type: String },
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
