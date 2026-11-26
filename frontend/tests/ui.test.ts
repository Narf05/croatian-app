import { entryTjedan } from "@croatian-app/shared/fixtures";
import { describe, expect, it } from "vitest";
import { t } from "../src/i18n/hr";
import { match, route } from "../src/router";
import { bilingual, entryCard, grammarLine, stressed, tappableText, withEn } from "../src/ui/components";
import { h } from "../src/ui/dom";
import { splitSentences } from "../src/views/reading";
import { allWords } from "../src/db/repo";

describe("dom helper", () => {
  it("creates elements with attributes, properties, events and children", () => {
    let clicked = 0;
    const el = h("button", { class: "btn", disabled: false, "data-x": "1", onClick: () => clicked++ }, "a", null, ["b", 1]);
    el.click();
    expect(el.outerHTML).toBe('<button class="btn" data-x="1">ab1</button>');
    expect(clicked).toBe(1);
    const input = h("input", { value: "x" });
    expect(input.value).toBe("x");
  });
});

describe("components", () => {
  it("highlights the stressed letter", () => {
    const el = stressed("tjedan", 2);
    expect(el.querySelector("mark.stress")?.textContent).toBe("e");
    expect(el.textContent).toBe("tjedan");
    expect(stressed("tjedan", null).querySelector("mark")).toBeNull();
  });

  it("shows Croatian first and English only after tapping EN", () => {
    const el = bilingual({ hr: "Dobar dan", en: "Good day" });
    const en = el.querySelector<HTMLElement>(".en")!;
    expect(el.querySelector(".hr")?.textContent).toBe("Dobar dan");
    expect(en.hidden).toBe(true);
    el.querySelector<HTMLButtonElement>(".en-toggle")!.click();
    expect(en.hidden).toBe(false);
  });

  it("has no EN toggle for text without an English version", () => {
    expect(bilingual({ hr: "Moj cilj", en: "" }).querySelector(".en-toggle")).toBeNull();
  });

  it("instructions always show the English subtitle", () => {
    const el = withEn(t.instr.gap);
    expect(el.textContent).toContain("Upiši točan oblik.");
    expect(el.querySelector(".en-sub")?.textContent).toBe("Type the correct form.");
  });

  it("describes grammar in Croatian", () => {
    expect(grammarLine({ partOfSpeech: "imenica", gender: "ž", aspect: null, aspectPair: null, caseNote: "gen. jd. karte" })).toBe(
      "imenica · ž. r. · gen. jd. karte",
    );
    expect(grammarLine({ partOfSpeech: "glagol", gender: null, aspect: "nesvršeni", aspectPair: "napisati", caseNote: null })).toBe(
      "glagol · nesvršeni (par: napisati)",
    );
  });

  it("entry card shows stress, SR/BS flag, example, and saves in one tap", async () => {
    const card = entryCard(entryTjedan, "song");
    document.body.append(card);
    expect(card.querySelector("mark.stress")?.textContent).toBe("e");
    expect(card.textContent).toContain("SR/BS: nedelja");
    expect(card.textContent).toContain("Vidimo se idući tjedan.");
    const save = [...card.querySelectorAll("button")].find((b) => b.textContent === "Spremi")!;
    save.click();
    await expect.poll(async () => (await allWords()).map((w) => [w.croatian, w.source])).toEqual([["tjedan", "song"]]);
    await expect.poll(() => save.textContent).toBe("Spremljeno");
  });

  it("splits text into tappable words, keeping punctuation", () => {
    const words: string[] = [];
    const el = tappableText("Kupio sam kruh, a ona ćevape.", (w) => words.push(w));
    expect(el.textContent).toBe("Kupio sam kruh, a ona ćevape.");
    const buttons = [...el.querySelectorAll("button")];
    expect(buttons.map((b) => b.textContent)).toEqual(["Kupio", "sam", "kruh", "a", "ona", "ćevape"]);
    buttons[2]!.click();
    expect(words).toEqual(["kruh"]);
  });
});

describe("reading", () => {
  it("splits paragraphs into sentences", () => {
    expect(splitSentences("Kupio sam kruh. Bio je svjež!\n\nSutra idem opet")).toEqual([
      ["Kupio sam kruh.", "Bio je svjež!"],
      ["Sutra idem opet"],
    ]);
    expect(splitSentences("Što radiš? „Ništa.” Dobro…")).toEqual([["Što radiš?", "„Ništa.”", "Dobro…"]]);
  });
});

describe("router", () => {
  it("matches paths with params and query", () => {
    route("/test-lekcije/:id", "lessons", () => document.createElement("div"));
    const m = match("#/test-lekcije/abc%20d?x=1");
    expect(m?.params).toEqual({ id: "abc d" });
    expect(m?.query.get("x")).toBe("1");
    expect(m?.tab).toBe("lessons");
    expect(match("#/nope")).toBeNull();
  });
});

describe("strings", () => {
  it("every warning and AI error has Croatian and English", () => {
    for (const group of [t.warn, t.aiErrors, t.instr]) {
      for (const value of Object.values(group)) {
        expect(value.hr.length).toBeGreaterThan(0);
        expect(value.en.length).toBeGreaterThan(0);
      }
    }
  });
});
