import { Router } from "express";
import { EvaluationCycle } from "../models/EvaluationCycle.js";
import { Evaluation } from "../models/Evaluation.js";
import { Employee } from "../models/Employee.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Cycles ────────────────────────────────────────────────────────────────

router.get("/cycles", requireAuth, async (req, res) => {
  try {
    const { role, email } = req.user;

    if (role === "administrador") {
      const cycles = await EvaluationCycle.find().sort({ createdAt: -1 });
      return res.json(cycles);
    }

    if (role === "gestor") {
      const emp = await Employee.findOne({ email: email.toLowerCase() }).select("department");
      const dept = emp?.department || "";
      const cycles = await EvaluationCycle.find({
        $or: [{ department: "" }, { department: dept }]
      }).sort({ createdAt: -1 });
      return res.json(cycles);
    }

    const cycles = await EvaluationCycle.find({ status: "active", department: "" }).sort({ createdAt: -1 });
    return res.json(cycles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/cycles", requireAuth, requireRole(["administrador", "gestor"]), async (req, res) => {
  try {
    const { name, startDate, endDate, metrics } = req.body;
    const { role, email, id } = req.user;

    let department = "";
    if (role === "gestor") {
      const emp = await Employee.findOne({ email: email.toLowerCase() }).select("department");
      department = emp?.department || "";
      if (!department) {
        return res.status(400).json({ message: "O seu perfil não tem departamento associado." });
      }
    }

    const cycle = await EvaluationCycle.create({
      name, startDate, endDate, metrics, department, createdBy: id
    });
    res.status(201).json(cycle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch("/cycles/:id", requireAuth, requireRole(["administrador", "gestor"]), async (req, res) => {
  try {
    const { role, email } = req.user;
    const cycle = await EvaluationCycle.findById(req.params.id);
    if (!cycle) return res.status(404).json({ message: "Ciclo não encontrado." });

    if (role === "gestor") {
      const emp = await Employee.findOne({ email: email.toLowerCase() }).select("department");
      if (!emp?.department || cycle.department !== emp.department) {
        return res.status(403).json({ message: "Só pode editar ciclos do seu departamento." });
      }
    }

    const updated = await EvaluationCycle.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/cycles/:id", requireAuth, requireRole(["administrador", "gestor"]), async (req, res) => {
  try {
    const { role, email } = req.user;
    const cycle = await EvaluationCycle.findById(req.params.id);
    if (!cycle) return res.status(404).json({ message: "Ciclo não encontrado." });

    if (role === "gestor") {
      const emp = await Employee.findOne({ email: email.toLowerCase() }).select("department");
      if (!emp?.department || cycle.department !== emp.department) {
        return res.status(403).json({ message: "Só pode eliminar ciclos do seu departamento." });
      }
    }

    await EvaluationCycle.findByIdAndDelete(req.params.id);
    await Evaluation.deleteMany({ cycle: req.params.id });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Evaluations ────────────────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  try {
    const { role, email, name } = req.user;

    if (role === "administrador") {
      const evals = await Evaluation.find()
        .populate("cycle", "name status")
        .sort({ createdAt: -1 });
      return res.json(evals);
    }

    if (role === "gestor") {
      const [teamEmployees, selfEmployee] = await Promise.all([
        Employee.find({
          manager: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") }
        }).select("_id"),
        Employee.findOne({ email: email.toLowerCase() }).select("_id")
      ]);
      const allIds = teamEmployees.map((e) => e._id);
      if (selfEmployee) allIds.push(selfEmployee._id);
      const evals = await Evaluation.find({ employee: { $in: allIds } })
        .populate("cycle", "name status")
        .sort({ createdAt: -1 });
      return res.json(evals);
    }

    const emp = await Employee.findOne({ email: email.toLowerCase() });
    if (!emp) return res.json([]);
    const evals = await Evaluation.find({ employee: emp._id })
      .populate("cycle", "name status")
      .sort({ createdAt: -1 });
    return res.json(evals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", requireAuth, requireRole(["gestor", "administrador"]), async (req, res) => {
  try {
    const { cycleId, employeeId, scores, overallComment } = req.body;

    const [cycle, employee] = await Promise.all([
      EvaluationCycle.findById(cycleId),
      Employee.findById(employeeId)
    ]);

    if (!cycle) return res.status(404).json({ message: "Ciclo não encontrado." });
    if (!employee) return res.status(404).json({ message: "Colaborador não encontrado." });

    if (req.user.role === "gestor") {
      const nameRegex = new RegExp(`^${escapeRegex(req.user.name)}$`, "i");
      if (!nameRegex.test(employee.manager || "")) {
        return res.status(403).json({ message: "Só pode avaliar colaboradores da sua equipa." });
      }
    }

    const existing = await Evaluation.findOne({ cycle: cycleId, employee: employeeId });
    if (existing) {
      return res.status(409).json({ message: "Este colaborador já foi avaliado neste ciclo." });
    }

    const finalScore =
      scores && scores.length > 0
        ? Math.round((scores.reduce((s, m) => s + m.score, 0) / scores.length) * 10) / 10
        : null;

    const evaluation = await Evaluation.create({
      cycle: cycleId,
      employee: employeeId,
      employeeName: employee.name,
      evaluatorName: req.user.name,
      scores,
      overallComment,
      finalScore
    });

    res.status(201).json(evaluation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", requireAuth, requireRole(["administrador"]), async (req, res) => {
  try {
    await Evaluation.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
