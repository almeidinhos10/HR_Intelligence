const API_BASE_URL = "http://localhost:5000/api";

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

export function getEmployees(token) {
  return request("/employees", {
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

export function deleteEmployee(token, id) {
  return request(`/employees/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}
