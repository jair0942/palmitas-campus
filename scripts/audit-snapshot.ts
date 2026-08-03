import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

async function snapshot() {
  const jar = await p.campus.findUnique({ where: { code: "JARABA" } });
  const pal = await p.campus.findUnique({ where: { code: "PALMITAS" } });
  if (!jar || !pal) throw new Error("campuses missing");
  const roles = await p.role.findMany({ select: { id: true, name: true } });
  const rn = Object.fromEntries(roles.map((r) => [r.id, r.name]));
  const settings = await p.institutionSettings.findFirst();
  const yira = await p.user.findUnique({ where: { username: "yira.jimenez" }, select: { username: true, campusId: true, roleId: true } });
  const s = {
    pal: {
      users: await p.user.count({ where: { campusId: pal.id } }),
      enrollments: await p.enrollment.count({ where: { academicGroup: { campusId: pal.id } } }),
      classes: await p.class.count({ where: { academicGroup: { campusId: pal.id } } }),
    },
    jar: {
      users: await p.user.count({ where: { campusId: jar.id } }),
      enrollments: await p.enrollment.count({ where: { academicGroup: { campusId: jar.id } } }),
      classes: await p.class.count({ where: { academicGroup: { campusId: jar.id } } }),
      teachingAssignments: await p.teachingAssignment.count({ where: { campusId: jar.id } }),
      subjects: await p.subject.count({ where: { campusId: jar.id } }),
      cycles: await p.cycle.count({ where: { campusId: jar.id } }),
      academicGroups: await p.academicGroup.count({ where: { campusId: jar.id } }),
    },
    settingsActiveSemesterId: settings ? settings.activeSemesterId : null,
    yira: yira ? { role: rn[yira.roleId], campusId: yira.campusId } : null,
    timestamp: new Date().toISOString(),
  };
  console.log("SNAPSHOT " + JSON.stringify(s));
  process.exit(0);
}
snapshot().catch((e) => {
  console.error(e);
  process.exit(1);
});