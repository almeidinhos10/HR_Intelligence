import { ROLES } from "../utils/permissions";
import { DashboardAdmin } from "./DashboardAdmin";
import { DashboardColaborador } from "./DashboardColaborador";
import { DashboardGestor } from "./DashboardGestor";

export function DashboardPage({ session }) {
  const { role } = session.user;
  if (role === ROLES.ADMIN) return <DashboardAdmin session={session} />;
  if (role === ROLES.MANAGER) return <DashboardGestor session={session} />;
  return <DashboardColaborador session={session} />;
}
