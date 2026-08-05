import type { Attachment } from "@/types";

export function getAttachmentDownloadUrl(att: Attachment): string {
  if (att.fileAssetId) return `/api/file-assets/${att.fileAssetId}/download`;
  return att.url;
}
