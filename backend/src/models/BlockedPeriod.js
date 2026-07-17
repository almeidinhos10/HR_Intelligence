import mongoose from "mongoose";

const blockedPeriodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdBy: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

export const BlockedPeriod = mongoose.model("BlockedPeriod", blockedPeriodSchema);
