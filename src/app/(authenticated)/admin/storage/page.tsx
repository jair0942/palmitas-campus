"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { HardDrive, ShieldCheck, ShieldOff, Timer, AlertTriangle, Clock, Database, RefreshCw } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/page-header";
import StatCard from "@/components/shared/stat-card";
import RouteGuard from "@/components/auth/route-guard";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface StatsResponse {
  totalFiles: number;
  totalBytes: number;
  expiringSoon: number;
  expiredPending: number;
  protectedCount: number;
  legacyCount: number;
  retentionDays: number;
  expiringSoonAssets: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
    expiresAt: string | null;
    protectedFromCleanup: boolean;
  }>;
  expiredAssets: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
    expiresAt: string | null;
    protectedFromCleanup: boolean;
  }>;
  lastRun: {
    startedAt: string;
    finishedAt: string | null;
    status: string;
    deletedFiles: number;
    bytesFreed: number;
  } | null;
}

const RETENTION_OPTIONS = [30, 60, 90, 180];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminStoragePage() {
  const { user, activeCampus } = useStore();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [retentionDays, setRetentionDays] = useState(90);
  const [saving, setSaving] = useState(false);

  const isGlobalAdmin = !!user && user.role === "admin" && !user.campusId;
  const campusId = user?.campusId || (isGlobalAdmin ? activeCampus?.id : null);
  const campusName = isGlobalAdmin ? activeCampus?.name : user?.campus?.name;

  const loadStats = useCallback(async () => {
    if (!campusId) return;
    setLoading(true);
    try {
      const headers = new Headers();
      if (isGlobalAdmin) headers.set("x-campus-id", campusId);
      const res = await fetch("/api/storage/stats", { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "No se pudieron cargar las estadísticas");
        return;
      }
      const data = (await res.json()) as StatsResponse;
      setStats(data);
      setRetentionDays(data.retentionDays);
    } catch {
      toast.error("Error al cargar las estadísticas de almacenamiento");
    } finally {
      setLoading(false);
    }
  }, [campusId, isGlobalAdmin]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  async function saveRetention() {
    if (!campusId) return;
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isGlobalAdmin) headers["x-campus-id"] = campusId;
      const res = await fetch("/api/storage/settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ retentionDays }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "No se pudo guardar");
        return;
      }
      toast.success(`Retención actualizada a ${retentionDays} días. Aplica a archivos nuevos.`);
      await loadStats();
    } catch {
      toast.error("Error al guardar la política de retención");
    } finally {
      setSaving(false);
    }
  }

  async function toggleProtect(assetId: string, protectedFromCleanup: boolean) {
    if (!campusId) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isGlobalAdmin) headers["x-campus-id"] = campusId;
      const res = await fetch(`/api/file-assets/${assetId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ protectedFromCleanup }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "No se pudo actualizar");
        return;
      }
      toast.success(protectedFromCleanup ? "Archivo conservado" : "Protección desactivada");
      await loadStats();
    } catch {
      toast.error("Error al actualizar el archivo");
    }
  }

  const expiringSoon = stats?.expiringSoon ?? 0;
  const expiredPending = stats?.expiredPending ?? 0;

  return (
    <RouteGuard allow={["admin"]}>
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        <PageHeader
          icon={HardDrive}
          title="Almacenamiento"
          description={campusName ? `Sede ${campusName}` : "Administración de archivos"}
          action={
            <Button variant="outline" size="sm" onClick={() => void loadStats()}>
              <RefreshCw className="size-3.5" /> Actualizar
            </Button>
          }
        />

        {!campusId ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <HardDrive className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Selecciona una sede para ver el almacenamiento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Database} value={loading ? "—" : stats?.totalFiles ?? 0} label="Archivos almacenados" colorKey="classes" />
              <StatCard icon={HardDrive} value={loading ? "—" : formatBytes(stats?.totalBytes ?? 0)} label="Espacio utilizado" colorKey="tasks" />
              <StatCard icon={Timer} value={loading ? "—" : expiringSoon} label="Próximos a expirar" sublabel="7 días" colorKey="students" />
              <StatCard icon={AlertTriangle} value={loading ? "—" : expiredPending} label="Expirados pendientes" colorKey="teachers" />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Timer className="size-4 text-primary" /> Política de retención
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Eliminar archivos automáticamente después de
                      </label>
                      <Select value={String(retentionDays)} onValueChange={(v) => setRetentionDays(Number(v))}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RETENTION_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={String(opt)}>
                              {opt} días
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => void saveRetention()} disabled={saving}>
                      {saving ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La política aplica a archivos nuevos. Los archivos existentes conservan su fecha
                    de expiración actual.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="size-4 text-primary" /> Última limpieza automática
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats?.lastRun ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <label className="text-xs font-semibold text-muted-foreground">Ejecutada</label>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {formatDateTime(stats.lastRun.startedAt)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <label className="text-xs font-semibold text-muted-foreground">Estado</label>
                          <p className="mt-1 text-sm font-medium capitalize text-foreground">
                            {stats.lastRun.status}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <label className="text-xs font-semibold text-muted-foreground">Resultado</label>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {stats.lastRun.deletedFiles} eliminados · {formatBytes(stats.lastRun.bytesFreed)} liberados
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        La limpieza se ejecuta automáticamente una vez al día vía Vercel Cron.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aún no se ha ejecutado ninguna limpieza automática.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {(expiringSoon > 0 || expiredPending > 0) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="size-4 text-primary" /> Archivos por vencer o expirados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats?.expiringSoonAssets.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(a.sizeBytes)} · Expira el {formatDateTime(a.expiresAt)}
                          </p>
                        </div>
                        <Button variant="outline" size="xs" onClick={() => void toggleProtect(a.id, true)}>
                          <ShieldCheck className="size-3" /> Conservar
                        </Button>
                      </div>
                    ))}
                    {stats?.expiredAssets.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-card p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(a.sizeBytes)} · Venció el {formatDateTime(a.expiresAt)}
                          </p>
                        </div>
                        <Button variant="outline" size="xs" onClick={() => void toggleProtect(a.id, true)}>
                          <ShieldOff className="size-3" /> Conservar
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Conservar marca el archivo como protegido y evita su eliminación automática.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </RouteGuard>
  );
}
