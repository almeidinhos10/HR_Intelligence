import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: "" },
    jobTitle: { type: String, trim: true, default: "" },
    department: { type: String, required: true, trim: true },
    team: { type: String, trim: true, default: "" },
    manager: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "active", "inactive"],
      default: "pending"
    },
    contract: {
      type: {
        type: String,
        enum: ["permanent", "fixed-term", "internship", "contractor", ""],
        default: ""
      },
      startDate: { type: Date },
      endDate: { type: Date },
      salaryBand: { type: String, trim: true, default: "" }
    },
    professionalHistory: [
      {
        role: { type: String, trim: true },
        company: { type: String, trim: true },
        startDate: { type: String, trim: true },
        endDate: { type: String, trim: true },
        notes: { type: String, trim: true }
      }
    ],
    skills: [
      {
        name: { type: String, trim: true },
        level: {
          type: String,
          enum: ["beginner", "intermediate", "advanced", "expert", ""],
          default: ""
        }
      }
    ],
    certifications: [
      {
        name: { type: String, trim: true },
        issuer: { type: String, trim: true },
        issuedAt: { type: String, trim: true },
        expiresAt: { type: String, trim: true }
      }
    ]
  },
  { timestamps: true }
);

export const Employee = mongoose.model("Employee", employeeSchema);
