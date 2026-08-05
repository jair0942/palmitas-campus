"use client"

import { useStore } from "@/hooks/use-store"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Shield, Mail, Lock } from "lucide-react"
import { motion } from "framer-motion"
import PageHeader from "@/components/shared/page-header"
import ChangePasswordForm from "@/features/auth/change-password-form"
import { getUserDisplayName, getUserInitials } from "@/lib/domain"

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  teacher: "Profesor",
  student: "Estudiante",
}

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  teacher: "secondary",
  student: "outline",
}

export default function ProfilePage() {
  const { user } = useStore()

  if (!user) return null

  const displayName = getUserDisplayName(user)
  const initials = getUserInitials(user)

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <PageHeader
        icon={User}
        title="Perfil"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden border-transparent shadow-lg shadow-black/5">
          <div className="h-24 bg-gradient-to-r from-primary/80 to-primary" />
          <CardContent className="relative -mt-12 flex flex-col items-center gap-4 px-6 pb-6 pt-0">
            <Avatar className="size-24 ring-4 ring-background shadow-xl">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-2xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{displayName}</h2>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" />
                <span>{user.username}</span>
              </div>
              <div className="mt-3">
                <Badge variant={roleColors[user.role]} className="gap-1 px-3 py-1">
                  <Shield className="size-3" />
                  {roleLabels[user.role]}
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid w-full grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Rol</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">{roleLabels[user.role]}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Miembro desde</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-transparent shadow-lg shadow-black/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="size-4 text-primary" />
              Seguridad
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Establece una contraseña personal para tu cuenta.
            </p>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
