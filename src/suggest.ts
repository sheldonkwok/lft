import type { Exercise } from "./exercises";
import { SET_RE } from "./parser";

export type SuggestionContext = {
  active: boolean;
  lineStart: number;
  lineEnd: number;
  query: string;
  candidates: Exercise[];
};

export function getSuggestionContext(
  text: string,
  caret: number,
  known: Exercise[],
): SuggestionContext {
  const lines = text.split("\n");
  let offset = 0;
  let lineIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const end = offset + lines[i].length;
    if (caret <= end) {
      lineIndex = i;
      break;
    }
    offset = end + 1;
    lineIndex = i + 1;
  }
  const lineStart = offset;
  const lineText = lines[lineIndex] ?? "";
  const lineEnd = lineStart + lineText.length;
  const trimmed = lineText.trim();

  const empty: SuggestionContext = {
    active: false,
    lineStart,
    lineEnd,
    query: trimmed,
    candidates: [],
  };

  if (SET_RE.test(trimmed)) return empty;

  const prev = lineIndex > 0 ? lines[lineIndex - 1].trim() : "";
  const isSlot = lineIndex === 0 || prev === "";
  if (!isSlot) return empty;

  const used = new Set<string>();
  const byLower = new Map(known.map((e) => [e.name.toLowerCase(), e]));
  for (let i = 0; i < lineIndex; i++) {
    const hit = byLower.get(lines[i].trim().toLowerCase());
    if (hit) used.add(hit.name);
  }

  const q = trimmed.toLowerCase();
  const candidates = known.filter(
    (e) => !used.has(e.name) && e.name.toLowerCase().startsWith(q),
  );

  return {
    active: candidates.length > 0,
    lineStart,
    lineEnd,
    query: trimmed,
    candidates,
  };
}
