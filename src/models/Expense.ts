import mongoose, { Schema, Document, Model } from "mongoose";

export type ExpenseCategory =
  | "Rent"
  | "Electricity"
  | "Transport"
  | "Marketing"
  | "Other";

export interface IExpenseDocument extends Document {
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: Date;
  paidBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpenseDocument>(
  {
    category: {
      type: String,
      enum: ["Rent", "Electricity", "Transport", "Marketing", "Other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    date: { type: Date, required: true, default: Date.now },
    paidBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ category: 1 });

export const Expense: Model<IExpenseDocument> =
  mongoose.models.Expense ??
  mongoose.model<IExpenseDocument>("Expense", ExpenseSchema);
