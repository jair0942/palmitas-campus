# Informe Fase 5 — Auditoría funcional multisede (PALMITAS + JARABA)

**Fecha:** 2026-08-02
**Contexto:** Post-inserción Fase 4 (JARABA ciclos C2/C3/C4/C6). Sin migraciones, sin modificación de schema y sin alteración de datos estructurales existentes. Pruebas E2E reales sobre servidor Next en producción (`next start -p 3100`).
**Instrumentos:** `scripts/audit-phase5.ts` (harness HTTP con sesiones reales), `scripts/audit-snapshot.ts` (invariantes), consultas directas Prisma de verificación.

## Resumen ejecutivo

| Conteo | Valor |
|---|---|
| Checks totales | 37 |
| PASS | 31 |
| FAIL | 0 |
| WARN | 2 (1 falso positivo del harness; 1 hallazgo de diseño) |
| INFO | 4 |
| Hallazgos reportables | 3 (todos BAJO) |

Aislamiento entre sedes: **CORRECTO**. Todos los flujos funcionales principales operan sin fugas entre PALMITAS y JARABA. No se detectaron bugs CRÍTICOS ni ALTOs.

## Módulos verificados

### A. Login / Sesión — PASS
- 9 perfiles (1 admin global `yira.jimenez`, 4 profesores, 4 estudiantes) autentican contra `/api/auth/login` y `/api/auth/me` con la identidad correcta (`rol`, `campus.code`) y `mustChangePassword=true` en todos los usuarios creados (y previos).

### B. Visibilidad estudiante (aislamiento de sede) — PASS
- Estudiantes JARABA (jorge C3, maria C4, sandy C6) ven 20 clases, todas de sede JARABA.
- Estudiante PAL (mishell.paez) ve 24 clases, todas de sede PALMITAS.
- Ningún estudiante obtiene clases de otra sede. (INFO: a nivel API, `GET /api/classes` expone todas las clases de la sede al estudiante; el frontend filtra por matrícula mediante `getClassesForUser`.)

### C. Profesor ve matrículas de sus grupos — PASS
- `neila.canedo` (manager de C2) ve únicamente las 14 matrículas del grupo C2 (verificado contra BD; el único WARN emitido fue un defecto del propio harness al leer `academicGroup.code`, campo inexistente).
- `lidiber.portela` (MAT C3/C4/C6) ve las 35 matrículas de esos grupos.

### D. E2E tarea (JARABA, Matemáticas Ciclo 3) — PASS
1. Profesor de MAT crea tarea (201).
2. Estudiante publica en la clase y entrega la tarea (201).
3. Profesor califica 95/100 (201); estudiante lee su calificación (`grade.score === 95`).
4. `GET /api/submissions` como estudiante devuelve solo sus propias entregas.
5. **Aislamiento:** un estudiante PAL no puede leer la tarea JARABA por ID (404).
6. Profesor JARABA no puede crear tarea en una clase de PAL (404).

### E. Notificaciones — PASS (con hallazgo)
- Admin global crea notificación para estudiante JARABA; el destinatario la lee; el estudiante PAL no la ve (sin fugas).
- Hallazgo: `type` no se valida en `POST /api/notifications`; un valor ajeno al enum provoca 500 del servidor (ver Hallazgos).

### F. Seguridad por ID — PASS
- JAR estudiando clase PAL por ID → 404. PAL estudiando clase JAR por ID → 404.
- Sin sesión → 401.

### G. Admin global con `x-campus-id` — PASS
- Admin global sin sede: lectura global (44 clases = 20 JAR + 24 PAL) y escritura bloqueada con 400 `"Debe seleccionar una sede..."`.
- Con `x-campus-id`: filtra correctamente por sede (20 / 24).

### Invariantes post-tests — PASS
- PAL: users=57, enrollments=51, classes=24. JARABA: users=55, enrollments=49, classes=20, teachingAssignments=21, subjects=10, cycles=4, academicGroups=4. `settingsActiveSemesterId` intacto (`cmr7f428g000novg4bc0y4mp`). `yira.jimenez` global (campus null). Cero residuos `AUDIT-*` en assignments, posts, notifications, submissions, grades.

## Hallazgos (clasificación)

### 1. [BAJO] `POST /api/notifications` — sin validación del campo `type` → 500
- `src/app/api/notifications/route.ts` acepta cualquier `type` y delega en el enum de Prisma; un valor inválido (`"info"`) produce `PrismaClientValidationError` sin captura → HTTP 500 (debería ser 400).
- Recomendación: validar contra el enum `NotificationType` y devolver 400 descriptivo.

### 2. [BAJO] Escrituras `assignments` y `posts` no validan la relación docentes/estudiante→clase
- `POST /api/assignments` y `POST /api/posts` (y `POST /api/submissions` por `assignmentId`) validan solo la sede de la clase, no que el profesor enseña esa clase (o que el estudiante está matriculado en el grupo).
- El frontend sí restringe (los botones solo aparecen para las clases del usuario), por lo que un uso normal no lo expone; solo abuso de API directa.
- Recomendación (mejora): agregar check docente→clase (vía TeachingAssignment) y estudiante→grupo (vía Enrollment) en los POST de escritura.

### 3. [INFO] Textos institucionales hardcodeados
- "Campus Virtual" y "Institución Educativa Antonio Brugués Carmona" están fijos en `src/app/layout.tsx`, `src/components/layout/app-header.tsx`, `app-sidebar.tsx` y `login-form.tsx`. No provienen de `InstitutionSettings.schoolName` ni del contexto de sede. La sede contextual ("Sede {campusName}" / "Administrando: …") sí es dinámica.

### 4. [INFO] `GET /api/classes` es ciudad granular que sede
- Expone todas las clases de la sede a cualquier usuario de ella; la granularidad por matrícula/docencia se resuelve en el frontend (diseño actual "campus-scoped"). Documentado, no corrigido por consistencia con el diseño.

## Conclusión
- **Estado: FASE 5 CERRADA** con resultado favorable. El aislamiento multisede verificado de extremo a extremo (logins, clases, matrículas, tareas, entregas, calificaciones, publicaciones, notificación, seguridad por ID y admin global scoped).
- Los hallazgos son todos de severidad BAJA u observaciones de diseño; se documentan sin corrección estructural (per lineamientos de la fase).
- No se modificó schema, no se migró, no se alteraron datos estructurales existentes.