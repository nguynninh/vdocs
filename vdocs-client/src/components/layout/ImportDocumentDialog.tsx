"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  FileDown,
  FileText,
  HelpCircle,
  Link2,
  NotebookText,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = ".md,.markdown,.txt";
const MAX_FILE_SIZE_MB = 20;

type ImportSource = "device" | "link" | "notion" | "confluence" | "markdown";
type ImportLocation = "currentPage" | "workspaceRoot";
type DialogStep = "browse" | "confirm" | "converting" | "complete";

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}
type StepDotState = "done" | "active" | "pending";

function StepDot({ state }: { state: StepDotState }) {
  if (state === "done") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4F6DF5] text-white">
        <Check className="size-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4F6DF5] text-white">
        <span className="size-2.5 rounded-full bg-white" />
      </span>
    );
  }
  return <span className="size-8 shrink-0 rounded-full border-2 border-border" />;
}

const SOURCE_OPTIONS: { key: ImportSource; icon: typeof UploadCloud }[] = [
  { key: "device", icon: UploadCloud },
  { key: "link", icon: Link2 },
  { key: "notion", icon: NotebookText },
  { key: "confluence", icon: NotebookText },
  { key: "markdown", icon: FileDown },
];

export interface ImportDocumentValues {
  source: ImportSource;
  file?: File;
  link?: string;
  keepHeadingStructure: boolean;
  importLocation: ImportLocation;
  parentDocumentId?: string;
}

export interface ImportDocumentResult {
  documentId?: string;
}

export interface ImportDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (
    values: ImportDocumentValues
  ) => Promise<ImportDocumentResult | void> | ImportDocumentResult | void;
  currentPageId?: string;
  currentPageTitle?: string;
}

export default function ImportDocumentDialog({
  open,
  onOpenChange,
  onImport,
  currentPageId,
  currentPageTitle,
}: ImportDocumentDialogProps) {
  const t = useTranslations("sidebar");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<DialogStep>("browse");
  const [source, setSource] = useState<ImportSource>("device");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [keepHeadingStructure, setKeepHeadingStructure] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importLocation, setImportLocation] = useState<ImportLocation>(
    currentPageTitle ? "currentPage" : "workspaceRoot"
  );
  const [convertPercent, setConvertPercent] = useState(0);
  const [importResult, setImportResult] = useState<ImportDocumentResult | null>(null);
  const [importStats, setImportStats] = useState<{
    pageCount: number;
    processingTimeSec: number;
    fileSizeLabel: string;
  } | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversionStartedAtRef = useRef(0);

  useEffect(() => {
    return () => stopProgressSimulation();
  }, []);

  // Land the user on the imported document automatically — waiting for a
  // click on "Open document" here made a successful import look like it
  // vanished, since the sidebar's document list isn't refetched on its own.
  useEffect(() => {
    if (step !== "complete") return;

    const targetId = importResult?.documentId ?? currentPageId;
    if (!targetId) return;

    const timer = setTimeout(() => {
      handleOpenChange(false);
      router.push(`/document/${targetId}`);
    }, 900);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, importResult, currentPageId]);

  function stopProgressSimulation() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  function resetState() {
    stopProgressSimulation();
    setStep("browse");
    setSource("device");
    setFile(null);
    setLink("");
    setKeepHeadingStructure(true);
    setIsDraggingOver(false);
    setError(null);
    setConvertPercent(0);
    setImportResult(null);
    setImportStats(null);
    setImportLocation(currentPageTitle ? "currentPage" : "workspaceRoot");
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  function handleFileSelected(selected: File | null) {
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(t("importFileTooLarge", { size: MAX_FILE_SIZE_MB }));
      return;
    }

    setError(null);
    setFile(selected);
    setStep("confirm");
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFileSelected(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    handleFileSelected(event.dataTransfer.files?.[0] ?? null);
  }

  function handleRemoveFile() {
    setFile(null);
    setStep("browse");
  }

  function handleCancelConversion() {
    stopProgressSimulation();
    setIsSubmitting(false);
    setConvertPercent(0);
    setStep("confirm");
  }

  async function handleImport() {
    if (isSubmitting) return;
    if (source === "device" && !file) return;
    if (source === "link" && !link.trim()) return;

    setError(null);
    setIsSubmitting(true);
    setConvertPercent(0);
    setStep("converting");
    conversionStartedAtRef.current = Date.now();

    progressIntervalRef.current = setInterval(() => {
      setConvertPercent((prev) => (prev >= 95 ? prev : prev + Math.random() * 10));
    }, 300);

    try {
      const result = await onImport?.({
        source,
        file: file ?? undefined,
        link: link.trim() || undefined,
        keepHeadingStructure,
        importLocation,
        parentDocumentId: importLocation === "currentPage" ? currentPageId : undefined,
      });
      stopProgressSimulation();
      setConvertPercent(100);
      setImportResult(result ?? null);
      setImportStats({
        pageCount: Math.max(1, Math.round((file?.size ?? 2000) / 3000)),
        processingTimeSec: Math.max(1, Math.round((Date.now() - conversionStartedAtRef.current) / 1000)),
        fileSizeLabel: formatFileSize(file?.size ?? 0),
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStep("complete");
    } catch (err) {
      stopProgressSimulation();
      setError(err instanceof Error ? err.message : t("importDocumentError"));
      setStep("confirm");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canImport =
    (source === "device" && !!file) || (source === "link" && !!link.trim());

  if (step === "converting") {
    const isDone = convertPercent >= 100;

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-1 pt-2 text-center">
            <RefreshCw
              className={cn("size-8 text-[#4F6DF5]", !isDone && "animate-spin")}
              strokeWidth={1.75}
            />
            <DialogTitle className="mt-2">{t("importConvertingTitle")}</DialogTitle>
            <DialogDescription>{t("importConvertingDescription")}</DialogDescription>
          </div>

          <div className="mt-6 flex items-center">
            <StepDot state="done" />
            <div className="h-0.5 flex-1 bg-[#4F6DF5]" />
            <StepDot state={isDone ? "done" : "active"} />
            <div
              className={cn(
                "h-0.5 flex-1",
                isDone ? "bg-[#4F6DF5]" : "border-t border-dashed border-border"
              )}
            />
            <StepDot state={isDone ? "done" : "pending"} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-medium text-foreground">{t("importStepUploaded")}</p>
              <p className="truncate text-muted-foreground">{file?.name}</p>
            </div>
            <div>
              <p className={cn("font-medium", isDone ? "text-foreground" : "text-[#4F6DF5]")}>
                {t("importStepConverting")}
              </p>
              <p className="text-muted-foreground">{t("importStepOf")}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">{t("importStepDone")}</p>
              <p className="text-muted-foreground">{t("importStepUpcoming")}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{t("importAnalyzing")}</span>
              <span className="font-medium text-foreground">{Math.round(convertPercent)}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#4F6DF5] transition-all"
                style={{ width: `${Math.min(convertPercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#EEF1FE] p-3 text-sm text-[#4F6DF5]">
            <Sparkles className="mt-0.5 size-4 shrink-0" />
            <div>
              <p>{t("importCanCloseLine1")}</p>
              <p>{t("importCanCloseLine2")}</p>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={handleCancelConversion} disabled={isDone}>
              {t("importCancelConversion")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === "complete" && file) {
    const convertedTitle = file.name.replace(/\.[^./]+$/, "");
    const fileExtLabel = (file.name.split(".").pop() ?? "").toUpperCase();

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <div className="flex flex-col items-center gap-1 pt-2 text-center">
            <div className="relative flex size-20 items-center justify-center">
              <Sparkles className="absolute -top-1 right-0 size-4 text-[#4F6DF5]" />
              <span className="absolute top-2 left-0 size-1.5 rounded-full bg-[#4F6DF5]" />
              <span className="absolute bottom-1 left-3 size-1.5 rounded-full bg-emerald-500" />
              <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="size-9 text-emerald-600" strokeWidth={1.75} />
              </span>
            </div>
            <DialogTitle className="mt-2 text-xl">{t("importCompleteTitle")}</DialogTitle>
            <DialogDescription>{t("importCompleteDescription")}</DialogDescription>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border p-3">
            <div className="flex flex-1 items-center gap-3 overflow-hidden">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF1FE] text-[#4F6DF5]">
                <FileText className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{file.name}</span>
                <span className="text-xs text-muted-foreground">{fileExtLabel}</span>
              </div>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 items-center gap-3 overflow-hidden">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <FileText className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{convertedTitle}</span>
                <span className="text-xs text-muted-foreground">{t("importInteractiveDocument")}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {[
              { label: t("importStatTotalPages"), value: t("importStatPagesValue", { count: importStats?.pageCount ?? 0 }) },
              { label: t("importStatProcessingTime"), value: t("importStatSecondsValue", { seconds: importStats?.processingTimeSec ?? 0 }) },
              { label: t("importStatFileSize"), value: importStats?.fileSizeLabel ?? "" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  {row.label}
                </span>
                <span className="text-muted-foreground">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const targetId = importResult?.documentId ?? currentPageId;
                handleOpenChange(false);
                if (targetId) router.push(`/document/${targetId}`);
              }}
            >
              <ExternalLink className="size-4" />
              {t("importOpenDocument")}
            </Button>
            <Button onClick={() => handleOpenChange(false)}>{t("importDone")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === "confirm" && file) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-1 pt-2 text-center">
            <FileText className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <DialogTitle className="mt-2">{t("importConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("importConfirmDescription")}</DialogDescription>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t("importSelectedFile")}</span>
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{file.name}</span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label={t("importRemoveFile")}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t("importLocationLabel")}</span>
            <select
              value={importLocation}
              onChange={(event) => setImportLocation(event.target.value as ImportLocation)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#4F6DF5]"
            >
              {currentPageTitle && (
                <option value="currentPage">
                  {t("importLocationCurrentPage", { title: currentPageTitle })}
                </option>
              )}
              <option value="workspaceRoot">{t("importLocationWorkspaceRoot")}</option>
            </select>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <Button className="mt-5 w-full" disabled={isSubmitting} onClick={handleImport}>
            {isSubmitting ? t("importing") : t("importContinue")}
          </Button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <HelpCircle className="size-3.5" />
            {t("importLearnMore")}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("importDocumentTitle")}</DialogTitle>
          <DialogDescription>{t("importDocumentDescription")}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex gap-4">
          <div className="flex w-40 shrink-0 flex-col gap-1">
            {SOURCE_OPTIONS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSource(key)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  source === key
                    ? "bg-[#EEF1FE] text-[#4F6DF5]"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-4" strokeWidth={2.25} />
                {t(`importSource_${key}`)}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-col gap-4">
            {source === "device" && (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                  isDraggingOver ? "border-[#4F6DF5] bg-[#EEF1FE]" : "border-border"
                )}
              >
                <UploadCloud className="size-8 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground">{t("importDropHint")}</p>
                <p className="text-xs text-muted-foreground">{t("or")}</p>
                <Button type="button" onClick={() => fileInputRef.current?.click()}>
                  {t("importChooseFile")}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  className="hidden"
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  {t("importSupportedFormats", { size: MAX_FILE_SIZE_MB })}
                </p>
              </div>
            )}

            {source === "link" && (
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="import-link">
                  {t("importLinkLabel")}
                </label>
                <Input
                  id="import-link"
                  value={link}
                  placeholder={t("importLinkPlaceholder")}
                  onChange={(event) => setLink(event.target.value)}
                />
              </div>
            )}

            {(source === "notion" || source === "confluence" || source === "markdown") && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  {t(`importSource_${source}`)}
                </p>
                <p className="text-xs text-muted-foreground">{t("importComingSoon")}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">{t("importOptionsTitle")}</span>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={keepHeadingStructure}
                  onChange={(event) => setKeepHeadingStructure(event.target.checked)}
                  className="size-4 rounded border-border accent-[#4F6DF5]"
                />
                {t("importKeepHeadingStructure")}
              </label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        {source === "link" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button disabled={!canImport || isSubmitting} onClick={handleImport}>
              {isSubmitting ? t("importing") : t("import")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
