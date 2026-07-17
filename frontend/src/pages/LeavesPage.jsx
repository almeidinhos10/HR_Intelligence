import { ROLES } from "../utils/permissions";
import { LeavesColaborador } from "./LeavesColaborador";
import { LeavesGestor } from "./LeavesGestor";
import { LeavesAdmin } from "./LeavesAdmin";

export function LeavesPage({ session }) {
  const { role } = session.user;
  if (role === ROLES.ADMIN) return <LeavesAdmin session={session} />;
  if (role === ROLES.MANAGER) return <LeavesGestor session={session} />;
  return <LeavesColaborador session={session} />;
}
