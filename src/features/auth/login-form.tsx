"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const floatingShapes = [
  { size: 300, top: "-10%", left: "-5%", opacity: 0.07, delay: 0 },
  { size: 200, bottom: "-8%", right: "-3%", opacity: 0.05, delay: 0.3 },
  { size: 150, top: "20%", right: "10%", opacity: 0.04, delay: 0.6 },
  { size: 250, bottom: "15%", left: "5%", opacity: 0.06, delay: 0.9 },
];

export default function LoginForm() {
  const router = useRouter();
  const { login } = useStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function completeLogin(nextUsername: string, nextPassword: string) {
    const user = await login(nextUsername, nextPassword);
    if (user) {
      router.push("/dashboard");
    } else {
      toast.error("Credenciales invalidas");
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    completeLogin(username, password);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white p-4">
      {floatingShapes.map((shape, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: shape.opacity, scale: 1 }}
          transition={{ duration: 1.5, delay: shape.delay, ease: "easeOut" }}
          className="pointer-events-none absolute"
          style={{
            width: shape.size,
            height: shape.size,
            top: shape.top,
            bottom: shape.bottom,
            left: shape.left,
            right: shape.right,
            background: "radial-gradient(circle, #0F6A3B 0%, transparent 70%)",
            borderRadius: "50%",
            opacity: 0,
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
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
              alt="Palmitas Campus"
              width={80}
              height={80}
              className="rounded-2xl shadow-lg shadow-[#0F6A3B]/20"
            />
          </motion.div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827]">Palmitas Campus</h1>
          <p className="mt-1 text-center text-[16px] leading-snug text-[#6B7280]">
            Institucion Educativa Antonio Bruges Carmona - Sede Palmitas
          </p>
          <p className="mb-8 mt-4 max-w-xs text-center text-[15px] leading-relaxed text-[#6B7280]/70">
            Plataforma academica institucional para la gestion educativa de la sede Palmitas.
          </p>

          <form onSubmit={handleLogin} className="flex w-full flex-col gap-4">
            <Input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <Input
              type="password"
              placeholder="Contrasena"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                className="h-[48px] w-full rounded-[14px] bg-[#0F6A3B] text-[17px] font-medium text-white shadow-lg shadow-[#0F6A3B]/25 hover:bg-[#0C5A31]"
              >
                Iniciar sesion
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
