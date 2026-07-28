"use client";

import type { Post } from "@/types";
import { useStore } from "@/hooks/use-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Paperclip } from "lucide-react";
import { motion } from "framer-motion";

interface PostCardProps {
  post: Post;
  className?: string;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  if (diff < 1) return "Ahora";
  if (diff < 60) return `Hace ${diff} min`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PostCard({ post, className }: PostCardProps) {
  const { getUserName } = useStore();
  const authorName = getUserName(post.authorId);
  const initial = authorName.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
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
              <span className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>

            {post.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                  >
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
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
