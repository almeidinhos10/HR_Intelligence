const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    let message = "Request failed.";
    try {
      const body = await response.json();
      if (body.message) message = body.message;
    } catch (_err) {
      // Keep fallback message
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

export function register(payload) {
  return request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function login(payload) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function getEmployees(token, { includeGestores = false, gestoresOnly = false } = {}) {
  const params = new URLSearchParams();
  if (gestoresOnly) params.set("gestoresOnly", "true");
  else if (includeGestores) params.set("includeGestores", "true");
  const qs = params.toString() ? `?${params}` : "";
  return request(`/employees${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createEmployee(token, payload) {
  return request("/employees", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function updateEmployee(token, id, payload) {
  return request(`/employees/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function getMyProfile(token) {
  return request("/employees/me", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function deleteEmployee(token, id) {
  return request(`/employees/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function approveEmployee(token, id) {
  return request(`/employees/${id}/approve`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ── Evaluation Cycles ──────────────────────────────────────────────────────

export function getCycles(token) {
  return request("/evaluations/cycles", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createCycle(token, payload) {
  return request("/evaluations/cycles", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function updateCycle(token, id, payload) {
  return request(`/evaluations/cycles/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function deleteCycle(token, id) {
  return request(`/evaluations/cycles/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ── Evaluations ────────────────────────────────────────────────────────────

export function getEvaluations(token) {
  return request("/evaluations", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createEvaluation(token, payload) {
  return request("/evaluations", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function deleteEvaluation(token, id) {
  return request(`/evaluations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ── Users ──────────────────────────────────────────────────────────────────

export function setupPassword(payload) {
  return request("/auth/setup-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function getUsers(token) {
  return request("/users", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createUser(token, payload) {
  return request("/users", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function updateUserRole(token, id, role) {
  return request(`/users/${id}/role`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ role })
  });
}

export function deleteUser(token, id) {
  return request(`/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ── Trainings ──────────────────────────────────────────────────────────────

export function getTrainings(token) {
  return request("/trainings", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createTraining(token, payload) {
  return request("/trainings", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function updateTraining(token, id, payload) {
  return request(`/trainings/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function deleteTraining(token, id) {
  return request(`/trainings/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ── Leaves ─────────────────────────────────────────────────────────────────

export function getLeaves(token) {
  return request("/leaves", { headers: { Authorization: `Bearer ${token}` } });
}

export function createLeave(token, payload) {
  return request("/leaves", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function reviewLeave(token, id, payload) {
  return request(`/leaves/${id}/review`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function deleteLeave(token, id) {
  return request(`/leaves/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getLeaveBalance(token, year, employeeId) {
  const params = new URLSearchParams({ year });
  if (employeeId) params.set("employeeId", employeeId);
  return request(`/leaves/balance?${params}`, { headers: { Authorization: `Bearer ${token}` } });
}

export function getBlockedPeriods(token) {
  return request("/leaves/blocked", { headers: { Authorization: `Bearer ${token}` } });
}

export function createBlockedPeriod(token, payload) {
  return request("/leaves/blocked", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function deleteBlockedPeriod(token, id) {
  return request(`/leaves/blocked/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}
