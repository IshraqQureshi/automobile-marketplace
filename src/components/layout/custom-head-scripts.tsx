import { createElement } from "react";
import { headers } from "next/headers";
import { parseHeadSnippet, shouldInjectHeadScripts, toReactProps } from "@/lib/head-scripts";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { getSystemSettingString } from "@/lib/system-settings";

/**
 * Renders the admin-configured snippet (/admin/settings → "Head scripts")
 * into <head> on public pages — see src/lib/head-scripts.ts for what's
 * allowed and why it's re-emitted as real elements rather than raw HTML.
 * Renders nothing when unset, on excluded paths (admin/dashboard/auth), or
 * if the stored value somehow no longer parses (it's validated on save, so
 * that would only be a hand-edited row) — never throws into the layout.
 */
export async function CustomHeadScripts() {
  const pathname = (await headers()).get("x-pathname");
  if (!shouldInjectHeadScripts(pathname)) return null;

  const supabase = await createClient();
  const snippet = await getSystemSettingString(supabase, "custom_head_scripts");
  if (!snippet.trim()) return null;

  const parsed = parseHeadSnippet(snippet);
  if (!parsed.ok) {
    logger.warn("Stored custom_head_scripts no longer parses; skipping injection", { error: parsed.error });
    return null;
  }

  return (
    <>
      {parsed.elements.map((element, index) => {
        const props = toReactProps(element.attrs);
        if (!("inline" in element)) return createElement(element.tag, { key: index, ...props });
        return createElement(element.tag, { key: index, ...props, dangerouslySetInnerHTML: { __html: element.inline } });
      })}
    </>
  );
}
