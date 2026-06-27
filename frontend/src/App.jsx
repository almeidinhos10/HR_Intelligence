import { useEffect, useState } from "react";
import { AppLayout } from "./components/AppLayout";
import { CollaboratorsPage } from "./pages/CollaboratorsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LeavesPage } from "./pages/LeavesPage";
import { LoginPage } from "./pages/LoginPage";
import { PerformancePage } from "./pages/PerformancePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SkillsTrainingPage } from "./pages/SkillsTrainingPage";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  login,
  register,
  updateEmployee
} from "./api";
import { canManageEmployees, getAvailableModules } from "./utils/permissions";

const emptyEmployeeForm = {
  name: "",
  email: "",
  phone: "",
  jobTitle: "",
  department: "",
  team: "",
  manager: "",
  contractType: "",
  contractStartDate: "",
  contractEndDate: "",
  salaryBand: "",
  professionalHistoryText: "",
  skillsText: "",
  certificationsText: ""
};
const emptyLoginForm = { email: "", password: "" };
const emptyRegisterForm = {
  name: "",
  email: "",
  password: "",
  role: "colaborador"
};

function getSessionFromStorage() {
  try {
    const saved = localStorage.getItem("hr_session");
    return saved ? JSON.parse(saved) : null;
  } catch (_err) {
    return null;
  }
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [activePage, setActivePage] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("hr_theme") || "light");
  const [session, setSession] = useState(getSessionFromStorage);
  const [employees, setEmployees] = useState([]);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("hr_theme", theme);
  }, [theme]);

  function saveSession(newSession) {
    setSession(newSession);
    localStorage.setItem("hr_session", JSON.stringify(newSession));
    setActivePage("dashboard");
  }

  function clearSession() {
    setSession(null);
    localStorage.removeItem("hr_session");
    setEmployees([]);
    setActivePage("dashboard");
  }

  function navigate(page) {
    if (!session) return;
    const modules = getAvailableModules(session.user.role);
    if (modules.some((module) => module.id === page)) {
      setActivePage(page);
      setError("");
    }
  }

  async function loadEmployees() {
    if (!session?.token || !canManageEmployees(session.user.role)) return;

    try {
      setLoadingEmployees(true);
      setError("");
      const data = await getEmployees(session.token);
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingEmployees(false);
    }
  }

  useEffect(() => {
    if (activePage === "collaborators") {
      loadEmployees();
    }
  }, [activePage, session?.token]);

  async function handleLogin(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      const data = await login(loginForm);
      saveSession(data);
      setLoginForm(emptyLoginForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      const data = await register(registerForm);
      saveSession(data);
      setRegisterForm(emptyRegisterForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateEmployee(payload) {
    try {
      setSubmitting(true);
      setError("");
      await createEmployee(session.token, payload);
      setEmployeeForm(emptyEmployeeForm);
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(employee) {
    const status = employee.status === "active" ? "inactive" : "active";
    try {
      setError("");
      await updateEmployee(session.token, employee._id, { status });
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateEmployee(employeeId, payload) {
    try {
      setSubmitting(true);
      setError("");
      await updateEmployee(session.token, employeeId, payload);
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEmployee(employeeId) {
    try {
      setError("");
      await deleteEmployee(session.token, employeeId);
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!session) {
    return mode === "login" ? (
      <LoginPage
        form={loginForm}
        mode={mode}
        onChange={setLoginForm}
        onSubmit={handleLogin}
        onModeChange={setMode}
        submitting={submitting}
        error={error}
      />
    ) : (
      <RegisterPage
        form={registerForm}
        mode={mode}
        onChange={setRegisterForm}
        onSubmit={handleRegister}
        onModeChange={setMode}
        submitting={submitting}
        error={error}
      />
    );
  }

  function renderPage() {
    if (activePage === "collaborators") {
      return (
        <CollaboratorsPage
          session={session}
          employees={employees}
          form={employeeForm}
          loading={loadingEmployees}
          submitting={submitting}
          error={error}
          onFormChange={setEmployeeForm}
          onCreate={handleCreateEmployee}
          onUpdate={handleUpdateEmployee}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteEmployee}
        />
      );
    }

    if (activePage === "performance") return <PerformancePage />;
    if (activePage === "skills") return <SkillsTrainingPage />;
    if (activePage === "leaves") return <LeavesPage />;
    return <DashboardPage session={session} />;
  }

  return (
    <AppLayout
      session={session}
      activePage={activePage}
      theme={theme}
      onThemeToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      onNavigate={navigate}
      onLogout={clearSession}
    >
      {renderPage()}
    </AppLayout>
  );
}
