import mongoose from "mongoose";

export async function connectToDatabase(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
}

