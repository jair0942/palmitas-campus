"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, BookText, Pencil, Plus, Trash2, UserCheck, Users } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { getAcademicGroupStudentName, getUserDisplayName, isCycle2 } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/shared/empty-state";
import PageHeader from "@/components/shared/page-header";
import RouteGuard from "@/components/auth/route-guard";

const gradientColors = [
  "linear-gradient(135deg, #0F6A3B, #16A34A)",
  "linear-gradient(135deg, #137333, #00A862)",
  "linear-gradient(135deg, #D62828, #E37400)",
  "linear-gradient(135deg, #0F6A3B, #084D2C)",
  "linear-gradient(135deg, #F2C230, #D4A020)",
];

const emptyForm = {
  semesterId: "",
  cycleId: "",
  subjectId: "",
  teacherId: "",
  name: "",
  section: "",
  description: "",
};

export default function AdminClassesPage() {
  const {
    user,
    classes,
    semesters,
    cycles,
    subjects,
    getTeachers,
    getTeacherForClass,
    getStudentsInClass,
    addClass,
    updateClass,
    deleteClass,
    assignTeacherToClass,
    getActiveSemester,
    getAcademicGroupForClass,
    getCycleForGroup,
  } = useStore();

  const teachers = getTeachers();
  const activeSemester = getActiveSemester();
  const [semesterFilter, setSemesterFilter] = useState("");
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState(emptyForm);

  const currentSemesterId = semesterFilter || activeSemester?.id || semesters[0]?.id || "";
  const currentSemester = semesters.find((semester) => semester.id === currentSemesterId);

  const filteredClasses = useMemo(() => {
    if (!currentSemesterId) return classes;
    return classes.filter((cls) => getAcademicGroupForClass(cls.id)?.semesterId === currentSemesterId);
  }, [classes, currentSemesterId, getAcademicGroupForClass]);

  const selectedCycle = cycles.find((cycle) => cycle.id === classForm.cycleId);
  const selectedSubject = subjects.find((subject) => subject.id === classForm.subjectId);
  const selectedTeacher = teachers.find((teacher) => teacher.id === classForm.teacherId);
  const selectedCycleIsCycle2 = isCycle2(selectedCycle);
  const previewName = selectedCycleIsCycle2
    ? "Ciclo 2"
    : classForm.name || [selectedSubject?.name, selectedCycle?.name].filter(Boolean).join(" - ");

  function initForm(cls?: typeof classes[number]) {
    if (!cls) {
      setEditClassId(null);
      setClassForm({ ...emptyForm, semesterId: currentSemesterId, teacherId: teachers[0]?.id || "" });
      return;
    }
    const group = getAcademicGroupForClass(cls.id);
    const clsTeacher = getTeacherForClass(cls.id);
    setEditClassId(cls.id);
    setClassForm({
      semesterId: group?.semesterId || currentSemesterId,
      cycleId: group?.cycleId || "",
      subjectId: cls.subjectId || "",
      teacherId: clsTeacher?.id || "",
      name: cls.name,
      section: cls.section,
      description: cls.description,
    });
  }

  function buildClassName() {
    if (selectedCycleIsCycle2) return "Ciclo 2";
    return classForm.name.trim() || previewName || "Clase";
  }

  async function handleCreateClass() {
    if (!classForm.semesterId || !classForm.cycleId || !classForm.teacherId) return;
    if (!selectedCycleIsCycle2 && !classForm.subjectId) return;
    await addClass({
      semesterId: classForm.semesterId,
      cycleId: classForm.cycleId,
      subjectId: selectedCycleIsCycle2 ? null : classForm.subjectId,
      teacherId: classForm.teacherId,
      name: buildClassName(),
      section: classForm.section,
      description: classForm.description,
    });
    initForm();
  }

  async function handleUpdateClass() {
    if (!editClassId) return;
    const currentTeacher = getTeacherForClass(editClassId);
    await updateClass(editClassId, {
      subjectId: selectedCycleIsCycle2 ? null : classForm.subjectId,
      name: buildClassName(),
      section: classForm.section,
      description: classForm.description,
    });
    if (currentTeacher?.id && currentTeacher.id !== classForm.teacherId) {
      await assignTeacherToClass(editClassId, classForm.teacherId);
    }
    initForm();
  }

  async function handleDeleteClass(classId: string) {
    if (!confirm("Eliminar clase?")) return;
    const deleted = await deleteClass(classId);
    if (!deleted) alert("No se puede eliminar una clase con historial.");
  }

  const classFormFields = (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Semestre</label>
          <Select value={classForm.semesterId} onValueChange={(value) => setClassForm({ ...classForm, semesterId: value ?? "" })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {semesters.map((semester) => (
                <SelectItem key={semester.id} value={semester.id}>{semester.name}{semester.active ? " (Activo)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Ciclo</label>
          <Select value={classForm.cycleId} onValueChange={(value) => setClassForm({ ...classForm, cycleId: value ?? "", subjectId: "" })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {[...cycles].sort((a, b) => a.order - b.order).map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>{cycle.name} - {cycle.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Materia</label>
          <Select value={classForm.subjectId} onValueChange={(value) => setClassForm({ ...classForm, subjectId: value ?? "" })} disabled={selectedCycleIsCycle2}>
            <SelectTrigger><SelectValue placeholder={selectedCycleIsCycle2 ? "No aplica" : "Seleccionar"} /></SelectTrigger>
            <SelectContent>
              {subjects.filter((subject) => subject.active).map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Profesor</label>
          <Select value={classForm.teacherId} onValueChange={(value) => setClassForm({ ...classForm, teacherId: value ?? "" })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>{getUserDisplayName(teacher)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Nombre de la clase</label>
        <Input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder={previewName || "Ej: Matematicas - Ciclo 5"} disabled={selectedCycleIsCycle2} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Seccion</label>
        <Input value={classForm.section} onChange={(e) => setClassForm({ ...classForm, section: e.target.value })} placeholder={selectedTeacher ? `Grupo ${getUserDisplayName(selectedTeacher)}` : "Seccion A"} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Descripcion</label>
        <Textarea value={classForm.description} onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} rows={2} />
      </div>
    </div>
  );

  return (
    <RouteGuard allow={["admin"]}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        icon={BookOpen}
        title="Administrar Clases"
        description={`${filteredClasses.length} clase${filteredClasses.length !== 1 ? "s" : ""}${currentSemester ? ` - ${currentSemester.name}` : ""}`}
        action={
          <Dialog>
            <DialogTrigger render={<Button size="sm" className="gap-1.5" onClick={() => initForm()}><Plus className="size-3.5" />Crear clase</Button>} />
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Crear clase</DialogTitle></DialogHeader>
              {classFormFields}
              <DialogFooter>
                <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                <DialogClose render={<Button onClick={handleCreateClass} disabled={!classForm.semesterId || !classForm.cycleId || !classForm.teacherId || (!selectedCycleIsCycle2 && !classForm.subjectId)}>Crear clase</Button>} />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Consulta por semestre</p>
            <p className="text-xs text-muted-foreground">Las clases historicas se conservan por semestre.</p>
          </div>
          <Select value={currentSemesterId} onValueChange={(value) => setSemesterFilter(value ?? "")}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Seleccionar semestre" /></SelectTrigger>
            <SelectContent>
              {semesters.map((semester) => (
                <SelectItem key={semester.id} value={semester.id}>{semester.name}{semester.active ? " (Activo)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filteredClasses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No hay clases" description="Selecciona semestre, ciclo, grupo academico y profesor para crear la primera clase." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls, index) => {
            const teacher = getTeacherForClass(cls.id);
            const students = getStudentsInClass(cls.id);
            const subject = subjects.find((item) => item.id === cls.subjectId);
            const group = getAcademicGroupForClass(cls.id);
            const cycle = group ? getCycleForGroup(group.id) : undefined;
            const cycleIsSecond = isCycle2(cycle);
            return (
              <Card key={cls.id} className="overflow-hidden rounded-xl border shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
                <div className="px-4 py-5 text-white" style={{ background: gradientColors[index % gradientColors.length] }}>
                  <h3 className="text-base font-bold">{cycleIsSecond ? "Ciclo 2" : cls.name}</h3>
                  {cls.section && <p className="mt-0.5 text-xs text-white/80">{cls.section}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {!cycleIsSecond && subject && <Badge className="gap-1 border-0 bg-white/20 text-white hover:bg-white/30"><BookText className="size-3" />{subject.name}</Badge>}
                    {cycle && <Badge className="border-0 bg-white/20 text-white hover:bg-white/30">{cycle.name}</Badge>}
                  </div>
                </div>
                <CardContent className="space-y-2 pb-4 pt-3">
                  <p className="line-clamp-1 text-xs text-muted-foreground">{cls.description || "Sin descripcion"}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><UserCheck className="size-3.5" />{getUserDisplayName(teacher)}</span>
                    <span className="flex items-center gap-1"><Users className="size-3.5" />{students.length} estudiante{students.length !== 1 ? "s" : ""}</span>
                    {group && <span>{getAcademicGroupStudentName(group)}</span>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Dialog>
                      <DialogTrigger render={<Button variant="outline" size="xs" className="gap-1" onClick={() => initForm(cls)}><Pencil className="size-3" />Editar</Button>} />
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader><DialogTitle>Editar clase</DialogTitle></DialogHeader>
                        {classFormFields}
                        <DialogFooter>
                          <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                          <DialogClose render={<Button onClick={handleUpdateClass} disabled={!classForm.teacherId || (!selectedCycleIsCycle2 && !classForm.subjectId)}>Guardar</Button>} />
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="xs" className="gap-1" onClick={() => handleDeleteClass(cls.id)}><Trash2 className="size-3" />Eliminar</Button>
                  </div>
                </CardContent>
              </Card>
          );
        })}
      </div>
      )}
    </motion.div>
    </RouteGuard>
  );
}
