import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Bot, FileText, Heart, Lock, ShieldCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MEDICAL_DISCLAIMER } from "@/core/constants/health";
import { LanguageSelector } from "@/features/i18n/LanguageSelector";
import { useTranslation } from "@/locales/i18n";

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
        content:
          "Daily check-ins, on-device medical report reading and preventive health insights you control.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

export function Landing() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Activity,
      title: t("landing.feature1Title"),
      body: t("landing.feature1Body"),
    },
    {
      icon: FileText,
      title: t("landing.feature2Title"),
      body: t("landing.feature2Body"),
    },
    {
      icon: Bot,
      title: t("landing.feature3Title"),
      body: t("landing.feature3Body"),
    },
    {
      icon: WifiOff,
      title: t("landing.feature4Title"),
      body: t("landing.feature4Body"),
    },
  ];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <Heart className="size-5 text-primary" /> HealthGuardian AI
        </span>
        <div className="flex items-center gap-3">
          <LanguageSelector variant="header" />
          <Button asChild variant="secondary" size="sm">
            <Link to="/auth">{t("landing.signIn")}</Link>
          </Button>
        </div>
      </header>

      <section className="hg-hero mx-auto max-w-6xl rounded-3xl px-6 py-16 sm:px-12">
        <p className="text-sm font-medium opacity-90">{t("landing.tagline")}</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="mt-5 max-w-xl text-base opacity-95">{t("landing.heroDescription")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth" search={{ mode: "register" }}>
              {t("landing.createAccount")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">{t("landing.alreadyHaveAccount")}</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-14 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, body }) => (
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
          <p className="text-sm text-muted-foreground">{t("landing.privacyCard")}</p>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{MEDICAL_DISCLAIMER}</p>
      </section>
    </div>
  );
}
