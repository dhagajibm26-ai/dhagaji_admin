import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Sub-document interfaces ──────────────────────────────────────────────────

/** DENA — materials sent out to worker */
interface IBanglesGiven {
  banglesStockId: Types.ObjectId;
  cutType: "C1" | "C2" | "C4" | "C6";
  cuts: number;
  pieces: number;
}

interface IOtherMaterialGiven {
  name: string;
  qty: number;
}

/** LENA — materials returned by worker */
interface IBanglesReturned {
  cutType: "C1" | "C2" | "C4" | "C6";
  cuts: number;
  pieces: number;
}

interface IOtherReturned {
  name: string;
  qty: number;
}

export type WorkOrderStatus = "Open" | "Returned" | "Completed";
export type PaymentStatus = "Paid" | "Partial" | "Unpaid";

// ─── Main document interface ──────────────────────────────────────────────────

export interface IWorkOrderDocument extends Document {
  workerId: Types.ObjectId;
  date: Date;
  workType: string;

  // DENA (out to worker)
  banglesGiven: IBanglesGiven[];
  threadsGiven: number;              // grams
  glueGiven: number;                 // units
  otherMaterialGiven: IOtherMaterialGiven[];

  // LENA (returned by worker)
  banglesReturned: IBanglesReturned[];
  threadsReturned: number;
  glueReturned: number;
  otherReturned: IOtherReturned[];

  // OUTPUT
  finishedPieces: number;
  qualityOK: number;

  // PAYMENT
  perPieceRate: number;
  amountPaid: number;

  status: WorkOrderStatus;

  // virtuals — NET USED
  netBangles: number;
  netThreads: number;
  netGlue: number;
  // virtuals — OUTPUT
  rejected: number;
  // virtuals — PAYMENT
  amountDue: number;          // gross OK earnings
  rejectionDeduction: number; // 50% penalty on rejected pieces
  netAmountDue: number;       // amountDue - rejectionDeduction
  balance: number;
  paymentStatus: PaymentStatus;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const BanglesGivenSchema = new Schema<IBanglesGiven>(
  {
    banglesStockId: {
      type: Schema.Types.ObjectId,
      ref: "BanglesStock",
      required: true,
    },
    cutType: { type: String, enum: ["C1", "C2", "C4", "C6"], required: true },
    cuts: { type: Number, required: true, min: 0 },
    pieces: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OtherMaterialGivenSchema = new Schema<IOtherMaterialGiven>(
  {
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const BanglesReturnedSchema = new Schema<IBanglesReturned>(
  {
    cutType: { type: String, enum: ["C1", "C2", "C4", "C6"], required: true },
    cuts: { type: Number, required: true, min: 0 },
    pieces: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OtherReturnedSchema = new Schema<IOtherReturned>(
  {
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const WorkOrderSchema = new Schema<IWorkOrderDocument>(
  {
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    workType: { type: String, required: true, trim: true },

    // DENA
    banglesGiven: { type: [BanglesGivenSchema], default: [] },
    threadsGiven: { type: Number, default: 0, min: 0 },
    glueGiven: { type: Number, default: 0, min: 0 },
    otherMaterialGiven: { type: [OtherMaterialGivenSchema], default: [] },

    // LENA
    banglesReturned: { type: [BanglesReturnedSchema], default: [] },
    threadsReturned: { type: Number, default: 0, min: 0 },
    glueReturned: { type: Number, default: 0, min: 0 },
    otherReturned: { type: [OtherReturnedSchema], default: [] },

    // OUTPUT
    finishedPieces: { type: Number, default: 0, min: 0 },
    qualityOK: { type: Number, default: 0, min: 0 },

    // PAYMENT
    perPieceRate: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["Open", "Returned", "Completed"],
      default: "Open",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals — NET USED ──────────────────────────────────────────────────────

WorkOrderSchema.virtual("netBangles").get(function (this: IWorkOrderDocument) {
  const given = this.banglesGiven.reduce((s, b) => s + b.pieces, 0);
  const returned = this.banglesReturned.reduce((s, b) => s + b.pieces, 0);
  return given - returned;
});

WorkOrderSchema.virtual("netThreads").get(function (this: IWorkOrderDocument) {
  return this.threadsGiven - this.threadsReturned;
});

WorkOrderSchema.virtual("netGlue").get(function (this: IWorkOrderDocument) {
  return this.glueGiven - this.glueReturned;
});

// ─── Virtuals — OUTPUT ────────────────────────────────────────────────────────

WorkOrderSchema.virtual("rejected").get(function (this: IWorkOrderDocument) {
  return Math.max(0, this.finishedPieces - this.qualityOK);
});

// ─── Virtuals — PAYMENT ───────────────────────────────────────────────────────

/** Gross earnings for OK pieces */
WorkOrderSchema.virtual("amountDue").get(function (this: IWorkOrderDocument) {
  return this.qualityOK * this.perPieceRate;
});

/** 50% deduction on rejected pieces */
WorkOrderSchema.virtual("rejectionDeduction").get(function (this: IWorkOrderDocument) {
  const rejected = Math.max(0, this.finishedPieces - this.qualityOK);
  return rejected * this.perPieceRate * 0.5;
});

/** Net payable = OK earnings − rejection deduction */
WorkOrderSchema.virtual("netAmountDue").get(function (this: IWorkOrderDocument) {
  const gross = this.qualityOK * this.perPieceRate;
  const deduction = Math.max(0, this.finishedPieces - this.qualityOK) * this.perPieceRate * 0.5;
  return Math.max(0, gross - deduction);
});

WorkOrderSchema.virtual("balance").get(function (this: IWorkOrderDocument) {
  const gross = this.qualityOK * this.perPieceRate;
  const deduction = Math.max(0, this.finishedPieces - this.qualityOK) * this.perPieceRate * 0.5;
  const net = Math.max(0, gross - deduction);
  return net - this.amountPaid;
});

WorkOrderSchema.virtual("paymentStatus").get(function (
  this: IWorkOrderDocument
): PaymentStatus {
  const gross = this.qualityOK * this.perPieceRate;
  const deduction = Math.max(0, this.finishedPieces - this.qualityOK) * this.perPieceRate * 0.5;
  const due = Math.max(0, gross - deduction);
  if (this.amountPaid <= 0) return "Unpaid";
  if (this.amountPaid >= due) return "Paid";
  return "Partial";
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

WorkOrderSchema.index({ workerId: 1 });
WorkOrderSchema.index({ date: -1 });
WorkOrderSchema.index({ status: 1 });

export const WorkOrder: Model<IWorkOrderDocument> =
  mongoose.models.WorkOrder ??
  mongoose.model<IWorkOrderDocument>("WorkOrder", WorkOrderSchema);
