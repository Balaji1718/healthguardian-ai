import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  Bot,
  CalendarCheck,
  Compass,
  FileText,
  Gauge,
  Heart,
  LifeBuoy,
  LineChart,
  Menu,
  Settings,
  Stethoscope,
  Target,
  WifiOff,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import { Button } from "@/components/ui/button";
import { GuidedTourModal } from "@/features/guide/GuidedTourModal";
import { NewUserGuidePrompt } from "@/features/guide/NewUserGuidePrompt";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { LanguageSelector } from "@/features/i18n/LanguageSelector";
import { useTranslation } from "@/locales/i18n";

export const NAV_ITEMS = [
  { to: "/app/dashboard", key: "nav.dashboard", defaultLabel: "Dashboard", icon: Gauge },
  {
    to: "/app/checkin",
    key: "nav.dailyCheckin",
    defaultLabel: "Daily Check-in",
    icon: CalendarCheck,
  },
  { to: "/app/history", key: "nav.history", defaultLabel: "Health History", icon: LineChart },
  { to: "/app/reports", key: "nav.reports", defaultLabel: "Medical Reports", icon: FileText },
  { to: "/app/risk", key: "nav.risk", defaultLabel: "Risk & Patterns", icon: Activity },
  { to: "/app/assistant", key: "nav.assistant", defaultLabel: "AI Assistant", icon: Bot },
  { to: "/app/goals", key: "nav.goals", defaultLabel: "Goals", icon: Target },
  { to: "/app/notifications", key: "nav.notifications", defaultLabel: "Notifications", icon: Bell },
  {
    to: "/app/specialist",
    key: "nav.specialist",
    defaultLabel: "Specialist Guidance",
    icon: Stethoscope,
  },
  { to: "/app/guide", key: "nav.guide", defaultLabel: "Help & Guide", icon: Compass },
  { to: "/app/support", key: "nav.support", defaultLabel: "Support", icon: LifeBuoy },
  { to: "/app/settings", key: "nav.settings", defaultLabel: "Profile & Privacy", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const online = useAppStore((s) => s.online);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ to, key, defaultLabel, icon: Icon }) => {
        const active = path === to;
        const label = t(key) || defaultLabel;
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur lg:pl-[17rem]">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
        <Link to="/app/dashboard" className="flex items-center gap-2 lg:hidden">
          <Heart className="size-5 text-primary" />
          <span className="font-semibold">{t("common.appName")}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {!online && (
            <span className="flex items-center gap-1.5 rounded-full bg-warning/20 px-3 py-1 text-xs font-medium text-warning-foreground">
              <WifiOff className="size-3.5" /> {t("common.offline")}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTourOpen(true)}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hidden sm:flex"
          >
            <Compass className="size-3.5 text-primary" />
            <span>{t("common.guidedTour")}</span>
          </Button>
          <LanguageSelector variant="header" />
          <ThemeToggle variant="compact" />
        </div>
      </header>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Heart className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">HealthGuardian AI</span>
        </div>
        <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">{nav}</div>
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
          {path === "/app/dashboard" && (
            <NewUserGuidePrompt onStartTour={() => setTourOpen(true)} />
          )}
          {children}
        </div>
      </main>

      <GuidedTourModal open={tourOpen} onOpenChange={setTourOpen} />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
