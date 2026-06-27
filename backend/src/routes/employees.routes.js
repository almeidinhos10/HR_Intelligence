import { Router } from "express";
import { Employee } from "../models/Employee.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole(["gestor", "administrador"]), async (_req, res) => {
  const employees = await Employee.find().sort({ createdAt: -1 });
  res.json(employees);
});

router.get("/:id", requireAuth, requireRole(["gestor", "administrador"]), async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({ message: "Employee not found." });
  }
  return res.json(employee);
});

router.post("/", requireAuth, requireRole(["gestor", "administrador"]), async (req, res) => {
  const created = await Employee.create(req.body);
  res.status(201).json(created);
});

router.patch("/:id", requireAuth, requireRole(["gestor", "administrador"]), async (req, res) => {
  const updated = await Employee.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!updated) {
    return res.status(404).json({ message: "Employee not found." });
  }
  return res.json(updated);
});

router.delete("/:id", requireAuth, requireRole(["administrador"]), async (req, res) => {
  const deleted = await Employee.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Employee not found." });
  }
  return res.status(204).send();
});

export default router;
