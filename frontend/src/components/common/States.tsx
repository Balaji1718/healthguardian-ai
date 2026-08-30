import { AlertCircle, Inbox, Loader2, RefreshCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/locales/i18n";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label || t("common.loading")}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
      <Inbox className="size-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <AlertCircle className="size-6 text-destructive" />
      <p className="text-sm text-muted-foreground">{message ?? t("common.error")}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" /> {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function OfflineNotice() {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <WifiOff className="size-4" /> {t("common.offlineNotice")}
    </div>
  );
}

export function Disclaimer({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <p className="mt-6 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      {children ?? t("common.disclaimer")}
    </p>
  );
}
