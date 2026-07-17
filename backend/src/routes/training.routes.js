import { Router } from "express";
import { Training } from "../models/Training.js";
import { Employee } from "../models/Employee.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /trainings — filtrado por papel
router.get("/", requireAuth, async (req, res) => {
  const { role, name, email } = req.user;

  if (role === "administrador") {
    const trainings = await Training.find().sort({ date: -1, createdAt: -1 });
    return res.json(trainings);
  }

  if (role === "gestor") {
    const nameRegex = new RegExp(`^${escapeRegex(name)}$`, "i");
    const teamEmployees = await Employee.find({ manager: nameRegex });
    const teamIds = teamEmployees.map((e) => e._id.toString());
    const trainings = await Training.find({
      "employees.employeeId": { $in: teamIds }
    }).sort({ date: -1, createdAt: -1 });
    return res.json(trainings);
  }

  // colaborador — vê só as suas formações
  const employee = await Employee.findOne({ email });
  if (!employee) return res.json([]);
  const trainings = await Training.find({
    "employees.employeeId": employee._id
  }).sort({ date: -1, createdAt: -1 });
  return res.json(trainings);
});

// POST /trainings — admin e gestor
router.post("/", requireAuth, requireRole(["gestor", "administrador"]), async (req, res) => {
  const training = await Training.create({
    ...req.body,
    createdBy: req.user.id
  });
  res.status(201).json(training);
});

// PATCH /trainings/:id — admin e gestor
router.patch("/:id", requireAuth, requireRole(["gestor", "administrador"]), async (req, res) => {
  const training = await Training.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!training) return res.status(404).json({ message: "Formação não encontrada." });
  res.json(training);
});

// DELETE /trainings/:id — admin apenas
router.delete("/:id", requireAuth, requireRole(["administrador"]), async (req, res) => {
  const training = await Training.findByIdAndDelete(req.params.id);
  if (!training) return res.status(404).json({ message: "Formação não encontrada." });
  res.status(204).end();
});

export default router;
