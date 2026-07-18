import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { CollaboratorsPage } from "./pages/CollaboratorsPage";
import { ManagersPage } from "./pages/ManagersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LeavesPage } from "./pages/LeavesPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PerformancePage } from "./pages/PerformancePage";
import { SetPasswordPage } from "./pages/SetPasswordPage";
import { SkillsTrainingPage } from "./pages/SkillsTrainingPage";
import { UsersPage } from "./pages/UsersPage";
import {
  deleteEmployee,
  getEmployees,
  login,
  updateEmployee
} from "./api";

import { canManageEmployees, getAvailableModules } from "./utils/permissions";

const emptyLoginForm = { email: "", password: "" };

function getSessionFromStorage() {
  try {
    const saved = localStorage.getItem("hr_session");
    return saved ? JSON.parse(saved) : null;
  } catch (_err) {
    return null;
  }
}

export default function App() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const activePage = location.pathname.replace("/", "") || "dashboard";

  const [theme, setTheme] = useState(() => localStorage.getItem("hr_theme") || "light");
  const [session, setSession] = useState(getSessionFromStorage);
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("hr_theme", theme);
  }, [theme]);

  function saveSession(newSession) {
    setSession(newSession);
    localStorage.setItem("hr_session", JSON.stringify(newSession));
    routerNavigate("/dashboard");
  }

  function clearSession() {
    setSession(null);
    localStorage.removeItem("hr_session");
    setEmployees([]);
    setManagers([]);
    routerNavigate("/");
  }

  function navigate(page) {
    if (!session) return;
    const modules = getAvailableModules(session.user.role);
    if (modules.some((module) => module.id === page)) {
      routerNavigate(`/${page}`);
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

  async function loadManagers() {
    if (!session?.token) return;
    try {
      setLoadingManagers(true);
      const data = await getEmployees(session.token, { gestoresOnly: true });
      setManagers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingManagers(false);
    }
  }

  useEffect(() => {
    if (activePage === "collaborators") { loadEmployees(); loadManagers(); }
    if (activePage === "managers") loadManagers();
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

  async function handleToggleManagerStatus(manager) {
    const status = manager.status === "active" ? "inactive" : "active";
    try {
      setError("");
      await updateEmployee(session.token, manager._id, { status });
      await loadManagers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateManager(managerId, payload) {
    try {
      setSubmitting(true);
      setError("");
      await updateEmployee(session.token, managerId, payload);
      await loadManagers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteManager(managerId) {
    try {
      setError("");
      await deleteEmployee(session.token, managerId);
      await loadManagers();
    } catch (err) {
      setError(err.message);
    }
  }

  const setupToken = new URLSearchParams(window.location.search).get("token");
  if (setupToken) {
    return (
      <SetPasswordPage
        token={setupToken}
        onSuccess={(data) => {
          saveSession(data);
          window.history.replaceState({}, "", "/dashboard");
        }}
      />
    );
  }

  if (!session) {
    return (
      <LoginPage
        form={loginForm}
        onChange={setLoginForm}
        onSubmit={handleLogin}
        submitting={submitting}
        error={error}
      />
    );
  }

  const allowedPages = getAvailableModules(session.user.role).map((module) => module.id);
  function guarded(pageId, element) {
    return allowedPages.includes(pageId) ? element : <Navigate to="/dashboard" replace />;
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
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage session={session} />} />
        <Route path="/profile" element={guarded("profile", <ProfilePage session={session} />)} />
        <Route path="/performance" element={guarded("performance", <PerformancePage session={session} />)} />
        <Route path="/skills" element={guarded("skills", <SkillsTrainingPage session={session} />)} />
        <Route path="/leaves" element={guarded("leaves", <LeavesPage session={session} />)} />
        <Route path="/users" element={guarded("users", <UsersPage session={session} />)} />
        <Route
          path="/collaborators"
          element={guarded(
            "collaborators",
            <CollaboratorsPage
              session={session}
              employees={employees}
              gestores={managers}
              loading={loadingEmployees}
              submitting={submitting}
              error={error}
              onUpdate={handleUpdateEmployee}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteEmployee}
              onReload={loadEmployees}
            />
          )}
        />
        <Route
          path="/managers"
          element={guarded(
            "managers",
            <ManagersPage
              managers={managers}
              loading={loadingManagers}
              submitting={submitting}
              error={error}
              onUpdate={handleUpdateManager}
              onToggleStatus={handleToggleManagerStatus}
              onDelete={handleDeleteManager}
            />
          )}
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}
