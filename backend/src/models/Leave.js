import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName: { type: String, required: true, trim: true },
    employeeRole: { type: String, enum: ["colaborador", "gestor"], required: true },
    manager: { type: String, trim: true, default: "" },
    type: {
      type: String,
      enum: ["vacation", "sick", "other"],
      required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    workingDays: { type: Number, required: true },
    reason: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    reviewedBy: { type: String, trim: true, default: "" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

export const Leave = mongoose.model("Leave", leaveSchema);
