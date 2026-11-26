import "./styles.css";
import { t } from "./i18n/hr";
import { match, type RouteContext } from "./router";
import { translationBubble } from "./ui/bubble";
import { emptyState } from "./ui/components";
import { h, replace } from "./ui/dom";
import { registerViews } from "./views";

const TABS = [
  { id: "home", href: "#/", label: t.nav.home, icon: "⌂" },
  { id: "vocabulary", href: "#/vokabular", label: t.nav.vocabulary, icon: "▤" },
  { id: "translate", href: "#/prijevod", label: t.nav.translate, icon: "⇄" },
  { id: "lessons", href: "#/lekcije", label: t.nav.lessons, icon: "✎" },
  { id: "more", href: "#/vise", label: t.nav.more, icon: "⋯" },
];

function shell(): { main: HTMLElement; nav: HTMLElement } {
  const main = h("main", { id: "view", tabindex: "-1" });
  const nav = h(
    "nav",
    { class: "tabs", "aria-label": "Glavni izbornik" },
    TABS.map((tab) =>
      h(
        "a",
        { href: tab.href, "data-tab": tab.id },
        h("span", { class: "tab-icon", "aria-hidden": "true" }, tab.icon),
        h("span", null, tab.label),
      ),
    ),
  );
  document.body.append(main, translationBubble(), nav);
  return { main, nav };
}

async function render(main: HTMLElement, nav: HTMLElement): Promise<void> {
  const found = match(location.hash);
  for (const a of nav.querySelectorAll("a")) {
    a.toggleAttribute("aria-current", a.dataset.tab === found?.tab);
  }
  if (!found) {
    replace(main, emptyState());
    return;
  }
  const hash = location.hash;
  const ctx: RouteContext = {
    params: found.params,
    query: found.query,
    refresh: () => void render(main, nav),
  };
  const view = await found.view(ctx);
  // Ignore results of views the user already navigated away from.
  if (location.hash !== hash) return;
  replace(main, view);
}

export function start(): void {
  document.documentElement.lang = "hr";
  registerViews();
  const { main, nav } = shell();
  let lastPath = "";
  window.addEventListener("hashchange", () => {
    const path = location.hash.split("?")[0] ?? "";
    void render(main, nav).then(() => {
      if (path !== lastPath) window.scrollTo(0, 0);
      lastPath = path;
    });
  });
  void render(main, nav);
}

start();
