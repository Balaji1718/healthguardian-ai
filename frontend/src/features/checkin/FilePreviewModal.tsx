import { useEffect, useState, useCallback, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  FileText,
  FileCheck,
  AlertCircle,
  Loader2,
  FileQuestion,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ConnectedFileEntry } from "@/services/localStorage/folderAccess";

export interface FilePreviewModalProps {
  entry: ConnectedFileEntry | null;
  allFiles: ConnectedFileEntry[];
  isOpen: boolean;
  onClose: () => void;
  onImportFile: (entry: ConnectedFileEntry) => Promise<void>;
  isImporting?: boolean;
}

export function FilePreviewModal({
  entry,
  allFiles,
  isOpen,
  onClose,
  onImportFile,
  isImporting = false,
}: FilePreviewModalProps) {
  const [currentEntry, setCurrentEntry] = useState<ConnectedFileEntry | null>(entry);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Zoom and transform controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Keep internal state synced with prop
  useEffect(() => {
    setCurrentEntry(entry);
    setZoomLevel(1);
    setRotation(0);
  }, [entry]);

  // Determine file kind
  const isImage =
    currentEntry?.type.startsWith("image/") ||
    Boolean(currentEntry?.name.match(/\.(png|jpg|jpeg|webp)$/i));
  const isPdf =
    currentEntry?.type === "application/pdf" || Boolean(currentEntry?.name.match(/\.pdf$/i));

  // Current file index for previous/next navigation
  const currentIndex = currentEntry ? allFiles.findIndex((f) => f.name === currentEntry.name) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allFiles.length - 1;

  // Load File object and generate Object URL
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (isOpen && currentEntry?.fileHandle) {
      setLoading(true);
      setLoadError(null);

      void (async () => {
        try {
          const file = await currentEntry.fileHandle!.getFile();
          if (!active) return;
          createdUrl = URL.createObjectURL(file);
          setObjectUrl(createdUrl);
        } catch (err: unknown) {
          if (!active) return;
          console.warn("Failed to load file for preview:", err);
          setLoadError("Could not read file from local folder.");
        } finally {
          if (active) setLoading(false);
        }
      })();
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, currentEntry]);

  // Clean up objectUrl on unmount or file switch
  const cleanupObjectUrl = useCallback(() => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
  }, [objectUrl]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      cleanupObjectUrl();
      const prev = allFiles[currentIndex - 1];
      if (prev) {
        setCurrentEntry(prev);
        setZoomLevel(1);
        setRotation(0);
      }
    }
  }, [hasPrevious, allFiles, currentIndex, cleanupObjectUrl]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      cleanupObjectUrl();
      const next = allFiles[currentIndex + 1];
      if (next) {
        setCurrentEntry(next);
        setZoomLevel(1);
        setRotation(0);
      }
    }
  }, [hasNext, allFiles, currentIndex, cleanupObjectUrl]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrevious, handleNext]);

  if (!isOpen || !currentEntry) {
    return null;
  }

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format date
  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-dialog-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {isPdf ? (
                <FileText className="size-4 text-red-500" />
              ) : isImage ? (
                <Sparkles className="size-4 text-primary" />
              ) : (
                <FileQuestion className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <h3
                id="preview-dialog-title"
                className="text-xs sm:text-sm font-semibold text-foreground truncate"
                title={currentEntry.name}
              >
                {currentEntry.name}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{formatSize(currentEntry.size)}</span>
                <span>•</span>
                <span>{currentEntry.type || "Document"}</span>
                <span>•</span>
                <span>{formatDate(currentEntry.lastModified)}</span>
                {currentEntry.isNew && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 text-primary border-primary/30 bg-primary/10"
                  >
                    New
                  </Badge>
                )}
                {currentEntry.isChanged && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 text-amber-500 border-amber-500/30 bg-amber-500/10"
                  >
                    Changed
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Top action controls: zoom, nav, close */}
          <div className="flex items-center gap-1 shrink-0">
            {isImage && objectUrl && (
              <div className="hidden sm:flex items-center gap-1 mr-2 p-0.5 rounded-lg bg-muted/60 border text-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="size-7"
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
                <span className="text-[10px] font-mono px-1 min-w-[32px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="size-7"
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                  className="size-7"
                  title="Reset zoom"
                  aria-label="Reset zoom"
                >
                  <Maximize2 className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="size-7"
                  title="Rotate"
                  aria-label="Rotate image"
                >
                  <RotateCw className="size-3.5" />
                </Button>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center gap-0.5 mr-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className="size-7"
                title="Previous file (Left Arrow)"
                aria-label="Previous file"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-[10px] text-muted-foreground font-mono px-1">
                {currentIndex + 1}/{allFiles.length}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={hasNext}
                className="size-7"
                title="Next file (Right Arrow)"
                aria-label="Next file"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Close */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
              title="Close preview (Escape)"
              aria-label="Close preview"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-[300px] max-h-[65vh] overflow-auto p-4 flex items-center justify-center bg-muted/20">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span>Loading preview from local device…</span>
            </div>
          )}

          {loadError && (
            <div className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center max-w-sm">
              <AlertCircle className="size-6" />
              <p className="font-semibold">{loadError}</p>
              <p className="text-[11px] text-muted-foreground">
                You can still try to import this file directly.
              </p>
            </div>
          )}

          {!loading && !loadError && isImage && objectUrl && (
            <div className="flex items-center justify-center size-full overflow-hidden">
              <img
                src={objectUrl}
                alt={currentEntry.name}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: "transform 0.15s ease-out",
                }}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          )}

          {!loading && !loadError && isPdf && objectUrl && (
            <div className="size-full flex flex-col items-center justify-center min-h-[400px]">
              <iframe
                src={`${objectUrl}#toolbar=0`}
                title={currentEntry.name}
                className="size-full min-h-[420px] rounded-lg border bg-background"
              />
            </div>
          )}

          {!loading && !loadError && !isImage && !isPdf && (
            <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border bg-card text-center max-w-md">
              <FileQuestion className="size-10 text-muted-foreground" />
              <div className="space-y-1">
                <h4 className="font-semibold text-sm text-foreground">Preview Not Available</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This file format ({currentEntry.name.split(".").pop() || "unknown"}) cannot be
                  visually rendered in the browser.
                </p>
              </div>

              <div className="w-full text-left p-3 rounded-xl bg-muted/40 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filename:</span>
                  <span className="font-mono text-foreground truncate max-w-[200px]">
                    {currentEntry.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-mono text-foreground">{formatSize(currentEntry.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modified:</span>
                  <span className="font-mono text-foreground">
                    {formatDate(currentEntry.lastModified)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isImporting}
              onClick={() => onImportFile(currentEntry)}
              className="text-xs h-8 px-4 gap-1.5 font-medium shadow-xs"
            >
              {isImporting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Importing & Analyzing…
                </>
              ) : (
                <>
                  <FileCheck className="size-3.5" /> Import this file →
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
