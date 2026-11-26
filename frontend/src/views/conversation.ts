import { ai } from "../api/client";
import { getRow, listRows, logActivity, putRow, saveMistake } from "../db/repo";
import { getSettings } from "../db/settings";
import { t } from "../i18n/hr";
import { formatDate } from "../lib/dates";
import { newId } from "../lib/id";
import { overallLevel } from "../lib/levels";
import { navigate, type RouteContext } from "../router";
import { bilingual, emptyState, entryCard, notice, pageTitle, tappableText, withAi, withEn } from "../ui/components";
import { h, replace } from "../ui/dom";
import type { Conversation } from "../types";
import { lookupWord } from "./lookup";

export async function conversationsView(): Promise<Node> {
  const conversations = await listRows("conversations");
  const status = h("div");
  return h(
    "div",
    { class: "page" },
    pageTitle(t.nav.conversation, "#/vise"),
    h(
      "button",
      {
        class: "btn primary",
        type: "button",
        onClick: async () => {
          const { levels } = await getSettings();
          const level = overallLevel(levels);
          const recentScenarios = conversations.slice(0, 20).map((c) => c.scenario.hr);
          const out = await withAi(status, () => ai("conversation_start", { level, recentScenarios }));
          if (!out) return;
          const conv: Conversation = {
            id: newId(),
            createdAt: new Date().toISOString(),
            level,
            scenario: out.scenario,
            aiRole: out.aiRole,
            userRole: out.userRole,
            messages: [{ role: "ai", text: out.opening }],
            feedback: null,
          };
          await putRow("conversations", conv);
          navigate(`/razgovor/${conv.id}`);
        },
      },
      t.conversation.newConversation,
    ),
    status,
    h("h2", null, t.conversation.past),
    conversations.length
      ? h(
          "ul",
          { class: "plain-list" },
          conversations.map((c) =>
            h(
              "li",
              null,
              h(
                "a",
                { class: "card link-card", href: `#/razgovor/${c.id}` },
                c.scenario.hr,
                h("small", { class: "muted" }, ` · ${formatDate(c.createdAt)}${c.feedback ? ` · ${t.conversation.finished}` : ""}`),
              ),
            ),
          ),
        )
      : emptyState(),
  );
}

function bubble(role: "ai" | "user", text: string): HTMLElement {
  return h(
    "div",
    { class: `msg ${role}` },
    role === "ai" ? tappableText(text, (w) => void lookupWord(w, text, "conversation")) : h("span", { lang: "hr" }, text),
  );
}

function feedbackSection(conv: Conversation): HTMLElement {
  const fb = conv.feedback!;
  return h(
    "section",
    { class: "card feedback-card" },
    h("h2", null, t.conversation.feedback),
    bilingual(fb.summary),
    h("h3", null, t.conversation.mistakes),
    fb.mistakes.length
      ? [
          h(
            "ul",
            { class: "mistakes" },
            fb.mistakes.map((m) =>
              h("li", null, h("s", { lang: "hr" }, m.wrong), " → ", h("b", { lang: "hr" }, m.correct), bilingual(m.explanation)),
            ),
          ),
          notice(t.warn.mistakesSaved, "ok"),
        ]
      : h("p", null, t.conversation.noMistakes),
    fb.newWords.length ? [h("h3", null, t.conversation.newWords), fb.newWords.map((e) => entryCard(e, "conversation"))] : null,
  );
}

export async function conversationView(ctx: RouteContext): Promise<Node> {
  const conv = await getRow("conversations", ctx.params.id ?? "");
  if (!conv) return emptyState();

  const log = h("div", { class: "chat" }, conv.messages.map((m) => bubble(m.role, m.text)));
  const status = h("div");
  const page = h(
    "div",
    { class: "page conversation" },
    pageTitle(t.nav.conversation, "#/razgovor"),
    h(
      "section",
      { class: "card scenario" },
      h("h2", null, t.conversation.scenario),
      withEn(conv.scenario),
      h("p", null, h("b", null, `${t.conversation.yourRole}: `), conv.userRole.hr, h("small", { class: "en-sub" }, conv.userRole.en)),
      h("p", null, h("b", null, `${t.conversation.partnerRole}: `), conv.aiRole.hr, h("small", { class: "en-sub" }, conv.aiRole.en)),
    ),
    log,
    status,
  );

  if (conv.feedback) {
    page.append(feedbackSection(conv));
    return page;
  }

  const input = h("textarea", { class: "input", rows: 2, lang: "hr", placeholder: t.conversation.placeholder, "aria-label": t.conversation.placeholder });
  const send = h("button", { class: "btn primary", type: "submit" }, t.conversation.send);
  const finish = h("button", { class: "btn", type: "button" }, t.conversation.finish);
  const form = h(
    "form",
    {
      class: "chat-input",
      onSubmit: async (e: Event) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        conv.messages.push({ role: "user", text });
        log.append(bubble("user", text));
        input.value = "";
        await putRow("conversations", conv);
        send.disabled = true;
        const out = await withAi(status, () =>
          ai("conversation_reply", {
            level: conv.level,
            scenario: conv.scenario.hr,
            aiRole: conv.aiRole.hr,
            messages: conv.messages,
          }),
        );
        send.disabled = false;
        if (!out) return;
        conv.messages.push({ role: "ai", text: out.reply });
        log.append(bubble("ai", out.reply));
        await putRow("conversations", conv);
        input.focus();
      },
    },
    input,
    h("div", { class: "row" }, send, finish),
  );

  finish.addEventListener("click", async () => {
    if (!conv.messages.some((m) => m.role === "user")) return;
    finish.disabled = true;
    const out = await withAi(status, () =>
      ai("conversation_feedback", { level: conv.level, scenario: conv.scenario.hr, messages: conv.messages }),
    );
    finish.disabled = false;
    if (!out) return;
    conv.feedback = out;
    await putRow("conversations", conv);
    for (const m of out.mistakes) await saveMistake(m);
    await logActivity("conversation");
    form.remove();
    replace(status);
    page.append(feedbackSection(conv));
  });

  page.append(form);
  return page;
}
