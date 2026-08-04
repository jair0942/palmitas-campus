"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChangePasswordForm from "./change-password-form";

interface MustChangePasswordProps {
  onLogout: () => void;
}

export default function MustChangePassword({ onLogout }: MustChangePasswordProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="mx-auto flex max-w-md flex-col items-center rounded-[24px] bg-white px-10 pb-10 pt-12 shadow-[0_20px_60px_rgba(15,106,59,0.08)] ring-1 ring-[#E5E7EB]">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-5"
          >
            <Image
              src="/images/logo.jpg"
              alt="Campus Virtual"
              width={80}
              height={80}
              className="rounded-2xl shadow-lg shadow-[#0F6A3B]/20"
            />
          </motion.div>
          <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-[#F2C230]/15">
            <ShieldAlert className="size-6 text-[#B8860B]" />
          </div>
          <h1 className="text-center text-[24px] font-bold tracking-tight text-[#111827]">
            Debes cambiar tu contraseña
          </h1>
          <p className="mb-8 mt-2 max-w-xs text-center text-[15px] leading-relaxed text-[#6B7280]">
            Estás utilizando una contraseña temporal. Establece una contraseña nueva para continuar
            usando el Campus Virtual.
          </p>

          <ChangePasswordForm compact />

          <Button
            type="button"
            variant="ghost"
            className="mt-6 gap-1.5 text-sm text-[#6B7280] hover:text-[#111827]"
            onClick={onLogout}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
