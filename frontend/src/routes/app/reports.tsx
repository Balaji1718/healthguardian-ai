import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Loader2, ScanLine, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUid } from "@/features/auth/useAuth";
import { useReports, useResults } from "@/features/health/queries";
import { reportMetaSchema } from "@/core/validation/schemas";
import {
  ALLOWED_MIME,
  deleteLocalDocument,
  getLocalDocument,
  saveLocalDocument,
  validateFile,
} from "@/services/localStorage/documents";
import { computeFlag, extractResults, runOcr, type ExtractedCandidate } from "@/services/ocr/ocr";
import {
  createReport,
  deleteReport,
  saveResult,
  updateReport,
  toDate,
} from "@/services/firebase/repositories";
import type { MedicalReport } from "@/models";
import { ContextualHelp } from "@/features/guide/ContextualHelp";
import { useTranslation } from "@/locales/i18n";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Medical reports — HealthGuardian AI" },
      {
        name: "description",
        content:
          "Read lab reports on your own device and confirm each extracted value before it is saved.",
      },
      { property: "og:title", content: "Medical reports, read on your device" },
      {
        property: "og:description",
        content: "On-device OCR with human verification before any value is stored.",
      },
    ],
  }),
});

const REPORT_TYPES = [
  "blood_test",
  "urine_test",
  "imaging",
  "prescription",
  "discharge_summary",
  "other",
];

export function ReportsPage() {
  const uid = useUid();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useReports(uid);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({
    reportTitle: "",
    reportType: "blood_test",
    reportDate: new Date().toISOString().slice(0, 10),
    laboratoryName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<ExtractedCandidate[]>([]);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !file) {
      toast.error("Choose a PDF or image of your report first.");
      return;
    }
    const fileError = validateFile(file);
    if (fileError) {
      toast.error(fileError);
      return;
    }
    const parsed = reportMetaSchema.safeParse(meta);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    setProgress(0);
    let localFileId = "";
    let reportId = "";
    try {
      localFileId = await saveLocalDocument(uid, file);
      const report: MedicalReport = {
        reportTitle: meta.reportTitle,
        reportType: meta.reportType,
        documentType: file.type === "application/pdf" ? "pdf" : "image",
        reportDate: new Date(`${meta.reportDate}T00:00:00`),
        laboratoryName: meta.laboratoryName || undefined,
        ocrStatus: "processing",
        verificationStatus: "pending",
        localFileId,
      };
      reportId = await createReport(uid, report);
      setActiveReport(reportId);

      const outcome = await runOcr(file, file.type, (p) => setProgress(Math.round(p * 100)));
      const found = outcome.pages.flatMap((pg) => extractResults(pg.text, pg.page, pg.confidence));
      setCandidates(found);
      await updateReport(uid, reportId, {
        ocrStatus: found.length ? "completed" : "failed",
        pageCount: outcome.pages.length,
      });
      await qc.invalidateQueries({ queryKey: ["reports"] });
      toast[found.length ? "success" : "warning"](
        found.length
          ? `${found.length} value(s) read. Please check each one before saving.`
          : "The text could not be read reliably. You can still keep the document and enter values manually.",
      );
    } catch (err) {
      if (uid && reportId) await updateReport(uid, reportId, { ocrStatus: "failed" });
      if (uid && localFileId) await deleteLocalDocument(uid, localFileId);
      toast.error((err as Error).message || "Reading the document failed on this device.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const confirmAll = async () => {
    if (!uid || !activeReport) return;
    setBusy(true);
    try {
      for (const c of candidates) {
        await saveResult(uid, activeReport, {
          ...c,
          flag: computeFlag(
            c.numericValue ?? null,
            c.referenceLow ?? null,
            c.referenceHigh ?? null,
          ),
          userVerified: true,
          verifiedAt: new Date(),
        });
      }
      await updateReport(uid, activeReport, {
        verificationStatus: "verified",
        verifiedAt: new Date(),
      });
      await qc.invalidateQueries({ queryKey: ["reports"] });
      setCandidates([]);
      setFile(null);
      toast.success(t("common.success"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const removeReport = async (r: MedicalReport) => {
    if (!uid || !r.id) return;
    await deleteReport(uid, r.id);
    await deleteLocalDocument(uid, r.localFileId);
    await qc.invalidateQueries({ queryKey: ["reports"] });
    toast.success(t("common.success"));
  };

  const openLocal = async (r: MedicalReport) => {
    if (!uid) return;
    const doc = await getLocalDocument(uid, r.localFileId);
    if (!doc) {
      toast.error(
        "The file is no longer on this device. Documents are never uploaded, so it cannot be recovered here.",
      );
      return;
    }
    const url = URL.createObjectURL(doc.blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  if (isLoading) return <LoadingState label={t("common.loading")} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />

      <form onSubmit={upload} className="surface space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reportTitle">{t("reports.reportTitle")}</Label>
            <Input
              id="reportTitle"
              value={meta.reportTitle}
              onChange={(e) => setMeta({ ...meta, reportTitle: e.target.value })}
              placeholder="Annual blood panel"
            />
            {errors["reportTitle"] && (
              <p className="text-xs text-destructive">{errors["reportTitle"]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reportType">{t("reports.reportType")}</Label>
            <select
              id="reportType"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={meta.reportType}
              onChange={(e) => setMeta({ ...meta, reportType: e.target.value })}
            >
              {REPORT_TYPES.map((typeKey) => (
                <option key={typeKey} value={typeKey}>
                  {typeKey.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reportDate">{t("reports.reportDate")}</Label>
            <Input
              id="reportDate"
              type="date"
              value={meta.reportDate}
              onChange={(e) => setMeta({ ...meta, reportDate: e.target.value })}
            />
            {errors["reportDate"] && (
              <p className="text-xs text-destructive">{errors["reportDate"]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lab">{t("reports.labName")}</Label>
            <Input
              id="lab"
              value={meta.laboratoryName}
              onChange={(e) => setMeta({ ...meta, laboratoryName: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor="file">{t("reports.uploadBoxHint")}</Label>
            <ContextualHelp content="Raw medical documents are processed on your device and stored in local browser IndexedDB. Review OCR results before confirming." />
          </div>
          <Input
            id="file"
            type="file"
            accept={ALLOWED_MIME.join(",")}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {progress !== null && (
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-sm text-muted-foreground">
              <ScanLine className="size-4" /> {t("reports.readingProgress", { progress })}
            </p>
            <Progress value={progress} />
          </div>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Upload className="mr-2 size-4" />
          )}{" "}
          {t("reports.readAndExtract")}
        </Button>
      </form>

      {candidates.length > 0 && (
        <section className="surface mt-6 p-6">
          <h2 className="font-medium">{t("reports.verifyModalTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("reports.verifyModalDesc")}</p>
          <div className="mt-4 space-y-3">
            {candidates.map((c, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
              >
                <Input
                  aria-label="Test name"
                  value={c.testName}
                  onChange={(e) =>
                    setCandidates((cur) =>
                      cur.map((x, j) => (j === i ? { ...x, testName: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  aria-label="Value"
                  value={c.resultValue}
                  onChange={(e) =>
                    setCandidates((cur) =>
                      cur.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              resultValue: e.target.value,
                              numericValue: Number.parseFloat(e.target.value) || null,
                            }
                          : x,
                      ),
                    )
                  }
                />
                <Input
                  aria-label="Unit"
                  value={c.unit ?? ""}
                  onChange={(e) =>
                    setCandidates((cur) =>
                      cur.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove value"
                  onClick={() => setCandidates((cur) => cur.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button className="mt-4" onClick={() => void confirmAll()} disabled={busy}>
            <CheckCircle2 className="mr-2 size-4" /> {t("reports.saveAllConfirmed")} (
            {candidates.length})
          </Button>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("reports.title")}</h2>
        {(data ?? []).length === 0 ? (
          <EmptyState
            title={t("reports.noReportsTitle")}
            description={t("reports.noReportsDesc")}
          />
        ) : (
          <ul className="space-y-2">
            {(data ?? []).map((r) => (
              <li key={r.id} className="surface flex flex-wrap items-center gap-3 p-4">
                <FileText className="size-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.reportTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {toDate(r.reportDate)?.toLocaleDateString() ?? "—"} ·{" "}
                    {r.reportType.replace(/_/g, " ")}
                  </p>
                </div>
                <Badge variant={r.verificationStatus === "verified" ? "default" : "secondary"}>
                  {r.verificationStatus === "verified"
                    ? t("reports.statusVerified")
                    : t("reports.statusPending")}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => void openLocal(r)}>
                  {t("preview.previewBtn") || "Open"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void removeReport(r)}>
                  {t("common.delete")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <VerifiedValues uid={uid} reportId={(data ?? [])[0]?.id ?? null} />

      <Disclaimer />
    </div>
  );
}

function VerifiedValues({ uid, reportId }: { uid: string | null; reportId: string | null }) {
  const { data } = useResults(uid, reportId);
  const verified = (data ?? []).filter((r) => r.userVerified);
  if (!reportId || verified.length === 0) return null;
  return (
    <section className="surface mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-2.5 font-medium">Test</th>
            <th className="px-4 py-2.5 font-medium">Value</th>
            <th className="px-4 py-2.5 font-medium">Reference</th>
            <th className="px-4 py-2.5 font-medium">Flag</th>
          </tr>
        </thead>
        <tbody>
          {verified.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-2.5">{r.testName}</td>
              <td className="px-4 py-2.5">
                {r.resultValue} {r.unit ?? ""}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {r.referenceLow != null && r.referenceHigh != null
                  ? `${r.referenceLow}–${r.referenceHigh}`
                  : (r.referenceText ?? "—")}
              </td>
              <td className="px-4 py-2.5 capitalize">{r.flag ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
