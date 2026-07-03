"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/types";

const ERROR_MAP: Record<string, { title: string; text: string }> = {
  account_locked: {
    title: "Account Locked",
    text: "Too many failed attempts. Account locked for 1 hour.",
  },
  account_inactive: {
    title: "Account Inactive",
    text: "Your account is inactive. Contact the admin.",
  },
  invalid_email: {
    title: "Email Not Found",
    text: "No account found with this email address.",
  },
  invalid_password: {
    title: "Wrong Password",
    text: "The password you entered is incorrect.",
  },
  configuration: {
    title: "Server Error",
    text: "Authentication is not configured correctly. Contact the admin.",
  },
  default: {
    title: "Error",
    text: "Something went wrong. Please try again.",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setErrorCode(null);
    const result = await signIn("credentials", {
      username: data.username,
      password: data.password,
      redirect: false,
    });
    if (!result?.error) {
      router.replace("/");
      router.refresh();
      return;
    }
    // result.error contains the code thrown by the CredentialsSignin subclass
    const code = result.error.toLowerCase();
    setErrorCode(code);
  };

  const errInfo = errorCode ? (ERROR_MAP[errorCode] ?? ERROR_MAP.default) : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-4 py-12">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(211,47,47,0.15) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(211,47,47,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <img
              src="/logo.png"
              alt="Dhagaji Creation"
              className="h-20 w-auto object-contain select-none"
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/20">
              Factory Management · Himatnagar
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl px-7 py-8"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(24px)",
          }}
        >
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-[10px] font-bold uppercase tracking-[0.15em] text-white/35"
              >
                Email
              </label>
              <input
                id="username"
                type="email"
                placeholder="owner@dhagaji.local"
                autoComplete="email"
                aria-invalid={!!errors.username}
                className={[
                  "w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all",
                  "placeholder:text-white/15",
                  errors.username
                    ? "border border-rose-500/60 bg-rose-950/20 ring-1 ring-rose-500/30"
                    : "border border-white/6 bg-white/5 focus:border-[#D32F2F]/50 focus:ring-1 focus:ring-[#D32F2F]/25",
                ].join(" ")}
                {...register("username")}
              />
              {errors.username && (
                <p className="flex items-center gap-1 text-xs text-rose-400" role="alert">
                  <AlertCircle size={11} />
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password with show/hide */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[10px] font-bold uppercase tracking-[0.15em] text-white/35"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  className={[
                    "w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none transition-all",
                    "placeholder:text-white/15",
                    errors.password
                      ? "border border-rose-500/60 bg-rose-950/20 ring-1 ring-rose-500/30"
                      : "border border-white/6 bg-white/5 focus:border-[#D32F2F]/50 focus:ring-1 focus:ring-[#D32F2F]/25",
                  ].join(" ")}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1 text-xs text-rose-400" role="alert">
                  <AlertCircle size={11} />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error banner */}
            {errInfo && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-rose-500/15 bg-rose-950/30 px-4 py-3"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
                <div>
                  <p className="text-sm font-semibold text-rose-300">{errInfo.title}</p>
                  <p className="mt-0.5 text-xs text-rose-400/70">{errInfo.text}</p>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)",
                boxShadow: isSubmitting ? "none" : "0 4px 24px rgba(211,47,47,0.35)",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] text-white/12">
          Internal use only · Dhagaji Creation &copy; {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
