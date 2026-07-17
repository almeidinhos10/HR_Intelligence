import { Router } from "express";
import { Employee } from "../models/Employee.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const router = Router();

router.get("/", requireAuth, requireRole(["gestor", "administrador"]), async (req, res) => {
  const gestoresOnly = req.query.gestoresOnly === "true";
  const includeGestores = req.query.includeGestores === "true";

  if (gestoresOnly) {
    const gestores = await User.find({ role: "gestor" }).select("email");
    const gestorEmails = gestores.map(u => u.email.toLowerCase());
    const employees = await Employee.find({ email: { $in: gestorEmails } }).sort({ createdAt: -1 });
    return res.json(employees);
  }

  const rolesToExclude = includeGestores ? ["administrador"] : ["administrador", "gestor"];
  const excluded = await User.find({ role: { $in: rolesToExclude } }).select("email");
  const excludedEmails = excluded.map(u => u.email.toLowerCase());
  const employees = await Employee.find({ email: { $nin: excludedEmails } }).sort({ createdAt: -1 });
  res.json(employees);
});

router.get("/me", requireAuth, async (req, res) => {
  const employee = await Employee.findOne({ email: req.user.email });
  if (!employee) return res.status(404).json({ message: "Perfil não encontrado." });
  return res.json(employee);
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

router.patch("/:id/approve", requireAuth, requireRole(["gestor", "administrador"]), async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ message: "Colaborador não encontrado." });

  if (req.user.role === "gestor") {
    const nameRegex = new RegExp(`^${escapeRegex(req.user.name)}$`, "i");
    if (!nameRegex.test(employee.manager || "")) {
      return res.status(403).json({ message: "Não pode aprovar colaboradores fora da sua equipa." });
    }
  }

  employee.status = "active";
  await employee.save();
  return res.json(employee);
});

router.delete("/:id", requireAuth, requireRole(["administrador"]), async (req, res) => {
  const deleted = await Employee.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Employee not found." });
  }
  return res.status(204).send();
});

export default router;
