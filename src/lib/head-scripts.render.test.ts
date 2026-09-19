// Lives in its own *.render.test.ts because it needs the real
// react-dom/server, which throws under the `react-server` resolve condition
// the rest of the suite runs with (see vitest.config.ts's "render" project).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseHeadSnippet, toReactProps, type HeadElement } from "./head-scripts";

// The root layout renders the parsed result on every public page, and a React
// render error there takes the whole site down. The save action validates
// with this same parser, so "it saved" must imply "it renders" — enforced
// here by actually rendering, not by reasoning about which attributes React
// happens to dislike.
function render(elements: HeadElement[]): string {
  return renderToStaticMarkup(
    createElement(
      "head",
      null,
      elements.map((element, index) => {
        const props = toReactProps(element.attrs);
        if (!("inline" in element)) return createElement(element.tag, { key: index, ...props });
        return createElement(element.tag, { key: index, ...props, dangerouslySetInnerHTML: { __html: element.inline } });
      }),
    ),
  );
}

describe("every snippet that parses also renders (saves ⇒ renders)", () => {
  const CASES: Record<string, string> = {
    "GA4": `<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script><script>window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('config', 'G-ABC123');</script>`,
    "Search Console meta": `<meta name="google-site-verification" content="abc" />`,
    "GTM head + noscript": `<script>(function(){})();</script><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-X"></iframe></noscript>`,
    "Meta Pixel": `<script>!function(f,b){f.fbq=1}(window,document);fbq('init','123');</script><noscript><img height="1" width="1" src="https://www.facebook.com/tr?id=123"/></noscript>`,
    "Plausible": `<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>`,
    "preconnect link": `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    "style block": `<style media="print">.x{display:none}</style>`,
    "JSON-LD script": `<script type="application/ld+json">{"@context":"https://schema.org"}</script>`,
    "boolean + custom attrs": `<script async defer nomodule id="a" data-x="1" aria-hidden="true" src="/x.js"></script>`,
  };

  it.each(Object.entries(CASES))("%s", (_name, snippet) => {
    const parsed = parseHeadSnippet(snippet);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(() => render(parsed.elements)).not.toThrow();
  });

  // Proof the harness catches what it's for: these throw at render when fed to
  // React directly (they parsed fine before the attribute allow-list).
  it.each([
    ["a style attribute", { tag: "meta", attrs: { style: "color:red", name: "x" } }],
    ["a children attribute", { tag: "meta", attrs: { children: "x", name: "y" } }],
  ] as const)("(harness check) React itself throws on %s", (_label, element) => {
    expect(() => render([{ tag: element.tag, attrs: element.attrs } as HeadElement])).toThrow();
  });

  // ...which is why the parser must refuse them at save time.
  it.each([
    `<meta style="color:red" name="x">`,
    `<script style="a:b">1</script>`,
    `<meta children="x" name="y">`,
    `<script children="x">1</script>`,
    `<meta constructor="x" name="y">`,
    `<meta __proto__="x" name="y">`,
    `<meta key="k" ref="r" is="x" name="y">`,
  ])("rejects %s instead of letting it crash the layout", (snippet) => {
    expect(parseHeadSnippet(snippet).ok).toBe(false);
  });

  it("emits the expected real markup", () => {
    const parsed = parseHeadSnippet(`<meta name="google-site-verification" content="a&amp;b"><script async src="/x.js"></script><script>window.a = 1;</script>`);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const html = render(parsed.elements);
      expect(html).toContain('<meta name="google-site-verification" content="a&amp;b"/>');
      expect(html).toContain("<script>window.a = 1;</script>");
    }
  });
});
