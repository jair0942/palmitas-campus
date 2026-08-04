"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 8;

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  className?: string;
  compact?: boolean;
}

export default function ChangePasswordForm({
  onSuccess,
  className,
  compact = false,
}: ChangePasswordFormProps) {
  const { changePassword } = useStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit =
    currentPassword.trim().length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }
    setSaving(true);
    const result = await changePassword(currentPassword, newPassword);
    setSaving(false);
    if (result.ok) {
      toast.success("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess?.();
    } else {
      toast.error(result.error || "No se pudo cambiar la contraseña");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full space-y-4", className)}>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Contraseña actual</label>
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Contraseña actual"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Nueva contraseña</label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Confirmar nueva contraseña</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repite la nueva contraseña"
          autoComplete="new-password"
          required
        />
      </div>
      <Button
        type="submit"
        disabled={!canSubmit || saving}
        className={cn("w-full gap-1.5", !compact && "h-12")}
      >
        <KeyRound className="size-4" />
        {saving ? "Guardando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
