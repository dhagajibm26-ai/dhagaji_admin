import type { Document, Model } from "mongoose";

export const ACTIVE_FILTER = { isDeleted: { $ne: true } } as const;

export async function softDeleteById<T extends Document>(model: Model<T>, id: string) {
  return model.findOneAndUpdate(
    { _id: id, ...ACTIVE_FILTER },
    { $set: { isDeleted: true } },
    { new: true }
  );
}
