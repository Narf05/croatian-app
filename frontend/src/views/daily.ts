import { prepareDailyWords } from "../features/weekly";
import { listRows } from "../db/repo";
import { t } from "../i18n/hr";
import { localDate } from "../lib/dates";
import { batchFor, todaysWords } from "../lib/schedule";
import type { RouteContext } from "../router";
import { emptyState, entryCard, pageTitle, withAi } from "../ui/components";
import { h } from "../ui/dom";

export async function dailyView(ctx: RouteContext): Promise<Node> {
  const batches = await listRows("dailyBatches");
  const today = localDate(new Date());
  const words = todaysWords(batches, today);
  const status = h("div");
  const batch = batchFor(batches, today);
  return h(
    "div",
    { class: "page" },
    pageTitle(t.daily.title, "#/vise"),
    h("h2", null, t.home.todaysWords),
    words.length
      ? words.map((w) => entryCard(w, "daily"))
      : [
          emptyState(t.home.noDailyWords),
          h(
            "button",
            {
              class: "btn primary",
              type: "button",
              onClick: async () => {
                if (await withAi(status, () => prepareDailyWords())) ctx.refresh();
              },
            },
            t.home.prepareDailyWords,
          ),
          status,
        ],
    batch
      ? h(
          "details",
          { class: "card" },
          h("summary", null, t.daily.thisWeek),
          h(
            "ul",
            { class: "plain-list" },
            batch.words.map((w) => h("li", null, h("b", { lang: "hr" }, w.croatian), " – ", h("span", { lang: "en" }, w.translation))),
          ),
        )
      : null,
  );
}
