import { ai } from "../api/client";
import { deleteRow, getRow, listRows, putRow } from "../db/repo";
import { t } from "../i18n/hr";
import { newId } from "../lib/id";
import { navigate, type RouteContext } from "../router";
import { confirmDelete, emptyState, pageTitle, tappableText, withAi, withEn } from "../ui/components";
import { h } from "../ui/dom";
import type { Song } from "../types";
import { explainText, lookupWord } from "./lookup";

export async function songsView(): Promise<Node> {
  const songs = await listRows("songs");
  const title = h("input", { class: "input", id: "song-title", autocomplete: "off" });
  const lyrics = h("textarea", { class: "input", id: "song-lyrics", rows: 8, lang: "hr" });
  const status = h("div");
  return h(
    "div",
    { class: "page" },
    pageTitle(t.nav.songs, "#/vise"),
    h(
      "form",
      {
        class: "card",
        onSubmit: async (e: Event) => {
          e.preventDefault();
          if (!title.value.trim() || !lyrics.value.trim()) return;
          const out = await withAi(status, () =>
            ai("song_translate", { title: title.value.trim(), lyrics: lyrics.value.trim() }),
          );
          if (!out) return;
          const song: Song = {
            id: newId(),
            title: title.value.trim(),
            lyrics: lyrics.value.trim(),
            lines: out.lines,
            createdAt: new Date().toISOString(),
          };
          await putRow("songs", song);
          navigate(`/pjesme/${song.id}`);
        },
      },
      h("h2", null, t.songs.newSong),
      h("label", { for: "song-title" }, t.songs.title),
      title,
      h("label", { for: "song-lyrics" }, t.songs.lyrics),
      lyrics,
      h("button", { class: "btn primary", type: "submit" }, t.songs.translateSong),
      status,
    ),
    h("h2", null, t.songs.saved),
    songs.length
      ? h(
          "ul",
          { class: "plain-list" },
          songs.map((s) => h("li", null, h("a", { class: "card link-card", href: `#/pjesme/${s.id}` }, s.title))),
        )
      : emptyState(),
  );
}

export async function songView(ctx: RouteContext): Promise<Node> {
  const song = await getRow("songs", ctx.params.id ?? "");
  if (!song) return emptyState();
  let showEn = true;
  const lines = h("ol", { class: "lyrics" });
  const toggle = h("button", { class: "btn small", type: "button" }, t.songs.hideTranslation);
  toggle.addEventListener("click", () => {
    showEn = !showEn;
    toggle.textContent = showEn ? t.songs.hideTranslation : t.songs.showTranslation;
    for (const el of lines.querySelectorAll<HTMLElement>(".line-en")) el.hidden = !showEn;
  });
  lines.append(
    ...song.lines.map((line) =>
      h(
        "li",
        { class: "line" },
        h("p", { class: "line-hr" }, tappableText(line.hr, (w) => void lookupWord(w, line.hr, "song"))),
        h("p", { class: "line-en", lang: "en" }, line.en),
        h(
          "button",
          { class: "btn tiny", type: "button", "aria-label": `${t.common.explain}: ${line.hr}`, onClick: () => void explainText(line.hr, song.title) },
          t.common.explain,
        ),
      ),
    ),
  );
  return h(
    "div",
    { class: "page" },
    pageTitle(song.title, "#/pjesme"),
    withEn(t.instr.tapWords),
    toggle,
    lines,
    h(
      "button",
      {
        class: "btn danger",
        type: "button",
        onClick: async () => {
          if (!confirmDelete()) return;
          await deleteRow("songs", song.id);
          navigate("/pjesme");
        },
      },
      t.common.delete,
    ),
  );
}
