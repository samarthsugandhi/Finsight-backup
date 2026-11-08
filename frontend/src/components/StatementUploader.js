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
} from "lucide-react";
import { api } from "@/lib/api";
import { useFinance } from "@/context/FinanceContext";

// Strict PDF mime type and extension check
const ACCEPTED = ["application/pdf", "application/x-pdf"];

function isValidPdf(file) {
  return ACCEPTED.includes(file.type) || file.name.toLowerCase().endsWith(".pdf");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Drag-and-drop PDF upload component.
 * Emits { totalFound, categorized, queuedForReview, duplicatesSkipped } on success via onProcessed.
 */
export default function StatementUploader({ onProcessed }) {
  const { refetch } = useFinance();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!isValidPdf(f)) {
      setErrorMsg("Only PDF files are accepted.");
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
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("statement", file);
      const data = await api.statements.upload(formData);
      setStatus("success");
      setResult(data.data);
      // Revalidate finance state in real time for any auto-categorized records
      refetch?.();
      onProcessed?.(data.data);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Upload failed. Please try again.");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-signal-pos/40 bg-signal-pos/5 px-8 py-10 text-center"
          >
            <CheckCircle className="h-10 w-10 text-signal-pos" strokeWidth={1.5} />
            <p className="font-screamer text-xl tracking-wide text-ink">
              Statement Processed!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-ink-soft">
              <span>
                <span className="font-figure font-semibold text-ink">{result?.totalFound ?? 0}</span> extracted
              </span>
              <span>
                <span className="font-figure font-semibold text-signal-pos">{result?.categorized ?? 0}</span> auto-categorized
              </span>
              <span>
                <span className="font-figure font-semibold text-horizon">{result?.queuedForReview ?? 0}</span> in review queue
              </span>
              {result?.duplicatesSkipped > 0 && (
                <span>
                  <span className="font-figure font-semibold text-amber-500">{result.duplicatesSkipped}</span> duplicates skipped
                </span>
              )}
            </div>
            <button
              onClick={reset}
              className="mt-2 text-xs text-ink-soft underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
            >
              Upload another statement
            </button>
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
            className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
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
              accept=".pdf,application/pdf"
              onChange={handleInputChange}
              className="sr-only"
              id="statement-upload-input"
              aria-label="Upload bank statement PDF"
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
                  <FileText className="h-10 w-10 text-horizon" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-semibold text-ink">{file.name}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{formatBytes(file.size)}</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                      disabled={status === "loading"}
                      id="upload-statement-btn"
                      className="inline-flex items-center gap-2 rounded-lg bg-horizon px-5 py-2 text-sm font-semibold text-[#0f1b33] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {status === "loading" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Parsing PDF…</>
                      ) : (
                        <><UploadCloud className="h-4 w-4" /> Import Statement</>
                      )}
                    </motion.button>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      id="clear-statement-btn"
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:text-ink transition-colors cursor-pointer"
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
                      className={`h-12 w-12 transition-colors ${dragging ? "text-horizon" : "text-ink-soft/40"}`}
                      strokeWidth={1.25}
                    />
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {dragging ? "Drop your PDF here" : "Drag & drop your bank statement"}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      or{" "}
                      <span className="text-horizon underline underline-offset-2 cursor-pointer">
                        browse to upload
                      </span>{" "}
                      — PDF only, max 10 MB
                    </p>
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
            className="mt-3 flex items-center gap-2 rounded-lg border border-signal-neg/30 bg-signal-neg/8 px-4 py-3 text-sm text-signal-neg"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg || "An unexpected error occurred."}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
