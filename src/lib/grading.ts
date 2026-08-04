import type { Assignment } from "@/types";

export interface GradableRow {
  score: number | null;
  maxScore: number;
}

function latestGradedScore(submissions: Assignment["submissions"], studentId: string): number | null {
  const graded = submissions
    .filter((s) => s.studentId === studentId && s.grade)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return graded[0]?.grade?.score ?? null;
}

export function gradedRowsForStudent(
  assignments: Assignment[],
  classId: string,
  studentId: string
): GradableRow[] {
  return assignments
    .filter((a) => a.classId === classId)
    .map((a) => ({
      score: latestGradedScore(a.submissions, studentId),
      maxScore: a.points,
    }));
}

export function gradedScoresByAssignment(
  assignments: Assignment[],
  classId: string,
  studentId: string
): Map<string, GradableRow> {
  const map = new Map<string, GradableRow>();
  for (const a of assignments) {
    if (a.classId !== classId) continue;
    map.set(a.id, {
      score: latestGradedScore(a.submissions, studentId),
      maxScore: a.points,
    });
  }
  return map;
}

export function weightedAveragePercent(rows: GradableRow[]): number | null {
  const graded = rows.filter((r): r is { score: number; maxScore: number } => r.score !== null);
  if (graded.length === 0) return null;
  const totalMax = graded.reduce((sum, r) => sum + r.maxScore, 0);
  if (totalMax <= 0) return null;
  return Math.round((graded.reduce((sum, r) => sum + r.score, 0) / totalMax) * 100);
}

export function classAveragePercent(
  assignments: Assignment[],
  classId: string,
  studentId: string
): number | null {
  return weightedAveragePercent(gradedRowsForStudent(assignments, classId, studentId));
}

export function meanPercent(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((sum, v) => sum + v, 0) / nums.length);
}