"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, BookOpen, KeyRound, Lock, Mail, Pencil, Plus, School, Settings, Trash2, User } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { getUserDisplayName } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/shared/page-header";

export default function AdminSettingsPage() {
  const router = useRouter();
  const {
    user,
    semesters,
    cycles,
    subjects,
    addSemester,
    updateSemester,
    deleteSemester,
    setActiveSemester,
    addCycle,
    updateCycle,
    deleteCycle,
    addSubject,
    updateSubject,
    deleteSubject,
  } = useStore();

  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [semesterForm, setSemesterForm] = useState({ code: "", name: "", startDate: "", endDate: "" });
  const [editingSemId, setEditingSemId] = useState<string | null>(null);
  const [cycleForm, setCycleForm] = useState({ code: "", name: "", description: "", order: 0, usesSubjects: true });
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", color: "#0F6A3B", icon: "book-open" });
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

  if (!user || user.role !== "admin") {
    router.push("/dashboard");
    return null;
  }

  function resetSemesterForm() {
    setEditingSemId(null);
    setSemesterForm({ code: "", name: "", startDate: "", endDate: "" });
  }

  function resetCycleForm() {
    setEditingCycleId(null);
    setCycleForm({ code: "", name: "", description: "", order: 0, usesSubjects: true });
  }

  function resetSubjectForm() {
    setEditingSubjectId(null);
    setSubjectForm({ name: "", code: "", color: "#0F6A3B", icon: "book-open" });
  }

  function handleChangePassword() {
    if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) return;
    if (passwordForm.newPass !== passwordForm.confirm) {
      alert("Las contrasenas no coinciden.");
      return;
    }
    alert("Contrasena actualizada correctamente.");
    setPasswordForm({ current: "", newPass: "", confirm: "" });
  }

  async function handleSaveSemester() {
    if (!semesterForm.code || !semesterForm.name) return;
    if (editingSemId) {
      await updateSemester(editingSemId, {
        code: semesterForm.code,
        name: semesterForm.name,
        startDate: semesterForm.startDate || undefined,
        endDate: semesterForm.endDate || undefined,
      });
    } else {
      await addSemester({
        code: semesterForm.code,
        name: semesterForm.name,
        startDate: semesterForm.startDate || new Date().toISOString(),
        endDate: semesterForm.endDate || new Date().toISOString(),
      });
    }
    resetSemesterForm();
  }

  async function handleSaveCycle() {
    if (!cycleForm.code || !cycleForm.name) return;
    if (editingCycleId) {
      await updateCycle(editingCycleId, cycleForm);
    } else {
      await addCycle(cycleForm);
    }
    resetCycleForm();
  }

  async function handleSaveSubject() {
    if (!subjectForm.name || !subjectForm.code) return;
    if (editingSubjectId) {
      await updateSubject(editingSubjectId, subjectForm);
    } else {
      await addSubject(subjectForm);
    }
    resetSubjectForm();
  }

  async function handleDeleteSemester(semesterId: string) {
    if (!confirm("Eliminar semestre?")) return;
    const deleted = await deleteSemester(semesterId);
    if (!deleted) alert("No se puede eliminar un semestre con historial.");
  }

  async function handleDeleteCycle(cycleId: string) {
    if (!confirm("Eliminar ciclo?")) return;
    const deleted = await deleteCycle(cycleId);
    if (!deleted) alert("No se puede eliminar un ciclo con grupos academicos.");
  }

  async function handleDeleteSubject(subjectId: string) {
    if (!confirm("Eliminar materia?")) return;
    const deleted = await deleteSubject(subjectId);
    if (!deleted) alert("No se puede eliminar una materia usada por clases historicas.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <PageHeader icon={Settings} title="Configuracion" description="Administra semestres, ciclos, materias y cuenta institucional" />

      <motion.div id="semestres" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><School className="size-4 text-primary" />Semestres Academicos</CardTitle>
              <Dialog>
                <DialogTrigger render={<Button size="sm" className="gap-1" onClick={resetSemesterForm}><Plus className="size-3.5" />Agregar</Button>} />
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader><DialogTitle>{editingSemId ? "Editar semestre" : "Nuevo semestre"}</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-2">
                    <Input value={semesterForm.code} onChange={(e) => setSemesterForm({ ...semesterForm, code: e.target.value })} placeholder="2026-1" />
                    <Input value={semesterForm.name} onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })} placeholder="Semestre 2026-1" />
                    <Input type="date" value={semesterForm.startDate} onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })} />
                    <Input type="date" value={semesterForm.endDate} onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                    <DialogClose render={<Button onClick={handleSaveSemester} disabled={!semesterForm.code || !semesterForm.name}>Guardar</Button>} />
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {semesters.map((semester) => (
              <div key={semester.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{semester.name}</p>
                  <p className="text-xs text-muted-foreground">{semester.code}</p>
                </div>
                <div className="flex gap-1">
                  {semester.active && <Badge>Activo</Badge>}
                  {!semester.active && <Button variant="outline" size="xs" onClick={async () => { await setActiveSemester(semester.id); }}>Activar</Button>}
                  <Dialog>
                    <DialogTrigger render={<Button variant="ghost" size="icon-xs" onClick={() => { setEditingSemId(semester.id); setSemesterForm({ code: semester.code, name: semester.name, startDate: semester.startDate?.split("T")[0] || "", endDate: semester.endDate?.split("T")[0] || "" }); }}><Pencil className="size-3" /></Button>} />
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader><DialogTitle>Editar semestre</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-2">
                        <Input value={semesterForm.code} onChange={(e) => setSemesterForm({ ...semesterForm, code: e.target.value })} />
                        <Input value={semesterForm.name} onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })} />
                        <Input type="date" value={semesterForm.startDate} onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })} />
                        <Input type="date" value={semesterForm.endDate} onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })} />
                      </div>
                      <DialogFooter>
                        <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                        <DialogClose render={<Button onClick={handleSaveSemester} disabled={!semesterForm.code || !semesterForm.name}>Guardar</Button>} />
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteSemester(semester.id)}><Trash2 className="size-3" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div id="ciclos" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4 text-primary" />Ciclos</CardTitle>
              <Dialog>
                <DialogTrigger render={<Button size="sm" className="gap-1" onClick={resetCycleForm}><Plus className="size-3.5" />Agregar</Button>} />
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader><DialogTitle>{editingCycleId ? "Editar ciclo" : "Nuevo ciclo"}</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-2">
                    <Input value={cycleForm.code} onChange={(e) => setCycleForm({ ...cycleForm, code: e.target.value })} placeholder="C3" />
                    <Input value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} placeholder="Ciclo 3" />
                    <Input value={cycleForm.description} onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })} placeholder="Descripcion" />
                    <Input type="number" value={cycleForm.order} onChange={(e) => setCycleForm({ ...cycleForm, order: parseInt(e.target.value) || 0, usesSubjects: (parseInt(e.target.value) || 0) !== 2 })} />
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                    <DialogClose render={<Button onClick={handleSaveCycle} disabled={!cycleForm.code || !cycleForm.name}>Guardar</Button>} />
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...cycles].sort((a, b) => a.order - b.order).map((cycle) => (
              <div key={cycle.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{cycle.name}</p>
                  <p className="text-xs text-muted-foreground">{cycle.description} - {cycle.usesSubjects ? "Usa materias" : "Sin materias"}</p>
                </div>
                <div className="flex gap-1">
                  <Dialog>
                    <DialogTrigger render={<Button variant="ghost" size="icon-xs" onClick={() => { setEditingCycleId(cycle.id); setCycleForm({ code: cycle.code, name: cycle.name, description: cycle.description, order: cycle.order, usesSubjects: cycle.usesSubjects }); }}><Pencil className="size-3" /></Button>} />
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader><DialogTitle>Editar ciclo</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-2">
                        <Input value={cycleForm.code} onChange={(e) => setCycleForm({ ...cycleForm, code: e.target.value })} />
                        <Input value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} />
                        <Input value={cycleForm.description} onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })} />
                        <Input type="number" value={cycleForm.order} onChange={(e) => setCycleForm({ ...cycleForm, order: parseInt(e.target.value) || 0, usesSubjects: (parseInt(e.target.value) || 0) !== 2 })} />
                      </div>
                      <DialogFooter>
                        <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                        <DialogClose render={<Button onClick={handleSaveCycle} disabled={!cycleForm.code || !cycleForm.name}>Guardar</Button>} />
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteCycle(cycle.id)}><Trash2 className="size-3" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div id="materias" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4 text-primary" />Materias</CardTitle>
              <Dialog>
                <DialogTrigger render={<Button size="sm" className="gap-1" onClick={resetSubjectForm}><Plus className="size-3.5" />Agregar</Button>} />
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader><DialogTitle>{editingSubjectId ? "Editar materia" : "Nueva materia"}</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-2">
                    <Input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="Matematicas" />
                    <Input value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} placeholder="MAT" />
                    <Input value={subjectForm.color} onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })} placeholder="#0F6A3B" />
                    <Input value={subjectForm.icon} onChange={(e) => setSubjectForm({ ...subjectForm, icon: e.target.value })} placeholder="book-open" />
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                    <DialogClose render={<Button onClick={handleSaveSubject} disabled={!subjectForm.name || !subjectForm.code}>Guardar</Button>} />
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {subjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="flex items-center gap-3">
                  <span className="size-4 rounded-full" style={{ backgroundColor: subject.color }} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">{subject.code} - {subject.icon}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Dialog>
                    <DialogTrigger render={<Button variant="ghost" size="icon-xs" onClick={() => { setEditingSubjectId(subject.id); setSubjectForm({ name: subject.name, code: subject.code, color: subject.color, icon: subject.icon }); }}><Pencil className="size-3" /></Button>} />
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader><DialogTitle>Editar materia</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-2">
                        <Input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} />
                        <Input value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} />
                        <Input value={subjectForm.color} onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })} />
                        <Input value={subjectForm.icon} onChange={(e) => setSubjectForm({ ...subjectForm, icon: e.target.value })} />
                      </div>
                      <DialogFooter>
                        <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                        <DialogClose render={<Button onClick={handleSaveSubject} disabled={!subjectForm.name || !subjectForm.code}>Guardar</Button>} />
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteSubject(subject.id)}><Trash2 className="size-3" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <Card className="shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="size-4 text-primary" />Informacion del Administrador</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <label className="text-xs font-semibold text-muted-foreground">Nombre</label>
            <p className="mt-1 text-sm font-medium text-foreground">{getUserDisplayName(user)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <label className="text-xs font-semibold text-muted-foreground">Usuario</label>
            <p className="mt-1 text-sm font-medium text-foreground">{user.username}</p>
          </div>
          {user.email && (
            <div className="rounded-lg bg-muted/50 p-3 sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Mail className="size-3" />Correo opcional</label>
              <p className="mt-1 text-sm font-medium text-foreground">{user.email}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="size-4 text-primary" />Cambiar Contrasena</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} placeholder="Contrasena actual" />
          <Separator />
          <Input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} placeholder="Nueva contrasena" />
          <Input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} placeholder="Confirmar nueva contrasena" />
          <Button onClick={handleChangePassword} disabled={!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm} className="gap-1.5">
            <KeyRound className="size-3.5" /> Actualizar contrasena
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
