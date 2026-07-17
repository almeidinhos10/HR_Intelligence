import { ROLES } from "../utils/permissions";
import { SkillsAdmin } from "./SkillsAdmin";
import { SkillsGestor } from "./SkillsGestor";
import { SkillsColaborador } from "./SkillsColaborador";

export function SkillsTrainingPage({ session }) {
  const { role } = session.user;
  if (role === ROLES.ADMIN) return <SkillsAdmin session={session} />;
  if (role === ROLES.MANAGER) return <SkillsGestor session={session} />;
  return <SkillsColaborador session={session} />;
}
