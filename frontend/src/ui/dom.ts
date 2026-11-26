export type Child = Node | string | number | null | undefined | false | Child[];
export type Props = Record<string, unknown>;

/** Properties that must be set on the element, not as attributes. */
const PROPS = new Set(["value", "checked", "disabled", "selected", "hidden", "textContent"]);

/** Create an element: h("button", { class: "x", onClick: fn }, "text"). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === "class") {
      el.className = String(value);
    } else if (PROPS.has(key)) {
      (el as unknown as Record<string, unknown>)[key] = value;
    } else {
      el.setAttribute(key, value === true ? "" : String(value));
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else parent.appendChild(typeof child === "object" ? child : document.createTextNode(String(child)));
  }
}

/** Replace all children of `el`. */
export function replace(el: Element, ...children: Child[]): void {
  el.replaceChildren();
  append(el, children);
}
