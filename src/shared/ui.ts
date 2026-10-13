import { esc, money, moneyInput, units } from "./values";
export const icons = {
  home: '<path d="m3 10 9-7 9 7v10H15v-7H9v7H3Z"/>',
  finance:
    '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-6 5h3"/>',
  food: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18m13-18c-4 2-5 7-5 10h5m0-10v18"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  bag: '<path d="M4 8h16l1 13H3Zm4 0V6a4 4 0 0 1 8 0v2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
};
export function icon(name: keyof typeof icons) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
}
export function button(
  label: string,
  action: string,
  cls = "primary",
  attrs = "",
) {
  return `<button class="button ${cls}" data-action="${action}" ${attrs}>${label}</button>`;
}
export function stat(label: string, value: string, note = "", cls = "") {
  return `<div class="stat ${cls}"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ""}</div>`;
}
export function amount(cents: number, cls = "") {
  return `<span class="amount ${cents < 0 ? "negative" : ""} ${cls}">${money(cents)}</span>`;
}
export function input(
  label: string,
  name: string,
  value: string | number = "",
  type = "text",
  attrs = "",
) {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" aria-label="${esc(label)}" value="${esc(value)}" ${attrs}></label>`;
}
export function moneyField(label: string, name: string, cents = 0) {
  return `<label class="field"><span>${label} <small>UYU</small></span><div class="money-field"><span>$</span><input name="${name}" aria-label="${esc(label)}" type="text" inputmode="decimal" value="${moneyInput(cents)}" required autocomplete="off"></div></label>`;
}
export function unitOptions(selected: string) {
  return units
    .map(
      (u) =>
        `<option value="${u}" ${u === selected ? "selected" : ""}>${u}</option>`,
    )
    .join("");
}
export function select(label: string, name: string, options: string) {
  return `<label class="field"><span>${label}</span><select name="${name}" aria-label="${esc(label)}">${options}</select></label>`;
}
