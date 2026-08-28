import type { MedicalResult } from "@/models";

/**
 * Local, on-device OCR. Nothing is uploaded to a third-party OCR service.
 *
 * TODO (limitation): browser OCR works well for clear printed/digital reports.
 * Handwritten notes, low-quality scans and unusual hospital layouts may extract
 * poorly — which is exactly why every extracted value must be user-verified.
 */

export interface OcrPageText {
  page: number;
  text: string;
  confidence: number | null;
}

export interface OcrOutcome {
  pages: OcrPageText[];
  candidates: ExtractedCandidate[];
  pageCount: number;
}

export interface ExtractedCandidate extends Omit<MedicalResult, "userVerified"> {
  userVerified: boolean;
}

async function pdfToText(blob: Blob): Promise<OcrPageText[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const data = new Uint8Array(await blob.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: OcrPageText[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ")
      .replace(/\s{2,}/g, " ");
    pages.push({ page: i, text, confidence: text.trim().length > 40 ? 0.99 : 0.3 });
  }
  return pages;
}

async function imageToText(blob: Blob, onProgress?: (p: number) => void): Promise<OcrPageText[]> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(blob);
    return [{ page: 1, text: data.text, confidence: (data.confidence ?? 0) / 100 }];
  } finally {
    await worker.terminate();
  }
}

export async function runOcr(
  blob: Blob,
  mimeType: string,
  onProgress?: (p: number) => void,
): Promise<OcrOutcome> {
  let pages: OcrPageText[] = [];
  if (mimeType === "application/pdf") {
    pages = await pdfToText(blob);
    const empty = pages.every((p) => p.text.trim().length < 20);
    if (empty) {
      // Scanned PDF with no embedded text layer.
      // TODO (limitation): rasterising every PDF page for OCR is heavy in-browser;
      // we surface manual entry instead of silently producing unreliable values.
      pages = [{ page: 1, text: "", confidence: 0 }];
    }
  } else {
    pages = await imageToText(blob, onProgress);
  }
  const candidates = pages.flatMap((p) => extractResults(p.text, p.page, p.confidence));
  return { pages, candidates, pageCount: pages.length };
}

const UNIT_RX =
  "(mg/dL|mg/dl|g/dL|g/dl|mmol/L|mmol/l|IU/mL|IU/ml|U/L|u/l|ng/mL|ng/ml|pg/mL|µg/dL|mcg/dL|%|mmHg|cells/µL|10\\^3/µL|/µL|fL|pg)";

/**
 * Line-oriented parser for typical printed lab tables:
 *   "Haemoglobin  13.4  g/dL  13.0 - 17.0"
 * Original textual values ("Negative", ">200", "1+") are always preserved.
 */
export function extractResults(
  text: string,
  page: number,
  confidence: number | null,
): ExtractedCandidate[] {
  const out: ExtractedCandidate[] = [];
  const lines = text
    .split(/\r?\n|(?<=\))\s{2,}/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && l.length < 200);

  const rx = new RegExp(
    `^([A-Za-z][A-Za-z0-9 ()\\-\\./%,'+]{2,45}?)[\\s:.\\-]+((?:[<>]=?\\s?)?\\d+(?:\\.\\d+)?|Negative|Positive|Trace|Nil|Absent|Present|Reactive|Non-Reactive|\\d\\+)\\s*${UNIT_RX}?\\s*(.*)$`,
    "i",
  );

  for (const line of lines) {
    const m = rx.exec(line);
    if (!m) continue;
    const testName = (m[1] ?? "").replace(/\s+/g, " ").trim();
    const resultValue = (m[2] ?? "").replace(/\s+/g, "");
    const unit = m[3] ?? "";
    const tail = (m[4] ?? "").trim();
    if (!testName || /^(page|patient|name|age|sex|date|report|ref|doctor|lab)\b/i.test(testName))
      continue;

    const numeric = /^\d+(\.\d+)?$/.test(resultValue) ? Number(resultValue) : null;
    const range = /(\d+(?:\.\d+)?)\s*[-–to]{1,2}\s*(\d+(?:\.\d+)?)/.exec(tail);

    out.push({
      testName,
      resultValue,
      numericValue: numeric,
      unit,
      referenceLow: range ? Number(range[1]) : null,
      referenceHigh: range ? Number(range[2]) : null,
      // Never fabricate a reference range — keep whatever the lab printed.
      referenceText: tail || "",
      flag: computeFlag(numeric, range ? Number(range[1]) : null, range ? Number(range[2]) : null),
      ocrConfidence: confidence,
      sourcePage: page,
      userVerified: false,
    });
  }
  // de-duplicate by test name (first occurrence wins)
  const seen = new Set<string>();
  return out.filter((c) => {
    const k = c.testName.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function computeFlag(value: number | null, low: number | null, high: number | null): string {
  if (value === null || (low === null && high === null)) return "unknown";
  if (low !== null && value < low) return "low";
  if (high !== null && value > high) return "high";
  return "normal";
}
