import dotenv from "dotenv";
import app from "./app.js";
import { connectToDatabase } from "./config/db.js";
import { User } from "./models/User.js";

dotenv.config();

const port = Number(process.env.PORT || 5000);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is missing in environment.");
}

connectToDatabase(mongoUri)
  .then(async () => {
    // Marca como ativas as contas criadas antes do campo passwordSet existir
    const { modifiedCount } = await User.updateMany(
      { passwordHash: { $ne: "" }, passwordSet: false },
      { $set: { passwordSet: true } }
    );
    if (modifiedCount > 0) {
      console.log(`Migração: ${modifiedCount} conta(s) marcadas como ativas.`);
    }

    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });

