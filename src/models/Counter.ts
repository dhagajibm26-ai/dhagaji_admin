import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ICounterDocument extends Document<string> {
  seq: number;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const CounterSchema = new Schema<ICounterDocument>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

// ─── Model ────────────────────────────────────────────────────────────────────

export const Counter: Model<ICounterDocument> =
  mongoose.models.Counter ??
  mongoose.model<ICounterDocument>("Counter", CounterSchema);
