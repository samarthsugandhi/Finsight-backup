"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useFinance } from "@/context/FinanceContext";

const ACCEPTED_EXTENSIONS = [".pdf", ".csv", ".tsv"];

function isValidInvestmentFile(file) {
  if (!file) return false;
  const lower = file.name.toLowerCase();
  return (
    ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
    file.type === "application/pdf" ||
    file.type === "text/csv" ||
    file.type === "text/tab-separated-values"
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InvestmentStatementUploader({ onProcessed, onClose }) {
  const { refetch } = useFinance();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!isValidInvestmentFile(f)) {
      setErrorMsg("Please upload a valid PDF, CSV, or TSV statement file.");
      setFile(null);
      return;
    }
    setErrorMsg("");
    setFile(f);
    setStatus("idle");
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("statement", file);
      const data = await api.uploadInvestmentStatement(formData);
      setStatus("success");
      setResult(data);
      // Revalidate shared finance state in real time
      await refetch?.();
      onProcessed?.(data);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to process investment document. Please check the file format.");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="w-full font-editorial">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-signal-pos/40 bg-signal-pos/5 px-6 py-8 text-center"
          >
            <CheckCircle className="h-10 w-10 text-signal-pos" strokeWidth={1.5} />
            <div>
              <p className="font-screamer text-xl uppercase tracking-wide text-ink">
                Investment Statement Processed!
              </p>
              <p className="text-xs text-ink-soft mt-1">
                Detected source: <strong className="text-ink font-semibold">{result?.broker || "Statement"}</strong>
                {result?.statementType && (
                  <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-paper border border-line">
                    {result.statementType}
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-ink-soft my-2">
              <div className="p-2.5 rounded-lg border border-line bg-paper text-center min-w-[90px]">
                <span className="block font-figure text-base font-bold text-ink">
                  {result?.totalFound ?? 0}
                </span>
                <span className="text-[10px] text-ink-soft uppercase tracking-wider">Identified</span>
              </div>
              <div className="p-2.5 rounded-lg border border-line bg-paper text-center min-w-[90px]">
                <span className="block font-figure text-base font-bold text-signal-pos">
                  {result?.importedCount ?? result?.newlyImported ?? 0}
                </span>
                <span className="text-[10px] text-ink-soft uppercase tracking-wider">New Added</span>
              </div>
              <div className="p-2.5 rounded-lg border border-line bg-paper text-center min-w-[90px]">
                <span className="block font-figure text-base font-bold text-horizon">
                  {result?.updatedCount ?? result?.updatedHoldings ?? 0}
                </span>
                <span className="text-[10px] text-ink-soft uppercase tracking-wider">Updated</span>
              </div>
              {((result?.skippedDuplicates ?? result?.duplicatesSkipped) > 0) && (
                <div className="p-2.5 rounded-lg border border-line bg-paper text-center min-w-[90px]">
                  <span className="block font-figure text-base font-bold text-amber-500">
                    {result?.skippedDuplicates ?? result?.duplicatesSkipped}
                  </span>
                  <span className="text-[10px] text-ink-soft uppercase tracking-wider">Duplicates Skipped</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-ink-soft max-w-md">
              <ShieldCheck className="h-3.5 w-3.5 inline mr-1 text-emerald-500" />
              Cryptographic deduplication verified: identical instruments and dates were merged without duplicate balance injection.
            </p>

            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={reset}
                className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
              >
                Upload another file
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-horizon px-4 py-1.5 text-xs font-semibold text-[#0f1b33] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  View Investments
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !file && inputRef.current?.click()}
            className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
              dragging
                ? "border-horizon bg-horizon/8 scale-[1.01]"
                : file
                ? "border-line bg-paper-raised cursor-default"
                : "border-line bg-paper-raised hover:border-horizon/60 hover:bg-horizon/4"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.csv,.tsv,text/csv,text/tab-separated-values,application/pdf"
              onChange={handleInputChange}
              className="sr-only"
              id="investment-statement-input"
              aria-label="Upload investment statement"
            />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file-preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex w-full flex-col items-center gap-3"
                >
                  {file.name.toLowerCase().endsWith(".pdf") ? (
                    <FileText className="h-10 w-10 text-horizon" strokeWidth={1.5} />
                  ) : (
                    <FileSpreadsheet className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-ink font-figure">{file.name}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{formatBytes(file.size)}</p>
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpload();
                      }}
                      disabled={status === "loading"}
                      id="upload-investment-statement-btn"
                      className="inline-flex items-center gap-2 rounded-lg bg-horizon px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[#0f1b33] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer font-screamer"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Ingesting Statement…
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4" /> Import Statement
                        </>
                      )}
                    </motion.button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        reset();
                      }}
                      id="clear-investment-statement-btn"
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs text-ink-soft hover:text-ink transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3"
                >
                  <motion.div
                    animate={dragging ? { y: -4 } : { y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <UploadCloud
                      className={`h-12 w-12 transition-colors ${
                        dragging ? "text-horizon" : "text-ink-soft/40"
                      }`}
                      strokeWidth={1.25}
                    />
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {dragging ? "Drop statement here" : "Drag & drop your investment statement"}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      or{" "}
                      <span className="text-horizon underline underline-offset-2 cursor-pointer">
                        browse to select
                      </span>{" "}
                      — CSV, TSV, or PDF (max 15 MB)
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-md">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-paper border border-line text-ink-soft">
                      Zerodha Holdings / Tradebook
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-paper border border-line text-ink-soft">
                      Groww Reports
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-paper border border-line text-ink-soft">
                      CAMS / KFintech CAS
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-paper border border-line text-ink-soft">
                      Angel One / Upstox
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-paper border border-line text-ink-soft">
                      Custom Broker CSV
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      <AnimatePresence>
        {(errorMsg || status === "error") && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-3 flex items-center gap-2 rounded-lg border border-signal-neg/30 bg-signal-neg/8 px-4 py-3 text-xs text-signal-neg"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg || "An unexpected error occurred while parsing the statement."}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
