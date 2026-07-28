"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Attachment } from "@/types";
import { useStore } from "@/hooks/use-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import StatusBadge, { getLatestSubmission, getSubmissionsForStudent, getSubmissionStatus } from "@/components/shared/status-badge";
import { ArrowLeft, Upload, Download, Send, Star, MessageCircle, Paperclip, Clock, CalendarClock, FileEdit, RefreshCw, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssignmentDetailProps {
  assignmentId: string;
  onBack: () => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatTimeAgo(dateStr: string) {
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

export default function AssignmentDetail({ assignmentId, onBack }: AssignmentDetailProps) {
  const {
    user, assignments, getUserName, getStudentSubmission, getStudentSubmissions,
    getStudentsInClass, getClassById, submitAssignment, gradeSubmission,
    requestCorrections, addCommentToSubmission,
  } = useStore();
  const assignment = assignments.find((a) => a.id === assignmentId);
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  const [submitContent, setSubmitContent] = useState("");
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const submitFileRef = useRef<HTMLInputElement>(null);

  const [commentText, setCommentText] = useState("");

  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);

  const [correctionFeedback, setCorrectionFeedback] = useState("");
  const [correctionSubId, setCorrectionSubId] = useState<string | null>(null);

  const [viewHistory, setViewHistory] = useState(false);

  async function uploadFile(file: File): Promise<Attachment | null> {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      return await res.json();
    } catch { return null; }
  }

  if (!assignment) {
    return <div className="p-6 text-center text-muted-foreground">Tarea no encontrada.</div>;
  }

  const cls = getClassById(assignment.classId);
  const students = cls ? getStudentsInClass(cls.id) : [];
  const latestSubmission = isStudent ? getStudentSubmission(assignment.id, user!.id) : undefined;
  const allVersions = isStudent ? getStudentSubmissions(assignment.id, user!.id) : [];
  const isOverdue = new Date(assignment.dueDate) < new Date();
  const status = assignment ? getSubmissionStatus(assignment, user!.id) : "pendiente";
  const hasGrade = latestSubmission?.grade != null;
  const needsCorrections = latestSubmission?.correctionsRequest != null;

  async function handleSubmit() {
    if (!assignment || !submitContent.trim()) return;
    const attachments: Attachment[] = [];
    if (submitFile) {
      const uploaded = await uploadFile(submitFile);
      if (uploaded) attachments.push(uploaded);
    }
    submitAssignment(assignment.id, submitContent, attachments);
    setSubmitContent("");
    setSubmitFile(null);
  }

  function handleGrade() {
    if (!assignment || !gradingSubId || !gradeScore) return;
    gradeSubmission(assignment.id, gradingSubId, Number(gradeScore), gradeFeedback);
    setGradingSubId(null); setGradeScore(""); setGradeFeedback("");
  }

  function handleRequestCorrections() {
    if (!assignment || !correctionSubId || !correctionFeedback.trim()) return;
    requestCorrections(assignment.id, correctionSubId, correctionFeedback);
    setCorrectionSubId(null); setCorrectionFeedback("");
  }

  function handleAddComment(submissionId: string) {
    if (!assignment || !commentText.trim()) return;
    addCommentToSubmission(assignment.id, submissionId, commentText);
    setCommentText("");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="size-4" /> Volver
      </Button>

      <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
        <Card className="overflow-hidden shadow-md">
          <div className={cn("h-1.5 w-full", isOverdue ? "bg-red-500" : "bg-primary")} />
          <CardContent className="space-y-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">{assignment.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{cls?.name} &middot; {assignment.points} pts</p>
              </div>
              <Badge variant={isOverdue ? "destructive" : "outline"} className="flex items-center gap-1.5 shrink-0">
                <CalendarClock className="size-3" /> {formatDate(assignment.dueDate)}
              </Badge>
            </div>
            <Separator />
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{assignment.description}</p>
            {assignment.attachments.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Archivos adjuntos</p>
                <div className="flex flex-wrap gap-2">
                  {assignment.attachments.map((att, i) => (
                    <a key={i} href={att.url} download className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground">
                      <Download className="size-3" /> <span className="truncate max-w-[120px]">{att.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {isStudent && (
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <Card className="shadow-sm">
            <CardContent className="space-y-4 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Mi Entrega</h3>
                <StatusBadge status={status} />
              </div>

              {hasGrade ? (
                /* CALIFICADA: show grade, no more submissions */
                <div className="space-y-4">
                  <div className="rounded-xl border bg-gradient-to-r from-emerald-50 to-green-50 p-4 dark:from-emerald-950/20 dark:to-green-950/20">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Star className="size-4 text-emerald-500" />
                      Calificación: {latestSubmission!.grade!.score}/{assignment.points}
                    </div>
                    {latestSubmission!.grade!.feedback && (
                      <p className="mt-1.5 text-sm text-muted-foreground">{latestSubmission!.grade!.feedback}</p>
                    )}
                  </div>

                  {allVersions.length > 0 && (
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setViewHistory(!viewHistory)}>
                        <History className="size-3.5" />
                        {viewHistory ? "Ocultar historial" : `Ver historial (${allVersions.length} versión${allVersions.length !== 1 ? "es" : ""})`}
                      </Button>
                      <AnimatePresence>
                        {viewHistory && allVersions.map((v, i) => (
                          <motion.div key={v.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                            className="overflow-hidden rounded-lg border bg-card/50 p-3 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <RefreshCw className="size-3" />
                              <span className="font-semibold text-foreground">Versión {v.version}</span>
                              <span>&middot;</span>
                              <span>{formatDateTime(v.submittedAt)}</span>
                              {v.grade && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">{v.grade.score}/{assignment.points}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{v.content}</p>
                            {v.attachments.map((att, j) => (
                              <a key={j} href={att.url} download className="inline-flex items-center gap-1 rounded border bg-muted/30 px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                                <Paperclip className="size-3" /> {att.name}
                              </a>
                            ))}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              ) : needsCorrections ? (
                /* REQUIERE CORRECCIONES: show corrections + new version button */
                <div className="space-y-4">
                  <div className="rounded-xl border bg-gradient-to-r from-orange-50 to-amber-50 p-4 dark:from-orange-950/20 dark:to-amber-950/20">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FileEdit className="size-4 text-orange-500" />
                      El profesor solicitó correcciones
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {latestSubmission!.correctionsRequest!.feedback}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      {formatDateTime(latestSubmission!.correctionsRequest!.requestedAt)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Textarea placeholder="Escribe tu respuesta con las correcciones..." value={submitContent}
                      onChange={(e) => setSubmitContent(e.target.value)} rows={4} className="resize-none" />
                    <div className="flex items-center gap-2">
                      <input type="file" ref={submitFileRef} className="hidden"
                        onChange={(e) => setSubmitFile(e.target.files?.[0] || null)} />
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => submitFileRef.current?.click()}>
                        <Upload className="size-3.5" />
                        {submitFile ? submitFile.name : "Adjuntar archivo"}
                      </Button>
                    </div>
                    {submitFile && (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                        <Paperclip className="size-3" /> {submitFile.name}
                      </div>
                    )}
                    <Button onClick={handleSubmit} className="gap-1.5" disabled={!submitContent.trim()}>
                      <RefreshCw className="size-3.5" /> Subir nueva versión
                    </Button>
                  </div>

                  {allVersions.length > 0 && (
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setViewHistory(!viewHistory)}>
                        <History className="size-3.5" />
                        {viewHistory ? "Ocultar historial" : `Ver historial (${allVersions.length} versión${allVersions.length !== 1 ? "es" : ""})`}
                      </Button>
                      <AnimatePresence>
                        {viewHistory && allVersions.slice().reverse().map((v, i) => (
                          <motion.div key={v.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                            className="overflow-hidden rounded-lg border bg-card/50 p-3 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <RefreshCw className="size-3" />
                              <span className="font-semibold text-foreground">Versión {v.version}</span>
                              <span>&middot;</span>
                              <span>{formatDateTime(v.submittedAt)}</span>
                              {v.correctionsRequest && <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">Correcciones solicitadas</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{v.content}</p>
                            {v.attachments.map((att, j) => (
                              <a key={j} href={att.url} download className="inline-flex items-center gap-1 rounded border bg-muted/30 px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                                <Paperclip className="size-3" /> {att.name}
                              </a>
                            ))}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              ) : latestSubmission ? (
                /* ENTREGADA / REENVIADA: show submission info */
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="size-3" /> Entregada
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(latestSubmission.submittedAt)}</span>
                    <span className="text-xs text-muted-foreground">(v{latestSubmission.version})</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{latestSubmission.content}</p>
                  {latestSubmission.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {latestSubmission.attachments.map((att, i) => (
                        <a key={i} href={att.url} download className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground">
                          <Download className="size-3" /> <span className="truncate max-w-[100px]">{att.name}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">Comentarios del profesor</p>
                    {latestSubmission.comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin comentarios.</p>
                    ) : (
                      latestSubmission.comments.map((c) => (
                        <div key={c.id} className="flex gap-2">
                          <Avatar className="mt-0.5 size-6 ring-1 ring-border">
                            <AvatarFallback className="text-[9px]">{getUserName(c.authorId).charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2">
                            <p className="text-xs font-semibold text-foreground">{getUserName(c.authorId)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{c.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* PENDIENTE: submission form */
                <div className="space-y-4">
                  <Textarea placeholder="Escribe tu respuesta..." value={submitContent}
                    onChange={(e) => setSubmitContent(e.target.value)} rows={4} className="resize-none" />
                  <div className="flex items-center gap-2">
                    <input type="file" ref={submitFileRef} className="hidden"
                      onChange={(e) => setSubmitFile(e.target.files?.[0] || null)} />
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => submitFileRef.current?.click()}>
                      <Upload className="size-3.5" />
                      {submitFile ? submitFile.name : "Adjuntar archivo"}
                    </Button>
                  </div>
                  {submitFile && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                      <Paperclip className="size-3" /> {submitFile.name}
                    </div>
                  )}
                  <Button onClick={handleSubmit} className="gap-1.5" disabled={!submitContent.trim()}>
                    <Send className="size-3.5" /> Entregar tarea
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isTeacher && (
        <Card className="shadow-sm">
          <CardContent className="space-y-4 py-5">
            <h3 className="text-sm font-semibold text-foreground">
              Entregas ({assignment.submissions.length} de {students.length} estudiantes)
            </h3>
            {assignment.submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay entregas aún.</p>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const groupedByStudent: Record<string, typeof assignment.submissions> = {};
                  for (const sub of assignment.submissions) {
                    if (!groupedByStudent[sub.studentId]) groupedByStudent[sub.studentId] = [];
                    groupedByStudent[sub.studentId].push(sub);
                  }
                  return Object.entries(groupedByStudent).map(([studentId, subs]) => {
                    const sortedSubs = subs.sort((a, b) => a.version - b.version);
                    const latest = sortedSubs[sortedSubs.length - 1];
                    const studentName = getUserName(studentId);
                    const isGraded = latest.grade != null;
                    const hasCorrections = latest.correctionsRequest != null;
                    return (
                      <motion.div
                        key={studentId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border bg-card p-4 space-y-3 transition-all hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 ring-2 ring-border">
                              <AvatarFallback className="text-xs">{studentName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{studentName}</p>
                              <p className="text-xs text-muted-foreground">
                                {sortedSubs.length} versión{sortedSubs.length !== 1 ? "es" : ""} &middot; Última: {formatDateTime(latest.submittedAt)}
                              </p>
                            </div>
                          </div>
                          {isGraded ? (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 shrink-0">
                              {latest.grade!.score}/{assignment.points}
                            </Badge>
                          ) : hasCorrections ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 shrink-0">
                              Correcciones
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 shrink-0">
                              Pendiente
                            </Badge>
                          )}
                        </div>

                        {sortedSubs.map((sub, idx) => (
                          <div key={sub.id} className={cn(
                            "rounded-lg border p-3 space-y-2 transition-colors",
                            sub.correctionsRequest ? "border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/10" : "bg-muted/20",
                          )}>
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-xs font-medium",
                                sub.correctionsRequest ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                              )}>
                                <RefreshCw className="size-3.5" />
                                Versión {sub.version}
                                <span className="text-muted-foreground/60">&middot; {formatDateTime(sub.submittedAt)}</span>
                              </span>
                              {sub.grade && (
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  {sub.grade.score}/{assignment.points}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{sub.content}</p>
                            {sub.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {sub.attachments.map((att, j) => (
                                  <a key={j} href={att.url} download className="inline-flex items-center gap-1 rounded border bg-muted/50 px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                                    <Download className="size-3" /> {att.name}
                                  </a>
                                ))}
                              </div>
                            )}
                            {sub.correctionsRequest && (
                              <div className="rounded-md bg-orange-100/50 dark:bg-orange-950/20 px-2.5 py-2 text-xs">
                                <span className="font-semibold text-orange-700 dark:text-orange-400">Correcciones solicitadas:</span>
                                <p className="mt-0.5 text-muted-foreground">{sub.correctionsRequest.feedback}</p>
                              </div>
                            )}
                          </div>
                        ))}

                        {!isGraded && (
                          <div className="flex gap-2 pt-1">
                            <Dialog>
                              <DialogTrigger render={
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                                  setGradingSubId(latest.id);
                                  setGradeScore(latest.grade?.score?.toString() || "");
                                  setGradeFeedback(latest.grade?.feedback || "");
                                }}>
                                  <Star className="size-3" /> Calificar
                                </Button>
                              } />
                              <DialogContent className="sm:max-w-sm">
                                <DialogHeader><DialogTitle>Calificar - {studentName}</DialogTitle></DialogHeader>
                                <div className="space-y-3 py-2">
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Puntaje (máx. {assignment.points})</label>
                                    <Input type="number" max={assignment.points} value={gradeScore}
                                      onChange={(e) => setGradeScore(e.target.value)} placeholder="0" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Retroalimentación</label>
                                    <Textarea value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)}
                                      placeholder="Escribe tu retroalimentación..." rows={3} />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                                  <DialogClose render={<Button onClick={handleGrade} disabled={!gradeScore}>
                                    <Star className="size-3.5" /> Guardar calificación
                                  </Button>} />
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Dialog>
                              <DialogTrigger render={
                                <Button size="sm" variant="outline" className="gap-1 text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950/30"
                                  onClick={() => { setCorrectionSubId(latest.id); setCorrectionFeedback(""); }}>
                                  <FileEdit className="size-3" /> Solicitar corrección
                                </Button>
                              } />
                              <DialogContent className="sm:max-w-sm">
                                <DialogHeader><DialogTitle>Solicitar correcciones - {studentName}</DialogTitle></DialogHeader>
                                <div className="space-y-3 py-2">
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Observaciones</label>
                                    <Textarea value={correctionFeedback} onChange={(e) => setCorrectionFeedback(e.target.value)}
                                      placeholder="Describe qué debe corregir el estudiante..." rows={4} />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <DialogClose render={<Button variant="outline">Cancelar</Button>} />
                                  <DialogClose render={<Button onClick={handleRequestCorrections} disabled={!correctionFeedback.trim()}>
                                    <FileEdit className="size-3.5" /> Solicitar corrección
                                  </Button>} />
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <Input placeholder="Añadir comentario..." value={commentText}
                            onChange={(e) => setCommentText(e.target.value)} className="h-8 text-xs flex-1" />
                          <Button size="sm" variant="outline" onClick={() => handleAddComment(latest.id)} disabled={!commentText.trim()}>
                            <Send className="size-3" />
                          </Button>
                        </div>
                        {latest.comments.length > 0 && (
                          <div className="space-y-1.5 pl-2">
                            {latest.comments.map((c) => (
                              <div key={c.id} className="flex gap-2">
                                <Avatar className="mt-0.5 size-5">
                                  <AvatarFallback className="text-[9px]">{getUserName(c.authorId).charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 rounded-xl bg-muted/50 px-2.5 py-1">
                                  <p className="text-xs font-semibold text-foreground">{getUserName(c.authorId)}</p>
                                  <p className="text-xs text-muted-foreground">{c.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
