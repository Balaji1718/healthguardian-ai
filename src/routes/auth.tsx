import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authSchema, registerSchema } from "@/core/validation/schemas";
import { login, register, resetPassword } from "@/services/firebase/auth";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { FirebaseSetupNotice } from "@/components/common/FirebaseSetupNotice";
import { useAuthListener } from "@/features/auth/useAuth";
import { MEDICAL_DISCLAIMER } from "@/core/constants/health";

const searchSchema = z.object({ mode: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — HealthGuardian AI" },
      { name: "description", content: "Access your private HealthGuardian AI preventive health workspace." },
      { property: "og:title", content: "Sign in to HealthGuardian AI" },
      { property: "og:description", content: "Access your private preventive health workspace." },
    ],
  }),
});

function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "That email and password combination did not match.";
  if (code.includes("email-already-in-use")) return "An account already exists with this email.";
  if (code.includes("weak-password")) return "Choose a stronger password (at least 8 characters).";
  if (code.includes("network")) return "You appear to be offline. Sign-in needs a connection.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait a moment and try again.";
  return (e as Error)?.message ?? "Something went wrong. Please try again.";
}

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuthListener();
  const [isRegister, setIsRegister] = useState(mode === "register");
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/app/dashboard", replace: true });
  }, [loading, user, navigate]);

  if (!isFirebaseConfigured) return <FirebaseSetupNotice />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schema = isRegister ? registerSchema : authSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (isRegister) await register(form.email, form.password, form.displayName);
      else await login(form.email, form.password);
      await navigate({ to: "/app/dashboard", replace: true });
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!form.email) {
      toast.error("Enter your email first, then choose reset.");
      return;
    }
    try {
      await resetPassword(form.email);
      toast.success("If that email has an account, a reset link is on its way.");
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <Heart className="size-5 text-primary" /> HealthGuardian AI
        </Link>
        <div className="surface p-6">
          <h1 className="text-xl font-semibold">{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRegister ? "Your health data is private to your account." : "Sign in to continue your check-ins."}
          </p>
          <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
            {isRegister && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Full name</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  autoComplete="name"
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />
                {errors['displayName'] && <p className="text-xs text-destructive">{errors['displayName']}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {errors['email'] && <p className="text-xs text-destructive">{errors['email']}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {errors['password'] && <p className="text-xs text-destructive">{errors['password']}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isRegister ? "Create account" : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" className="text-primary hover:underline" onClick={() => setIsRegister((v) => !v)}>
              {isRegister ? "I already have an account" : "Create an account"}
            </button>
            {!isRegister && (
              <button type="button" className="text-muted-foreground hover:underline" onClick={forgot}>
                Forgot password?
              </button>
            )}
          </div>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{MEDICAL_DISCLAIMER}</p>
      </div>
    </div>
  );
}
