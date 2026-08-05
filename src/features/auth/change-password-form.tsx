"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    if (newPassword === currentPassword) {
      toast.error("La nueva contraseña debe ser diferente de la actual");
      return;
    }
    setSaving(true);
    const result = await changePassword(currentPassword, newPassword, confirmPassword);
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

  function PasswordInput({
    value,
    onChange,
    show,
    onToggle,
  }: {
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
  }) {
    return (
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-11"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]"
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full space-y-4", className)}>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Contraseña actual</label>
        <PasswordInput
          value={currentPassword}
          onChange={setCurrentPassword}
          show={showCurrent}
          onToggle={() => setShowCurrent((s) => !s)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Nueva contraseña</label>
        <PasswordInput
          value={newPassword}
          onChange={setNewPassword}
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Confirmar nueva contraseña</label>
        <PasswordInput
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirm}
          onToggle={() => setShowConfirm((s) => !s)}
        />
      </div>
      <Button
        type="submit"
        disabled={!canSubmit || saving}
        className={cn("w-full gap-1.5", !compact && "h-12")}
      >
        <KeyRound className="size-4" />
        {saving ? "Guardando..." : "Actualizar contraseña"}
      </Button>
    </form>
  );
}
