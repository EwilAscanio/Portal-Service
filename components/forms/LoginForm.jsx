"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Lock, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { notify } from "@/lib/toast";
import { loginSchema } from "@/lib/validators/auth.schema";

/**
 * Login form: validations, show/hide password and loading/error states.
 * Authenticates against the real backend via NextAuth Credentials provider.
 */
export function LoginForm({ onSubmit }) {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "" },
  });

  const submitForm = async (values) => {
    try {
      await onSubmit(values.login, values.password);
      notify.success("Bienvenido", {
        description: "Sesión iniciada correctamente.",
      });
      router.replace("/dashboard");
    } catch (error) {
      setError("root", {
        type: "server",
        message: error.message || "No se pudo iniciar sesión.",
      });
    }
  };

  const handleFieldChange = (field) => () => {
    clearErrors(field);
    clearErrors("root");
  };

  return (
    <form onSubmit={handleSubmit(submitForm)} noValidate className="space-y-5">
      {/* Global error with animation */}
      <AnimatePresence>
        {errors.root?.message && (
          <motion.div
            key={errors.root.message}
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: { type: "spring", stiffness: 500, damping: 26 },
            }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {errors.root.message}
          </motion.div>
        )}
      </AnimatePresence>

      <Input
        label="Usuario"
        type="text"
        icon={User}
        placeholder="tu.usuario"
        autoComplete="username"
        error={errors.login?.message}
        {...register("login", { onChange: handleFieldChange("login") })}
      />

      <Input
        label="Contraseña"
        type={showPassword ? "text" : "password"}
        icon={Lock}
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password", { onChange: handleFieldChange("password") })}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        {isSubmitting ? "Verificando credenciales…" : "Ingresar"}
      </Button>
    </form>
  );
}
