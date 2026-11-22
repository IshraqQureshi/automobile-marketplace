"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { bulkImportCatalogAction, type BulkImportResult } from "@/features/admin/catalog-actions";
import {
  BULK_KIND_CONFIG,
  catalogBulkTemplate,
  looksLikeBinary,
  NOT_CSV_MESSAGE,
  parseCatalogCsv,
  type CatalogBulkKind,
  type CatalogBulkParseResult,
} from "@/features/admin/catalog-bulk";
import { DialogFormActions, FieldLabel } from "./admin-ui";

const MAX_FILE_BYTES = 1024 * 1024;
const KINDS = Object.keys(BULK_KIND_CONFIG) as CatalogBulkKind[];

export function CatalogBulkUpload() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CatalogBulkKind>("brands");
  const [text, setText] = useState("");
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Validated live so the admin sees problems before anything is sent.
  const parsed: CatalogBulkParseResult = text.trim() ? parseCatalogCsv(text, kind) : { rows: [], issues: [] };

  function close() {
    setOpen(false);
    setText("");
    setResult(null);
    setFileError(null);
  }

  async function onFile(file: File | undefined) {
    setFileError(null);
    setResult(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError("File is too large (max 1 MB).");
      return;
    }
    const content = await file.text();
    if (looksLikeBinary(content)) {
      // Don't dump binary into the textarea — tell the admin what's wrong.
      setText("");
      setFileError(NOT_CSV_MESSAGE);
      return;
    }
    setText(content);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([catalogBulkTemplate(kind)], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${kind}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsed.rows.length === 0) return;
    startTransition(async () => {
      const res = await bulkImportCatalogAction(kind, parsed.rows);
      if (res.error) {
        // Keep the dialog open so the admin can fix the input and retry.
        setResult(res);
        toast.error(res.error);
        return;
      }
      const rejected = res.rejected.length > 0 ? `, ${res.rejected.length} rejected` : "";
      toast.success(`${res.added} added, ${res.skippedDuplicates} skipped${rejected}.`);
      close();
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Bulk upload
        </button>
      </div>

      <Dialog
        open={open}
        onClose={close}
        title="Bulk upload"
        description="Add many brands, models or types from a CSV. Existing records are skipped, never duplicated."
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <FieldLabel htmlFor="bulk-kind">What are you uploading?</FieldLabel>
            <select
              id="bulk-kind"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as CatalogBulkKind);
                setResult(null);
              }}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {BULK_KIND_CONFIG[k].label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              Columns: <code>{BULK_KIND_CONFIG[kind].header}</code>
              {kind === "models" && " — the brand must already exist."}{" "}
              <button type="button" onClick={downloadTemplate} className="font-medium text-brand underline">
                Download template
              </button>
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="bulk-file">CSV file</FieldLabel>
            <input
              id="bulk-file"
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(e) => void onFile(e.target.files?.[0])}
              className="block w-full text-sm"
            />
            {fileError && <p className="mt-1 text-sm text-red-600">{fileError}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="bulk-text">…or paste rows</FieldLabel>
            <textarea
              id="bulk-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setResult(null);
              }}
              rows={6}
              placeholder={BULK_KIND_CONFIG[kind].example}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
            />
          </div>

          {text.trim() && (
            <div className="rounded-md bg-neutral-50 p-3 text-sm" aria-live="polite">
              <p className="font-medium text-neutral-800">
                {parsed.rows.length} valid row{parsed.rows.length === 1 ? "" : "s"}
                {parsed.issues.length > 0 && `, ${parsed.issues.length} with problems (will be skipped)`}
              </p>
              {parsed.issues.length > 0 && (
                <ul className="mt-1 max-h-28 list-disc overflow-y-auto pl-5 text-red-600">
                  {parsed.issues.slice(0, 50).map((issue) => (
                    <li key={`${issue.line}-${issue.message}`}>{issue.line > 0 ? `Line ${issue.line}: ` : ""}{issue.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {result && !result.error && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800" role="status">
              <p className="font-medium">
                {result.added} added · {result.skippedDuplicates} duplicate{result.skippedDuplicates === 1 ? "" : "s"} skipped
                {result.rejected.length > 0 && ` · ${result.rejected.length} rejected`}
              </p>
              {result.rejected.length > 0 && (
                <ul className="mt-1 max-h-28 list-disc overflow-y-auto pl-5 text-red-600">
                  {result.rejected.slice(0, 50).map((r, i) => (
                    <li key={i}>{r.brand ? `${r.brand} / ` : ""}{r.name}: {r.reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {result?.error && <p className="text-sm text-red-600">{result.error}</p>}

          <DialogFormActions pending={pending} submitLabel={`Import ${parsed.rows.length || ""}`.trim()} onCancel={close} />
        </form>
      </Dialog>
    </>
  );
}
