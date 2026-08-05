"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, use, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInCalendarDays, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
import type { Attachment } from "@/types";
import { useStore } from "@/hooks/use-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Calendar from "@/components/ui/calendar";
import TimePicker from "@/components/ui/time-picker";
import PostCard from "@/features/posts/post-card";
import AssignmentCard from "@/features/assignments/assignment-card";
import AssignmentDetail from "@/features/assignments/assignment-detail";
import EmptyState from "@/components/shared/empty-state";
import RouteGuard from "@/components/auth/route-guard";
import { classAveragePercent, gradedScoresByAssignment } from "@/lib/grading";
import { GRADIENT_COLORS } from "@/components/shared/gradient-card";
import { getUserDisplayName, getUserInitials, isAssignmentPublished } from "@/lib/domain";
import { getAttachmentDownloadUrl } from "@/lib/attachments";
import {
  Plus, UserCheck, FileText, BarChart3, Upload, Send, ArrowLeft,
  CalendarClock, MessageCircle, Paperclip, BookOpen,
  CalendarDays, Clock, Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PostWithComments({ post }: { post: { id: string; authorId: string; content: string; attachments: Attachment[]; createdAt: string; comments: { id: string; authorId: string; content: string; createdAt: string }[] } }) {
  const { getUserName, addCommentToPost, user } = useStore();
  const [commentText, setCommentText] = useState("");
  const authorName = getUserName(post.authorId);
  const initial = authorName.charAt(0).toUpperCase();

  async function handleAddComment() {
    if (!commentText.trim()) return;
    await addCommentToPost(post.id, commentText);
    setCommentText("");
  }

  function timeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diff < 1) return "Ahora";
    if (diff < 60) return `Hace ${diff} min`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Hace ${hours}h`;
    if (hours < 48) return "Ayer";
    return formatDate(dateStr);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="group rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20">
        <div className="flex items-start gap-3">
          <Avatar className="size-9 ring-2 ring-primary/10">
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{authorName}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>
            {post.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.attachments.map((att, i) => (
                  <a key={i} href={getAttachmentDownloadUrl(att)} download className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground">
                    <Paperclip className="size-3" />
                    <span className="truncate max-w-[100px]">{att.name}</span>
                  </a>
                ))}
              </div>
            )}
            {post.comments.length > 0 && (
              <div className="mt-4 space-y-3 border-t pt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageCircle className="size-3.5" />
                  <span>{post.comments.length} comentario{post.comments.length !== 1 ? "s" : ""}</span>
                </div>
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="mt-0.5 size-6 ring-1 ring-border">
                      <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                        {getUserName(comment.authorId).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {getUserName(comment.authorId)}
                        </span>
                        <span className="text-2xs text-muted-foreground">
                          {timeAgo(comment.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2 border-t pt-3">
              <Avatar className="mt-0.5 size-6 ring-1 ring-border">
                <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                  {getUserInitials(user) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 gap-2">
                <Input
                  placeholder="Escribe un comentario..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="h-9 text-sm"
                />
                <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()}>
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const {
    user,
    getClassById,
    getTeacherForClass,
    getStudentsInClass,
    getPostsForClass,
    getAssignmentsForClass,
    getUserName,
    addPost,
    addAssignment,
  } = useStore();

  const [activeTab, setActiveTab] = useState("muro");
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [postContent, setPostContent] = useState("");
  const [postFile, setPostFile] = useState<File | null>(null);
  const postFileRef = useRef<HTMLInputElement>(null);

  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
  const [newAssignmentDesc, setNewAssignmentDesc] = useState("");
  const [newAssignmentPoints, setNewAssignmentPoints] = useState("100");
  const [newAssignmentDueDate, setNewAssignmentDueDate] = useState<Date | null>(null);
  const [newAssignmentDueTime, setNewAssignmentDueTime] = useState("23:59");
  const [newAssignmentFile, setNewAssignmentFile] = useState<File | null>(null);
  const assignmentFileRef = useRef<HTMLInputElement>(null);

  const [newAssignmentPublishDate, setNewAssignmentPublishDate] = useState(new Date());
  const [newAssignmentPublishTime, setNewAssignmentPublishTime] = useState(() => {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, "0")}:${n.getMinutes().toString().padStart(2, "0")}`;
  });

  const remainingText = useMemo(() => {
    if (!newAssignmentDueDate) return null;
    const [h, m] = newAssignmentDueTime.split(":").map(Number);
    const due = new Date(newAssignmentDueDate);
    due.setHours(h, m, 0, 0);
    const now = new Date();
    if (due <= now) return "Ya vencida";
    const days = differenceInCalendarDays(due, now);
    const hours = differenceInHours(due, now) % 24;
    if (days > 0) return `${days} día${days > 1 ? "s" : ""} y ${hours} hora${hours !== 1 ? "s" : ""}`;
    return `${hours} hora${hours !== 1 ? "s" : ""}`;
  }, [newAssignmentDueDate, newAssignmentDueTime]);

  const cls = getClassById(id);
  const teacher = cls ? getTeacherForClass(cls.id) : undefined;
  const students = cls ? getStudentsInClass(cls.id) : [];
  const posts = cls ? getPostsForClass(cls.id) : [];
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const assignments = cls
    ? getAssignmentsForClass(cls.id).filter((a) => (isStudent ? isAssignmentPublished(a.publishAt) : true))
    : [];

  const colorIndex = cls ? parseInt(cls.id.replace("class-", ""), 10) - 1 : 0;

  async function uploadFile(file: File): Promise<Attachment | null> {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      return await res.json();
    } catch {
      return null;
    }
  }

  async function handleCreatePost() {
    if (!cls || !postContent.trim()) return;
    const attachments: Attachment[] = [];
    if (postFile) {
      const uploaded = await uploadFile(postFile);
      if (uploaded) attachments.push(uploaded);
    }
    await addPost(cls.id, postContent, attachments);
    setPostContent("");
    setPostFile(null);
  }

  async function handleCreateAssignment() {
    if (!cls || !newAssignmentTitle.trim() || !newAssignmentDueDate) return;
    const attachments: Attachment[] = [];
    if (newAssignmentFile) {
      const uploaded = await uploadFile(newAssignmentFile);
      if (uploaded) attachments.push(uploaded);
    }
    const [hours, minutes] = newAssignmentDueTime.split(":").map(Number);
    const dueDate = new Date(newAssignmentDueDate);
    dueDate.setHours(hours, minutes, 0, 0);
    const [ph, pm] = newAssignmentPublishTime.split(":").map(Number);
    const publishAt = new Date(newAssignmentPublishDate);
    publishAt.setHours(ph, pm, 0, 0);
    addAssignment({
      classId: cls.id,
      title: newAssignmentTitle,
      description: newAssignmentDesc,
      points: Number(newAssignmentPoints) || 100,
      dueDate: dueDate.toISOString(),
      publishAt: publishAt.toISOString(),
      attachments,
    });
    setNewAssignmentTitle("");
    setNewAssignmentDesc("");
    setNewAssignmentPoints("100");
    setNewAssignmentDueDate(null);
    setNewAssignmentDueTime("23:59");
    setNewAssignmentFile(null);
    setNewAssignmentPublishDate(new Date());
    const n = new Date();
    setNewAssignmentPublishTime(`${n.getHours().toString().padStart(2, "0")}:${n.getMinutes().toString().padStart(2, "0")}`);
  }

  const allGrades = cls ? assignments.map((a) => ({
    assignment: a,
    grades: students.map((s) => {
      const graded = a.submissions
        .filter((sub) => sub.studentId === s.id && sub.grade)
        .sort((x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime());
      return { student: s, score: graded[0]?.grade?.score ?? null, maxScore: a.points };
    }),
  })) : [];

  return (
    <RouteGuard allow={["student", "teacher"]}>
      {!cls ? (
        <div className="flex items-center justify-center py-20">
          <EmptyState
            icon={BookOpen}
            title="Clase no encontrada"
            description="La clase que buscas no existe o ha sido eliminada"
            action={<Button variant="outline" onClick={() => router.push("/classes")}>Volver a clases</Button>}
          />
        </div>
      ) : selectedAssignment ? (
        <div className="mx-auto max-w-4xl p-6">
          <AssignmentDetail
            assignmentId={selectedAssignment}
            onBack={() => setSelectedAssignment(null)}
          />
        </div>
      ) : (
      <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-5xl space-y-8 p-6"
      >
        <div
          className="overflow-hidden rounded-xl px-6 py-8 text-white shadow-lg"
          style={{ background: GRADIENT_COLORS[Math.max(0, colorIndex) % GRADIENT_COLORS.length] }}
        >
          <div className="relative z-10">
            <h1 className="text-2xl font-bold tracking-tight">{cls.name}</h1>
            {cls.section && <p className="mt-1 text-sm text-white/80">{cls.section}</p>}
            {cls.description && <p className="mt-2 max-w-2xl text-sm text-white/70">{cls.description}</p>}
            <div className="mt-3 flex items-center gap-3 text-xs text-white/60">
              <span>{getUserDisplayName(teacher)}</span>
              <span>&middot;</span>
              <span>{students.length} estudiante{students.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="line">
            <TabsTrigger value="muro">Muro</TabsTrigger>
            <TabsTrigger value="tareas">
              <FileText className="size-3.5" />
              Trabajo en clase
            </TabsTrigger>
            <TabsTrigger value="personas">
              <UserCheck className="size-3.5" />
              Personas
            </TabsTrigger>
            {isTeacher && (
              <TabsTrigger value="calificaciones">
                <BarChart3 className="size-3.5" />
                Calificaciones
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="muro" className="space-y-4 pt-4">
            {isTeacher && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
              >
                <p className="text-sm text-muted-foreground">
                  {posts.length} publicacion{posts.length !== 1 ? "es" : ""}
                </p>
                <Dialog>
                  <DialogTrigger render={
                    <Button size="sm" className="gap-1.5" onClick={() => { setPostContent(""); setPostFile(null); }}>
                      <Plus className="size-3.5" />
                      Nueva publicación
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Nueva publicación</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Contenido</label>
                        <Textarea
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          placeholder="Anuncia algo a tu clase..."
                          rows={4}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Archivo adjunto</label>
                        <input type="file" ref={postFileRef} className="hidden" onChange={(e) => setPostFile(e.target.files?.[0] || null)} />
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => postFileRef.current?.click()}>
                          <Upload className="size-3.5" />
                          {postFile ? postFile.name : "Adjuntar archivo"}
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                      <DialogClose render={<Button onClick={handleCreatePost} disabled={!postContent.trim()}>
                          <Plus className="size-3.5" />
                          Publicar
                        </Button>} />
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </motion.div>
            )}

            {posts.map((post) => (
              <PostWithComments key={post.id} post={post} />
            ))}

            {assignments.map((assignment, i) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                classId={cls.id}
                onClick={() => setSelectedAssignment(assignment.id)}
                index={i}
              />
            ))}

            {posts.length === 0 && assignments.length === 0 && (
              <EmptyState
                icon={BookOpen}
                title="No hay publicaciones ni tareas"
                description={isTeacher ? "Crea tu primera publicación o tarea para comenzar" : "Tu profesor aún no ha publicado nada"}
                action={isTeacher ? (
                  <Button size="sm" className="gap-1.5" onClick={() => setActiveTab("tareas")}>
                    <FileText className="size-3.5" />
                    Crear tarea
                  </Button>
                ) : undefined}
              />
            )}
          </TabsContent>

          <TabsContent value="tareas" className="space-y-4 pt-4">
            {isTeacher && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {assignments.length} tarea{assignments.length !== 1 ? "s" : ""}
                </p>
                <Dialog>
                  <DialogTrigger render={<Button size="sm" className="gap-1.5">
                      <Plus className="size-3.5" />
                      Crear tarea
                    </Button>} />
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Crear Tarea</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Título</label>
                        <Input value={newAssignmentTitle} onChange={(e) => setNewAssignmentTitle(e.target.value)} placeholder="Título de la tarea" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
                        <Textarea value={newAssignmentDesc} onChange={(e) => setNewAssignmentDesc(e.target.value)} placeholder="Descripción de la tarea..." rows={3} />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Puntos</label>
                          <Input type="number" value={newAssignmentPoints} onChange={(e) => setNewAssignmentPoints(e.target.value)} />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Fecha límite</label>
                          <Popover>
                            <PopoverTrigger
                              render={
                                <Button variant="outline" className="w-full justify-start gap-2 text-left font-normal">
                                  <CalendarDays className="size-4 shrink-0" />
                                  <span className={!newAssignmentDueDate ? "text-muted-foreground" : ""}>
                                    {newAssignmentDueDate ? format(newAssignmentDueDate, "d 'de' MMM", { locale: es }) : "Seleccionar"}
                                  </span>
                                </Button>
                              }
                            />
                            <PopoverContent className="w-auto p-3" align="start">
                              <Calendar selected={newAssignmentDueDate} onSelect={(d) => setNewAssignmentDueDate(d)} minDate={new Date()} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Hora límite</label>
                        <TimePicker value={newAssignmentDueTime} onChange={setNewAssignmentDueTime} />
                      </div>

                      {newAssignmentDueDate && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="overflow-hidden rounded-xl border bg-muted/30 p-3"
                        >
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen</p>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="size-4 text-primary" />
                              <span className="text-foreground">Límite: <strong>{format(newAssignmentDueDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="size-4 text-primary" />
                              <span className="text-foreground">Hora: <strong>{newAssignmentDueTime}</strong></span>
                            </div>
                            {remainingText && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Timer className="size-4" />
                                <span>Tiempo restante: {remainingText}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Archivo adjunto</label>
                        <input type="file" ref={assignmentFileRef} className="hidden" onChange={(e) => setNewAssignmentFile(e.target.files?.[0] || null)} />
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => assignmentFileRef.current?.click()}>
                          <Upload className="size-3.5" />
                          {newAssignmentFile ? newAssignmentFile.name : "Adjuntar archivo"}
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                      <DialogClose render={<Button onClick={handleCreateAssignment} disabled={!newAssignmentTitle.trim() || !newAssignmentDueDate}>
                          Crear tarea
                        </Button>} />
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {assignments.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No hay tareas en esta clase"
                description={isTeacher ? "Crea tu primera tarea" : "El profesor aún no ha creado tareas"}
                action={isTeacher ? (
                  <Dialog>
                    <DialogTrigger render={<Button size="sm" className="gap-1.5" onClick={() => { setNewAssignmentTitle(""); setNewAssignmentDesc(""); setNewAssignmentPoints("100"); setNewAssignmentDueDate(null); setNewAssignmentDueTime("23:59"); setNewAssignmentFile(null); }}>
                        <Plus className="size-3.5" />
                        Crear tarea
                      </Button>} />
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Crear Tarea</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Título</label>
                          <Input value={newAssignmentTitle} onChange={(e) => setNewAssignmentTitle(e.target.value)} placeholder="Título de la tarea" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Descripción</label>
                          <Textarea value={newAssignmentDesc} onChange={(e) => setNewAssignmentDesc(e.target.value)} placeholder="Descripción de la tarea..." rows={3} />
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Puntos</label>
                            <Input type="number" value={newAssignmentPoints} onChange={(e) => setNewAssignmentPoints(e.target.value)} />
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Fecha límite</label>
                            <Popover>
                              <PopoverTrigger render={
                                <Button variant="outline" className="w-full justify-start gap-2 text-left font-normal">
                                  <CalendarDays className="size-4 shrink-0" />
                                  <span className={!newAssignmentDueDate ? "text-muted-foreground" : ""}>
                                    {newAssignmentDueDate ? format(newAssignmentDueDate, "d 'de' MMM", { locale: es }) : "Seleccionar"}
                                  </span>
                                </Button>
                              } />
                              <PopoverContent className="w-auto p-3" align="start">
                                <Calendar selected={newAssignmentDueDate} onSelect={(d) => setNewAssignmentDueDate(d)} minDate={new Date()} />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Hora límite</label>
                          <TimePicker value={newAssignmentDueTime} onChange={setNewAssignmentDueTime} />
                        </div>
                        {newAssignmentDueDate && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="overflow-hidden rounded-xl border bg-muted/30 p-3"
                          >
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen</p>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="size-4 text-primary" />
                                <span className="text-foreground">Límite: <strong>{format(newAssignmentDueDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="size-4 text-primary" />
                                <span className="text-foreground">Hora: <strong>{newAssignmentDueTime}</strong></span>
                              </div>
                              {remainingText && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Timer className="size-4" />
                                  <span>Tiempo restante: {remainingText}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Archivo adjunto</label>
                          <input type="file" ref={assignmentFileRef} className="hidden" onChange={(e) => setNewAssignmentFile(e.target.files?.[0] || null)} />
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => assignmentFileRef.current?.click()}>
                            <Upload className="size-3.5" />
                            {newAssignmentFile ? newAssignmentFile.name : "Adjuntar archivo"}
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                        <DialogClose render={<Button onClick={handleCreateAssignment} disabled={!newAssignmentTitle.trim() || !newAssignmentDueDate}>
                            Crear tarea
                          </Button>} />
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : undefined}
              />
            ) : (
              assignments.map((assignment, i) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  classId={cls.id}
                  onClick={() => setSelectedAssignment(assignment.id)}
                  index={i}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="personas" className="space-y-6 pt-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Profesor</h3>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md">
                  <Avatar className="size-10 ring-2 ring-primary/10">
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                      {getUserInitials(teacher) || "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{getUserDisplayName(teacher)}</p>
                    <p className="text-xs text-muted-foreground">Profesor</p>
                  </div>
                </div>
              </motion.div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Estudiantes ({students.length})
              </h3>
              {students.length === 0 ? (
                <EmptyState
                  icon={UserCheck}
                  title="No hay estudiantes inscritos"
                  description="Los estudiantes aparecerán aquí cuando sean asignados a la clase"
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {students.map((student) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -3 }}
                    >
                      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-all hover:shadow-md">
                        <Avatar className="size-12 ring-2 ring-border">
                          <AvatarFallback className="bg-muted text-sm text-foreground">
                            {getUserInitials(student)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-semibold text-foreground">{getUserDisplayName(student)}</p>
                        <p className="text-xs text-muted-foreground">@{student.username}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {isTeacher && (
            <TabsContent value="calificaciones" className="space-y-4 pt-4">
              {allGrades.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No hay calificaciones disponibles"
                  description="Las calificaciones aparecerán cuando los estudiantes entreguen tareas"
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Estudiante</th>
                        {allGrades.map(({ assignment }) => (
                          <th key={assignment.id} className="px-3 py-3 text-center font-medium text-foreground">
                            <div className="text-xs">{assignment.title}</div>
                            <div className="text-2xs text-muted-foreground">{assignment.points} pts</div>
                          </th>
                        ))}
                        <th className="px-3 py-3 text-center font-semibold text-foreground">Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const studentRows = gradedScoresByAssignment(assignments, cls.id, student.id);
                        const studentAvg = classAveragePercent(assignments, cls.id, student.id);
                        return (
                          <tr key={student.id} className="border-b last:border-b-0 transition-colors hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">{getUserDisplayName(student)}</td>
                            {allGrades.map(({ assignment }) => {
                              const row = studentRows.get(assignment.id);
                              return (
                                <td key={assignment.id} className="px-3 py-3 text-center">
                                  {row?.score != null ? (
                                    <span className={cn("font-semibold", row.score >= (row.maxScore * 0.7) ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                      {row.score}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">&mdash;</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-3 text-center font-semibold text-foreground">
                              {studentAvg != null ? (
                                <span className={cn(studentAvg >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                  {studentAvg}
                                </span>
                              ) : "\u2014"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
      </AnimatePresence>
      )}
    </RouteGuard>
  );
}
