import { ROLES } from "../utils/permissions";
import { PerformanceAdmin } from "./PerformanceAdmin";
import { PerformanceGestor } from "./PerformanceGestor";
import { PerformanceColaborador } from "./PerformanceColaborador";

export function PerformancePage({ session }) {
  const { role } = session.user;
  if (role === ROLES.ADMIN) return <PerformanceAdmin session={session} />;
  if (role === ROLES.MANAGER) return <PerformanceGestor session={session} />;
  return <PerformanceColaborador session={session} />;
}
