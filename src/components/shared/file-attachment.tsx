"use client";

import { Download, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAttachmentDownloadUrl } from "@/lib/attachments";
import type { Attachment } from "@/types";

interface FileAttachmentProps {
  attachment: Attachment;
  variant?: "default" | "compact";
  className?: string;
}

export default function FileAttachment({
  attachment,
  variant = "default",
  className,
}: FileAttachmentProps) {
  return (
    <a
      href={getAttachmentDownloadUrl(attachment)}
      download
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
        variant === "compact" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
        className,
      )}
    >
      {variant === "compact" ? <Download className="size-2.5" /> : <Paperclip className="size-3" />}
      <span className="truncate max-w-[120px]">{attachment.name}</span>
    </a>
  );
}
