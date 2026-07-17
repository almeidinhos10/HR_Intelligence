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
  if (role === ROLES.EMPLOYEE) {
    return [
      { id: "dashboard", label: "Dashboard" },
      { id: "profile",   label: "Perfil",       section: "CONTA" },
      { id: "performance", label: "Avaliações", section: "DESEMPENHO" },
      { id: "skills",    label: "Competências" },
      { id: "leaves",    label: "Férias",        section: "TEMPO" },
    ];
  }

  if (role === ROLES.ADMIN) {
    return [
      { id: "dashboard",     label: "Dashboard" },
      { id: "collaborators", label: "Colaboradores", section: "PESSOAS" },
      { id: "managers",      label: "Gestores" },
      { id: "users",         label: "Utilizadores" },
      { id: "performance",   label: "Avaliação",     section: "DESEMPENHO" },
      { id: "skills",        label: "Competências" },
      { id: "leaves",        label: "Férias",         section: "TEMPO" },
    ];
  }

  return [
    { id: "dashboard",     label: "Dashboard" },
    { id: "collaborators", label: "Colaboradores", section: "PESSOAS" },
    { id: "performance",   label: "Avaliação",     section: "DESEMPENHO" },
    { id: "skills",        label: "Competências" },
    { id: "leaves",        label: "Férias",         section: "TEMPO" },
    { id: "profile",       label: "Perfil",         section: "CONTA" },
  ];
}

