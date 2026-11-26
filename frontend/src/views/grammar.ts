import { ai } from "../api/client";
import { currentGoals } from "../features/weekly";
import { allWords, getRow, listRows, logActivity, putRow } from "../db/repo";
import { getSettings } from "../db/settings";
import { t } from "../i18n/hr";
import { formatDate } from "../lib/dates";
import { newId } from "../lib/id";
import { navigate, type RouteContext } from "../router";
import { emptyState, pageTitle, withAi } from "../ui/components";
import { h } from "../ui/dom";
import type { DrillSet } from "../types";
import { exercise } from "./exercise";

const DRILLS_PER_SET = 20;

/** Prepare a set of drills from the user's own words (one Haiku call); they work offline afterwards. */
export async function prepareDrills(now = new Date()): Promise<DrillSet> {
  const [{ levels }, words, goals] = await Promise.all([getSettings(), allWords(), currentGoals()]);
  const grammarGoal = goals?.goals.find((g) => g.subject === "grammar")?.goal.hr ?? null;
  const out = await ai("drills", {
    level: levels.grammar,
    words: words
      .filter((w) => w.kind === "word")
      .slice(0, 100)
      .map((w) => ({ croatian: w.croatian, translation: w.translation })),
    focus: grammarGoal,
    count: DRILLS_PER_SET,
  });
  const set: DrillSet = { id: newId(), createdAt: now.toISOString(), drills: out.drills, results: {} };
  await putRow("drillSets", set);
  return set;
}

export async function grammarView(): Promise<Node> {
  const sets = await listRows("drillSets");
  const status = h("div");
  return h(
    "div",
    { class: "page" },
    pageTitle(t.nav.grammar, "#/vise"),
    h(
      "section",
      { class: "card" },
      h("p", { class: "muted" }, t.grammar.needWords),
      h(
        "button",
        {
          class: "btn primary",
          type: "button",
          onClick: async () => {
            const set = await withAi(status, () => prepareDrills());
            if (set) navigate(`/gramatika/${set.id}`);
          },
        },
        t.grammar.prepare,
      ),
      status,
    ),
    h("h2", null, t.grammar.sets),
    sets.length
      ? h(
          "ul",
          { class: "plain-list" },
          sets.map((s) => {
            const done = Object.keys(s.results).length;
            const right = Object.values(s.results).filter((r) => r.correct).length;
            return h(
              "li",
              null,
              h(
                "a",
                { class: "card link-card", href: `#/gramatika/${s.id}` },
                `${formatDate(s.createdAt)} · ${s.drills.length} ${t.grammar.drills}`,
                done ? h("small", { class: "muted" }, ` · ${t.grammar.result}: ${right}/${done}`) : null,
              ),
            );
          }),
        )
      : emptyState(),
  );
}

export async function drillSetView(ctx: RouteContext): Promise<Node> {
  const set = await getRow("drillSets", ctx.params.id ?? "");
  if (!set) return emptyState();
  return h(
    "div",
    { class: "page" },
    pageTitle(t.nav.grammar, "#/gramatika"),
    set.drills.map((d, i) =>
      h(
        "div",
        { class: "drill", "data-kind": d.kind },
        h("small", { class: "badge" }, d.kind === "case" ? t.grammar.cases : t.grammar.aspect),
        exercise(
          { instruction: d.instruction, question: d.sentence, hint: d.hint, options: d.options, answer: d.answer, explanation: d.explanation },
          async (value, correct) => {
            set.results[i] = { value, correct };
            await putRow("drillSets", set);
            await logActivity("drill", new Date(), correct);
          },
          set.results[i],
        ),
      ),
    ),
  );
}
