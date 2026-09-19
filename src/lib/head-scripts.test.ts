import { describe, expect, it } from "vitest";
import { parseHeadSnippet, shouldInjectHeadScripts, toReactProps } from "./head-scripts";

const GA4 = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ABC123');
</script>`;

describe("parseHeadSnippet", () => {
  it("parses a real Google Analytics 4 snippet (external + inline script, comment ignored)", () => {
    const result = parseHeadSnippet(GA4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.elements).toHaveLength(2);
    expect(result.elements[0]).toEqual({
      tag: "script",
      attrs: { async: true, src: "https://www.googletagmanager.com/gtag/js?id=G-ABC123" },
      inline: "",
    });
    expect(result.elements[1]!.tag).toBe("script");
    expect((result.elements[1] as { inline: string }).inline).toContain("gtag('config', 'G-ABC123');");
  });

  it("parses Search Console verification meta tags (void tag, with and without self-closing slash)", () => {
    const result = parseHeadSnippet(`<meta name="google-site-verification" content="abc123" />\n<meta name='x' content=y>`);
    expect(result).toEqual({
      ok: true,
      elements: [
        { tag: "meta", attrs: { name: "google-site-verification", content: "abc123" } },
        { tag: "meta", attrs: { name: "x", content: "y" } },
      ],
    });
  });

  it("does not stop an inline script at a '>' inside a quoted attribute or string", () => {
    const result = parseHeadSnippet(`<script data-x="a>b">var s = "</div>";</script>`);
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.elements[0] as { inline: string }).inline).toBe('var s = "</div>";');
  });

  it("parses GTM's head script and its noscript fallback", () => {
    const result = parseHeadSnippet(
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];})(window,document,'script','dataLayer','GTM-XXXX');</script><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXX"></iframe></noscript>`,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.elements.map((e) => e.tag)).toEqual(["script", "noscript"]);
  });

  it("returns no elements for an empty/whitespace snippet", () => {
    expect(parseHeadSnippet("  \n ")).toEqual({ ok: true, elements: [] });
  });

  it.each([
    ["a disallowed tag", `<iframe src="https://x"></iframe>`, "isn't allowed"],
    ["stray text", `hello <script></script>`, "Only HTML tags"],
    ["an unclosed script", `<script>alert(1)`, "missing its closing"],
    ["an unterminated tag", `<script src="x"`, `missing its closing ">"`],
    ["an unclosed comment", `<!-- oops <script></script>`, "Unclosed HTML comment"],
    ["an inline event handler", `<link rel="x" onload="alert(1)">`, "event handler"],
  ])("rejects %s", (_label, input, message) => {
    const result = parseHeadSnippet(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });
});

describe("toReactProps", () => {
  it("maps HTML attribute names to React prop names and leaves the rest alone", () => {
    expect(toReactProps({ crossorigin: "anonymous", "http-equiv": "refresh", async: true, "data-id": "1", src: "x" })).toEqual({
      crossOrigin: "anonymous",
      httpEquiv: "refresh",
      async: true,
      "data-id": "1",
      src: "x",
    });
  });
});

describe("shouldInjectHeadScripts", () => {
  it.each(["/", "/listing", "/honda/accord-123", "/showrooms/abc", "/privacy", "/register-showroom"])("injects on the public page %s", (path) => {
    expect(shouldInjectHeadScripts(path)).toBe(true);
  });

  it.each(["/admin", "/admin/settings", "/dashboard", "/dashboard/vehicles/1/edit", "/login", "/forgot-password", "/reset-password", "/api/cron/x", "/auth/callback"])(
    "does not inject on %s",
    (path) => {
      expect(shouldInjectHeadScripts(path)).toBe(false);
    },
  );

  it("fails closed when the pathname is unknown", () => {
    expect(shouldInjectHeadScripts(null)).toBe(false);
    expect(shouldInjectHeadScripts("")).toBe(false);
  });

  it("doesn't over-match a public path that merely starts with an excluded word", () => {
    expect(shouldInjectHeadScripts("/administration-costs")).toBe(true);
  });
});
