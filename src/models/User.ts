import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: "owner" | "staff";
  isActive: boolean;
  /** Failed login attempt counter. Resets to 0 on successful login. */
  loginAttempts: number;
  /** When set and in the future, the account is locked. */
  lockUntil?: Date | null;
  /** Timestamp of the last successful login. */
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["owner", "staff"], default: "staff" },
    isActive: { type: Boolean, default: true },
    // ── Brute-force protection ───────────────────────────────────────────────
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
    lastLogin: { type: Date, select: false },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

export const User: Model<IUserDocument> =
  mongoose.models.User ?? mongoose.model<IUserDocument>("User", UserSchema);
