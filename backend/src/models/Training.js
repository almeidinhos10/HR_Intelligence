import mongoose from "mongoose";

const trainingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    provider: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "" },
    type: {
      type: String,
      enum: ["completed", "planned"],
      required: true
    },
    date: { type: Date, default: null },
    duration: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    employees: [
      {
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        employeeName: { type: String, trim: true, default: "" }
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Training = mongoose.model("Training", trainingSchema);
