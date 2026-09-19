"use client";

import { useState, useTransition } from "react";
import { FieldLabel, SectionHeader } from "@/components/admin/admin-ui";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { updateHeadScriptsAction } from "@/features/admin/settings-actions";
import { headScriptsFieldSchemas } from "@/features/admin/settings-schemas";

interface HeadScriptsFormProps {
  customHeadScripts: string;
}

export function HeadScriptsForm({ customHeadScripts }: HeadScriptsFormProps) {
  const toast = useToast();
  const { validate, errorFor } = useFieldValidation(headScriptsFieldSchemas);
  const [value, setValue] = useState(customHeadScripts);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!headScriptsFieldSchemas.customHeadScripts.safeParse(value).success) {
      validate("customHeadScripts", value);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("customHeadScripts", value);
      const result = await updateHeadScriptsAction(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Head scripts updated.");
      }
    });
  }

  return (
    <div className="mt-8">
      <SectionHeader
        icon={<CodeIcon />}
        title="Head scripts"
        description="Paste tracking or verification snippets (Google Analytics, Tag Manager, Search Console…) to add to the <head> of every public page."
      />

      <form onSubmit={handleSubmit} className="max-w-2xl rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <FieldLabel htmlFor="custom-head-scripts">Head snippet</FieldLabel>
        <textarea
          id="custom-head-scripts"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => validate("customHeadScripts", e.target.value)}
          rows={12}
          spellCheck={false}
          placeholder={'<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag(\'js\', new Date());\n  gtag(\'config\', \'G-XXXXXXXXXX\');\n</script>'}
          className={`w-full rounded-md border px-3 py-2.5 font-mono text-xs leading-relaxed outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand ${errorFor("customHeadScripts") ? "border-red-400" : "border-neutral-300"}`}
        />
        {errorFor("customHeadScripts") && <p className="mt-1 text-sm text-red-600">{errorFor("customHeadScripts")}</p>}
        <p className="mt-1.5 text-xs text-neutral-400">
          Allowed tags: &lt;script&gt;, &lt;style&gt;, &lt;meta&gt;, &lt;link&gt;, &lt;noscript&gt;. Added to public pages when a visitor loads them — not to the
          admin panel, showroom dashboard, customer account, or login, registration and password pages. It&apos;s decided on each full page load, so a
          visitor moving between those page types without reloading may keep (or not yet have) the scripts until their next load. Leave empty to remove.
        </p>
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          These scripts run for every visitor. Only paste code from a source you trust — a malicious script could read what visitors type or redirect them.
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save head scripts"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5" aria-hidden="true">
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </svg>
  );
}
