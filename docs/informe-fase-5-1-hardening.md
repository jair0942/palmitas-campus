# Informe Fase 5.1 — Hardening de autorización y validaciones

**Fecha:** 2026-08-03
**Contexto:** Corrección exclusiva de los hallazgos técnicos #1 y #2 de la auditoría Fase 5. No se modificó schema, no hubo migraciones, no se ejecutaron phase3/phase4, no se alteró la carga de PALMITAS/JARABA.

## Vulnerabilidades corregidas

### #1 — `POST /api/notifications`: validación de `type` (500 → 400)
- **Antes:** cualquier `type` llegaba a Prisma; un valor fuera del enum `NotificationType` producía `PrismaClientValidationError` → HTTP 500.
- **Ahora:** se valida `body.type` contra `Object.values(NotificationType)` ANTES de Prisma; inválido → HTTP 400 con mensaje JSON que lista los valores permitidos. Tipo válido conserva el comportamiento. No se tocó campus-scope ni autorización.

### #2 — `assignments` y `posts`: autorización backend (docente/estudiante → clase)
Nuevo guard compartido `src/lib/class-access-guard.ts`:
- `assertClassActor` → resuelve la relación real contra el modelo:
  - TEACHER: solo clases cuyo `class.teachingAssignment.teacherId === userId` autenticado (nunca ids del cliente).
  - STUDENT: solo clases del `academicGroup` donde el usuario está matriculado (`enrollment.studentId + academicGroupId`).
  - ADMIN: conserva comportamiento administrativo (alcance por sede).
  - Clase fuera de la sede → 404; clase de colega en la misma sede → 403.
- `assertAssignmentWritable` → aplica lo mismo a PATCH/DELETE de assignments.
- `assertPostWritable` → PATCH/DELETE de posts: teacher solo sobre posts de sus clases o propios.
- `POST /api/posts`: `authorId` se impone como el usuario autenticado para student/teacher (anti-suplantación). Para admin solo se permite atribuir a otro usuario si existe en la sede seleccionada (self admin ya no da 404).

## Archivos modificados
- `src/lib/class-access-guard.ts` (nuevo)
- `src/app/api/notifications/route.ts`
- `src/app/api/assignments/route.ts` (POST)
- `src/app/api/assignments/[id]/route.ts` (PATCH/DELETE)
- `src/app/api/posts/route.ts` (POST)
- `src/app/api/posts/[id]/route.ts` (PATCH/DELETE)

## No se rompió Ciclo 2
- El guard depende de relaciones reales (`Class.teachingAssignment.teacherId`, `Enrollment.academicGroupId`); C2 JARABA sigue sin Subjects/Classes y `neila.canedo` continúa viendo/administrando su grupo (verificado: 14 matrículas C2, sin cambios).

## Pruebas realizadas (`scripts/audit-phase51.ts`) — HTTP E2E sobre el servidor

| Módulo | Resultado |
|---|---|
| NOTIFICATIONS: type válido→201, type inválido→400, sin sesión→401, JAR notificando PAL→403, auto-notif estudiante→201 | 5 PASS |
| ASSIGNMENTS: crea clase propia→201, clase ajena misma sede→403, sede contraria→404, 2ª clase propia→201, edita propia→200, edita ajena→403, borra ajena→403, estudiante→403, sin sesión→401, admin global con sede→201 | 9 PASS |
| POSTS: estudiante su grupo→201, spoof authorId→forzado self, estudiante otro grupo→403, teacher propia→201, teacher clase ajena misma sede→403, teacher sede contraria→404, estudiante PAL→404, sin sesión→401, admin→201, edita/borra ajenos→403 | 12 PASS + 1 WARN (estudiantes no pueden borrar: diseño actual, no regresión) |
| E2E subetarea: entrega→201, calificación→201 | 2 PASS |
| Regresión: neila C2=14, estudiantes solo su sede (20/24), acceso cruzado por ID→404 | 6 PASS |

**Total: 37 checks | PASS 36 | FAIL 0 | WARN 1** (WARN = estudiantes no pueden borrar posts, comportamiento ya existente fuera del alcance).

## Aislamiento por sede (regresión Fase 5 confirmada)
- JARABA y PALMITAS no se filtran entre sí en clases, tareas, posts, notificaciones, matriculación ni acceso por ID.

## Invariantes de base de datos (antes = después)
- PALMITAS: users=57, enrollments=51, classes=24.
- JARABA: users=55, enrollments=49, classes=20, TeachingAssignments=21, Subjects=10, Cycles=4, AcademicGroups=4.
- `InstitutionSettings.activeSemesterId` sin cambios (`cmr7f428g000novg4bc0y4mp`).
- `yira.jimenez`: campusId=NULL.
- Residuos temporales de pruebas: 0 (assignments/posts/notifications/submissions/grades `AUDIT51-*` purgados).

## Validación final
- `npx tsc --noEmit` → PASS (sin errores)
- `npm run build` → PASS

## Pendiente (NO corregido, solo documentado)
- Hallazgo #3 (textos hardcodeados "Campus Virtual"/"Institución Educativa…"): se corrige en la futura fase de frontend/configuración.