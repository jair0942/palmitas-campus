import { prisma } from "../src/lib/prisma";

async function main() {
  const campuses = await prisma.campus.findMany();
  const palmitas = campuses.find((c) => c.name.toUpperCase().includes("PALMITAS"))!;
  const jaraba = campuses.find((c) => c.name.toUpperCase().includes("JARABA"))!;

  const counts = async (campusId: string) => ({
    users: await prisma.user.count({ where: { campusId } }),
    enrollments: await prisma.enrollment.count({ where: { academicGroup: { campusId } } }),
    classes: await prisma.class.count({ where: { academicGroup: { campusId } } }),
    teachingAssignments: await prisma.teachingAssignment.count({ where: { campusId } }),
    subjects: await prisma.subject.count({ where: { campusId } }),
    cycles: await prisma.cycle.count({ where: { campusId } }),
    academicGroups: await prisma.academicGroup.count({ where: { campusId } }),
  });

  console.log("PALMITAS:", JSON.stringify(await counts(palmitas.id)));
  console.log("JARABA:", JSON.stringify(await counts(jaraba.id)));

  const yira = await prisma.user.findUnique({
    where: { username: "yira.jimenez" },
    select: { role: { select: { name: true } }, campusId: true },
  });
  console.log("yira.jimenez:", JSON.stringify(yira));

  const settings = await prisma.institutionSettings.findFirst({ select: { activeSemesterId: true } });
  console.log("activeSemesterId:", settings?.activeSemesterId);

  console.log("retention_policies:", await prisma.retentionPolicy.count());
  console.log("cleanup_runs:", await prisma.cleanupRun.count());
  console.log("file_assets:", await prisma.fileAsset.count());
  console.log("RETENTION-TEST rows:", await prisma.fileAsset.count({ where: { originalName: { contains: "RETENTION-TEST" } } }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
