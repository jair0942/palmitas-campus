"use client";

import { Download, Paperclip, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAttachmentDownloadUrl } from "@/lib/attachments";
import type { Attachment } from "@/types";

interface FileAttachmentProps {
  attachment: Attachment;
  variant?: "default" | "compact";
  className?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function FileAttachment({
  attachment,
  variant = "default",
  className,
}: FileAttachmentProps) {
  const expiresAt = attachment.fileAsset?.expiresAt ?? null;
  const daysLeft = daysUntil(expiresAt);
  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  const expired = daysLeft !== null && daysLeft < 0;
  const protectedFile = !!attachment.fileAsset?.protectedFromCleanup;

  if (variant === "compact") {
    return (
      <span
        title={expiresAt ? `Expira el: ${formatDate(expiresAt)}` : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
          "px-2.5 py-1.5 text-xs",
          expiringSoon && "border-amber-300 text-amber-700",
          expired && "border-destructive/40 text-destructive",
          className,
        )}
      >
        <Download className="size-2.5" />
        <span className="truncate max-w-[120px]">{attachment.name}</span>
      </span>
    );
  }

  const showMeta = !!attachment.fileAsset;

  return (
    <span className={cn("inline-flex flex-col items-start gap-0.5", className)}>
      <a
        href={getAttachmentDownloadUrl(attachment)}
        download
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
          "px-3 py-2 text-sm",
          expiringSoon && "border-amber-300",
          expired && "border-destructive/40",
        )}
      >
        <Paperclip className="size-3" />
        <span className="truncate max-w-[220px]">{attachment.name}</span>
      </a>
      {showMeta && (
        <span className="flex flex-col gap-0.5 pl-1 text-[11px] leading-tight text-muted-foreground">
          {attachment.fileAsset?.sizeBytes ? (
            <span>
              {formatBytes(attachment.fileAsset.sizeBytes)} · Subido el{" "}
              {formatDate(attachment.fileAsset.createdAt)}
            </span>
          ) : null}
          {expiresAt && (
            <span>Expira el: {formatDate(expiresAt)}</span>
          )}
          {expiringSoon && (
            <span className="font-medium text-amber-600">
              Este archivo se eliminará próximamente.
            </span>
          )}
          {expired && (
            <span className="font-medium text-destructive">
              Este archivo ya venció y será eliminado por la limpieza automática.
            </span>
          )}
          {protectedFile && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
              <ShieldCheck className="size-3" /> Conservado (no se eliminará)
            </span>
          )}
        </span>
      )}
    </span>
  );
}
