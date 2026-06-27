import cors from "cors";
import express from "express";
import healthRoutes from "./routes/health.routes.js";
import employeesRoutes from "./routes/employees.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeesRoutes);

app.use((err, _req, res, _next) => {
  const status = err.name === "ValidationError" ? 400 : 500;
  res.status(status).json({ message: err.message || "Unexpected error." });
});

export default app;
