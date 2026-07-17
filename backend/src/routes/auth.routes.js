import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const router = Router();

function createToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing in environment.");
  }

  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email, name: user.name },
    secret,
    { expiresIn: "7d" }
  );
}

// Registo público desativado — contas são criadas pelo admin via POST /users
router.post("/register", (_req, res) => {
  res.status(403).json({ message: "O registo público está desativado. Contacte o administrador." });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "email e password são obrigatórios." });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  if (!user.passwordHash) {
    return res.status(403).json({ message: "Conta ainda não ativada. Verifique o seu email para definir a password." });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  const token = createToken(user);
  return res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

// Definir password via token de setup
router.post("/setup-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "token e password são obrigatórios." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "A password deve ter pelo menos 6 caracteres." });
  }

  const user = await User.findOne({
    setupToken: token,
    setupTokenExpiry: { $gt: new Date() }
  });

  if (!user) {
    return res.status(400).json({ message: "Link inválido ou expirado. Peça ao administrador que reenvie o convite." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  user.passwordHash = passwordHash;
  user.passwordSet = true;
  user.setupToken = null;
  user.setupTokenExpiry = null;
  await user.save();

  const jwtToken = createToken(user);
  return res.json({
    token: jwtToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

export default router;
