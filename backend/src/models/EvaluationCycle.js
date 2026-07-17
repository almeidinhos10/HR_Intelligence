import mongoose from "mongoose";

const metricSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const evaluationCycleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "draft"
    },
    metrics: [metricSchema],
    department: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const EvaluationCycle = mongoose.model("EvaluationCycle", evaluationCycleSchema);
