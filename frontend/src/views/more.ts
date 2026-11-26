import { t } from "../i18n/hr";
import { pageTitle } from "../ui/components";
import { h } from "../ui/dom";

const ITEMS = [
  ["#/pjesme", t.nav.songs, "♪"],
  ["#/citanje", t.nav.reading, "❡"],
  ["#/razgovor", t.nav.conversation, "💬"],
  ["#/gramatika", t.nav.grammar, "§"],
  ["#/rijeci-dana", t.nav.daily, "☀"],
  ["#/napredak", t.nav.progress, "↗"],
  ["#/postavke", t.nav.settings, "⚙"],
] as const;

export function moreView(): Node {
  return h(
    "div",
    { class: "page" },
    pageTitle(t.nav.more),
    h(
      "ul",
      { class: "menu" },
      ITEMS.map(([href, label, icon]) =>
        h("li", null, h("a", { href, class: "menu-item" }, h("span", { class: "menu-icon", "aria-hidden": "true" }, icon), label)),
      ),
    ),
  );
}
