"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Pencil, Trash2, UserPlus, Users, GraduationCap, AtSign } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { getUserDisplayName, getUserInitials } from "@/lib/domain";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import EmptyState from "@/components/shared/empty-state";
import PageHeader from "@/components/shared/page-header";

const emptyForm = {
  username: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  documentType: "",
  documentNumber: "",
  phone: "",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "teachers";
  const { user, getTeachers, getStudents, addUser, updateUser, deleteUser } = useStore();
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState(emptyForm);

  if (!user || user.role !== "admin") {
    router.push("/dashboard");
    return null;
  }

  const teachers = getTeachers();
  const students = getStudents();
  const currentUsers = tab === "teachers" ? teachers : students;
  const roleKey = tab === "teachers" ? "teacher" : "student";
  const roleLabel = tab === "teachers" ? "Profesores" : "Estudiantes";

  function resetForm() {
    setEditUserId(null);
    setUserForm(emptyForm);
  }

  async function handleCreateUser() {
    if (!userForm.username.trim() || !userForm.firstName.trim() || !userForm.password.trim()) return;
    const created = await addUser({ ...userForm, role: roleKey });
    if (!created) {
      alert("El usuario ya existe.");
      return;
    }
    resetForm();
  }

  async function handleUpdateUser() {
    if (!editUserId || !userForm.username.trim() || !userForm.firstName.trim()) return;
    await updateUser(editUserId, userForm);
    resetForm();
  }

  function openEdit(selectedUser: typeof currentUsers[number]) {
    setEditUserId(selectedUser.id);
    setUserForm({
      username: selectedUser.username,
      firstName: selectedUser.firstName,
      lastName: selectedUser.lastName,
      email: selectedUser.email || "",
      password: selectedUser.password || "",
      documentType: selectedUser.documentType || "",
      documentNumber: selectedUser.documentNumber || "",
      phone: selectedUser.phone || "",
    });
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Eliminar usuario?")) return;
    const deleted = await deleteUser(userId);
    if (!deleted) alert("No se puede eliminar un usuario con historial.");
  }

  const form = (
    <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
      <Input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} placeholder="Usuario" />
      <Input value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Contrasena temporal" type="password" />
      <Input value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} placeholder="Nombres" />
      <Input value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} placeholder="Apellidos" />
      <Input value={userForm.documentType} onChange={(e) => setUserForm({ ...userForm, documentType: e.target.value })} placeholder="Tipo documento" />
      <Input value={userForm.documentNumber} onChange={(e) => setUserForm({ ...userForm, documentNumber: e.target.value })} placeholder="Numero documento" />
      <Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} placeholder="Telefono" />
      <Input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="Correo opcional" type="email" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        icon={tab === "teachers" ? GraduationCap : Users}
        title={`Administrar ${roleLabel}`}
        description={`${currentUsers.length} registrados`}
        action={
          <Dialog>
            <DialogTrigger render={<Button size="sm" className="gap-1.5" onClick={resetForm}><UserPlus className="size-3.5" />Agregar</Button>} />
            <DialogContent className="sm:max-w-xl">
              <DialogHeader><DialogTitle>Agregar {roleKey === "teacher" ? "profesor" : "estudiante"}</DialogTitle></DialogHeader>
              {form}
              <DialogFooter>
                <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                <DialogClose render={<Button onClick={handleCreateUser} disabled={!userForm.username.trim() || !userForm.firstName.trim() || !userForm.password.trim()}>Agregar</Button>} />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex gap-2">
        <Button variant={tab === "teachers" ? "default" : "outline"} size="sm" onClick={() => router.push("/admin/users?tab=teachers")} className="gap-1.5 rounded-full">
          <GraduationCap className="size-3.5" /> Profesores <Badge variant="secondary">{teachers.length}</Badge>
        </Button>
        <Button variant={tab === "students" ? "default" : "outline"} size="sm" onClick={() => router.push("/admin/users?tab=students")} className="gap-1.5 rounded-full">
          <Users className="size-3.5" /> Estudiantes <Badge variant="secondary">{students.length}</Badge>
        </Button>
      </div>

      {currentUsers.length === 0 ? (
        <EmptyState icon={tab === "teachers" ? GraduationCap : Users} title={`No hay ${roleLabel.toLowerCase()}`} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currentUsers.map((currentUser) => (
            <Card key={currentUser.id} className="rounded-xl border shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
              <CardContent className="flex items-center gap-3 py-4">
                <Avatar className="size-11 ring-2 ring-primary/10">
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-sm font-bold text-white">
                    {getUserInitials(currentUser)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{getUserDisplayName(currentUser)}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><AtSign className="size-3" />{currentUser.username}</p>
                  {currentUser.email && <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Mail className="size-3" />{currentUser.email}</p>}
                </div>
                <div className="flex gap-1">
                  <Dialog>
                    <DialogTrigger render={<Button variant="ghost" size="icon-xs" onClick={() => openEdit(currentUser)}><Pencil className="size-3" /></Button>} />
                    <DialogContent className="sm:max-w-xl">
                      <DialogHeader><DialogTitle>Editar usuario</DialogTitle></DialogHeader>
                      {form}
                      <DialogFooter>
                        <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                        <DialogClose render={<Button onClick={handleUpdateUser} disabled={!userForm.username.trim() || !userForm.firstName.trim()}>Guardar</Button>} />
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon-xs" className="text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDeleteUser(currentUser.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
