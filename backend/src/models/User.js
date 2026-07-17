import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, default: "" },
    role: {
      type: String,
      enum: ["colaborador", "gestor", "administrador"],
      default: "colaborador"
    },
    setupToken: { type: String, default: null },
    setupTokenExpiry: { type: Date, default: null },
    passwordSet: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);

