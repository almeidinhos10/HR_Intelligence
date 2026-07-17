import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    metricKey: { type: String, required: true },
    metricLabel: { type: String, trim: true, default: "" },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    cycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EvaluationCycle",
      required: true
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },
    employeeName: { type: String, trim: true, default: "" },
    evaluatorName: { type: String, trim: true, default: "" },
    scores: [scoreSchema],
    overallComment: { type: String, trim: true, default: "" },
    finalScore: { type: Number, default: null }
  },
  { timestamps: true }
);

export const Evaluation = mongoose.model("Evaluation", evaluationSchema);
