import { Router } from "express";
import crypto from "crypto";
import { User } from "../models/User.js";
import { Employee } from "../models/Employee.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendSetupEmail } from "../services/email.js";

const router = Router();
const adminOnly = requireRole(["administrador"]);

// GET /users — lista todos os utilizadores (admin)
router.get("/", requireAuth, adminOnly, async (_req, res) => {
  const users = await User.find()
    .select("-passwordHash -setupToken")
    .sort({ createdAt: -1 });
  res.json(users);
});

// POST /users — cria utilizador + colaborador + envia email de setup (admin)
router.post("/", requireAuth, adminOnly, async (req, res) => {
  const { name, email, role, department, jobTitle } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ message: "name, email e role são obrigatórios." });
  }

  const validRoles = ["colaborador", "gestor", "administrador"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Role inválido." });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ message: "Este email já está registado." });
  }

  const setupToken = crypto.randomBytes(32).toString("hex");
  const setupTokenExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: "",
    role,
    setupToken,
    setupTokenExpiry,
    passwordSet: false
  });

  // Cria registo de colaborador se ainda não existir
  const existingEmployee = await Employee.findOne({ email: email.toLowerCase().trim() });
  if (!existingEmployee) {
    await Employee.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      department: department?.trim() || "Geral",
      jobTitle: jobTitle?.trim() || ""
    });
  }

  try {
    await sendSetupEmail({ to: user.email, name: user.name, token: setupToken });
  } catch (emailErr) {
    console.error("Erro ao enviar email de setup:", emailErr.message);
  }

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    passwordSet: user.passwordSet,
    createdAt: user.createdAt
  });
});

// PATCH /users/:id/role — altera o papel de um utilizador (admin)
router.patch("/:id/role", requireAuth, adminOnly, async (req, res) => {
  const { role } = req.body;
  const validRoles = ["colaborador", "gestor", "administrador"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Role inválido." });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select("-passwordHash -setupToken");

  if (!user) return res.status(404).json({ message: "Utilizador não encontrado." });
  res.json(user);
});

// DELETE /users/:id — remove utilizador (admin)
router.delete("/:id", requireAuth, adminOnly, async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "Utilizador não encontrado." });
  res.status(204).end();
});

export default router;
