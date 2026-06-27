export const ROLES = {
  EMPLOYEE: "colaborador",
  MANAGER: "gestor",
  ADMIN: "administrador"
};

export function canManageEmployees(role) {
  return [ROLES.MANAGER, ROLES.ADMIN].includes(role);
}

export function canDeleteEmployees(role) {
  return role === ROLES.ADMIN;
}

export function getAvailableModules(role) {
  const common = [
    { id: "dashboard", label: "Dashboard" },
    { id: "collaborators", label: "Colaboradores" },
    { id: "performance", label: "Avaliacao" },
    { id: "skills", label: "Competencias" },
    { id: "leaves", label: "Ferias" }
  ];

  if (role === ROLES.EMPLOYEE) {
    return common.filter((module) =>
      ["dashboard", "performance", "skills", "leaves"].includes(module.id)
    );
  }

  return common;
}

