import { Router } from "express";
import { Leave } from "../models/Leave.js";
import { BlockedPeriod } from "../models/BlockedPeriod.js";
import { Employee } from "../models/Employee.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countWorkingDays(start, end) {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function datesOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) <= new Date(bEnd) && new Date(aEnd) >= new Date(bStart);
}

function calcAnnualBalance(contractStartDate, year) {
  const TOTAL_DAYS = 22;
  if (!contractStartDate) return TOTAL_DAYS;
  const start = new Date(contractStartDate);
  if (start.getFullYear() < year) return TOTAL_DAYS;
  if (start.getFullYear() > year) return 0;
  const monthsRemaining = 12 - start.getMonth();
  return Math.floor((monthsRemaining / 12) * TOTAL_DAYS);
}

// ── GET /leaves ──────────────────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  try {
    const { role, name, email } = req.user;

    if (role === "administrador") {
      const leaves = await Leave.find().sort({ createdAt: -1 });
      return res.json(leaves);
    }

    if (role === "gestor") {
      const teamEmployees = await Employee.find({
        manager: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") }
      }).select("_id");
      const teamIds = teamEmployees.map(e => e._id);

      const selfEmp = await Employee.findOne({ email: email.toLowerCase() }).select("_id");
      const allIds = selfEmp ? [...teamIds, selfEmp._id] : teamIds;

      const leaves = await Leave.find({ employee: { $in: allIds } }).sort({ createdAt: -1 });
      return res.json(leaves);
    }

    const emp = await Employee.findOne({ email: email.toLowerCase() }).select("_id");
    if (!emp) return res.json([]);
    const leaves = await Leave.find({ employee: emp._id }).sort({ createdAt: -1 });
    return res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /leaves ─────────────────────────────────────────────────────────────

router.post("/", requireAuth, async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const { email, role } = req.user;

    if (!["colaborador", "gestor"].includes(role)) {
      return res.status(403).json({ message: "Administradores não submetem pedidos de ausência." });
    }

    const emp = await Employee.findOne({ email: email.toLowerCase() });
    if (!emp) return res.status(404).json({ message: "Perfil de colaborador não encontrado." });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return res.status(400).json({ message: "A data de fim não pode ser anterior à data de início." });

    // Verificar períodos bloqueados
    const blocked = await BlockedPeriod.findOne({
      startDate: { $lte: end },
      endDate: { $gte: start }
    });
    if (blocked) {
      return res.status(409).json({
        message: `As datas selecionadas coincidem com o período bloqueado "${blocked.name}".`
      });
    }

    const workingDays = countWorkingDays(start, end);
    if (workingDays === 0) return res.status(400).json({ message: "O período selecionado não contém dias úteis." });

    const userRecord = await User.findOne({ email: email.toLowerCase() }).select("role");
    const employeeRole = userRecord?.role === "gestor" ? "gestor" : "colaborador";

    const leave = await Leave.create({
      employee: emp._id,
      employeeName: emp.name,
      employeeRole,
      manager: emp.manager || "",
      type,
      startDate: start,
      endDate: end,
      workingDays,
      reason: reason || ""
    });

    // Detetar conflitos (aviso, não bloqueio)
    let teamEmployees = [];
    if (employeeRole === "gestor") {
      // Gestor: verificar conflitos com os seus próprios colaboradores
      teamEmployees = await Employee.find({
        manager: { $regex: new RegExp(`^${escapeRegex(req.user.name)}$`, "i") }
      }).select("_id");
    } else if (emp.manager) {
      // Colaborador: verificar conflitos com colegas de equipa (mesmo gestor)
      teamEmployees = await Employee.find({
        manager: { $regex: new RegExp(`^${escapeRegex(emp.manager)}$`, "i") },
        _id: { $ne: emp._id }
      }).select("_id");
    }
    const teamIds = teamEmployees.map(e => e._id);

    let conflicts = [];
    if (teamIds.length > 0) {
      conflicts = await Leave.find({
        employee: { $in: teamIds },
        status: { $in: ["approved", "pending"] },
        startDate: { $lte: end },
        endDate: { $gte: start }
      }).select("employeeName startDate endDate status");
    }

    return res.status(201).json({ leave, conflicts });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PATCH /leaves/:id/review ─────────────────────────────────────────────────

router.patch("/:id/review", requireAuth, requireRole(["gestor", "administrador"]), async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const { role, name } = req.user;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Estado inválido." });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Pedido não encontrado." });

    if (role === "gestor" && leave.employeeRole !== "colaborador") {
      return res.status(403).json({ message: "O gestor só pode aprovar pedidos de colaboradores." });
    }
    if (role === "administrador" && leave.employeeRole !== "gestor") {
      return res.status(403).json({ message: "O administrador aprova apenas pedidos de gestores através deste endpoint." });
    }

    leave.status = status;
    leave.reviewedBy = name;
    leave.reviewedAt = new Date();
    if (status === "rejected") leave.rejectionReason = rejectionReason || "";
    await leave.save();

    return res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /leaves/:id ───────────────────────────────────────────────────────

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { role, email } = req.user;
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Pedido não encontrado." });

    const emp = await Employee.findOne({ email: email.toLowerCase() }).select("_id");
    const isOwner = emp && leave.employee.toString() === emp._id.toString();

    if (role === "administrador" || (isOwner && leave.status === "pending")) {
      await leave.deleteOne();
      return res.status(204).end();
    }
    return res.status(403).json({ message: "Não pode eliminar este pedido." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /leaves/balance ──────────────────────────────────────────────────────

router.get("/balance", requireAuth, async (req, res) => {
  try {
    const { email, role } = req.user;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    let emp;
    if (role === "administrador" && req.query.employeeId) {
      emp = await Employee.findById(req.query.employeeId);
    } else {
      emp = await Employee.findOne({ email: email.toLowerCase() });
    }
    if (!emp) return res.status(404).json({ message: "Colaborador não encontrado." });

    const totalDays = calcAnnualBalance(emp.contract?.startDate, year);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const approvedLeaves = await Leave.find({
      employee: emp._id,
      type: "vacation",
      status: "approved",
      startDate: { $lte: yearEnd },
      endDate: { $gte: yearStart }
    });

    const usedDays = approvedLeaves.reduce((sum, l) => sum + l.workingDays, 0);

    return res.json({
      year,
      totalDays,
      usedDays,
      remainingDays: Math.max(0, totalDays - usedDays),
      contractStart: emp.contract?.startDate || null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Blocked Periods ──────────────────────────────────────────────────────────

router.get("/blocked", requireAuth, async (_req, res) => {
  try {
    const periods = await BlockedPeriod.find().sort({ startDate: 1 });
    res.json(periods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/blocked", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    const period = await BlockedPeriod.create({
      name,
      startDate,
      endDate,
      createdBy: req.user.name
    });
    res.status(201).json(period);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/blocked/:id", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    await BlockedPeriod.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
