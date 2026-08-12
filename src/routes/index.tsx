import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Bot, FileText, Heart, Lock, ShieldCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MEDICAL_DISCLAIMER } from "@/core/constants/health";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "HealthGuardian AI — Preventive health, privately" },
      {
        name: "description",
        content:
          "A privacy-first preventive health companion: daily check-ins, on-device report reading, deterministic pattern detection and an AI assistant that never diagnoses.",
      },
      { property: "og:title", content: "HealthGuardian AI" },
      {
        property: "og:description",
        content: "Daily check-ins, on-device medical report reading and preventive health insights you control.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const FEATURES = [
  { icon: Activity, title: "Deterministic insights", body: "Patterns and your General Health Score are computed by versioned local logic — reproducible, never guessed by a model." },
  { icon: FileText, title: "Reports stay on your device", body: "Lab PDFs and photos are read with on-device OCR and stored in your browser. Only values you confirm are saved." },
  { icon: Bot, title: "An assistant with limits", body: "The AI explains, summarises and plans. It never diagnoses, never prescribes and always shows which tools it used." },
  { icon: WifiOff, title: "Works offline", body: "Check-ins made without a connection queue locally and sync the moment you are back online." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <Heart className="size-5 text-primary" /> HealthGuardian AI
        </span>
        <Button asChild variant="secondary" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="hg-hero mx-auto max-w-6xl rounded-3xl px-6 py-16 sm:px-12">
        <p className="text-sm font-medium opacity-90">Preventive health, not diagnosis</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Understand your health patterns before they become problems.
        </h1>
        <p className="mt-5 max-w-xl text-base opacity-95">
          Log a 60-second daily check-in, read your lab reports on your own device, and get grounded explanations from an
          assistant that is honest about what it cannot know.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth" search={{ mode: "register" }}>
              Create your account
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-14 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <article key={title} className="surface p-6">
            <Icon className="size-5 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex gap-3">
            <Lock className="size-5 shrink-0 text-primary" />
            <ShieldCheck className="size-5 shrink-0 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your data belongs to you: every record is scoped to your account, documents never leave your device, and you can
            export or permanently delete everything from Settings.
          </p>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{MEDICAL_DISCLAIMER}</p>
      </section>
    </div>
  );
}
