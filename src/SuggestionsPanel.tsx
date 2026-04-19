import type { SuggestionContext } from "./suggest";
import { cn } from "./utils";

interface SuggestionsPanelProps {
  suggestions: SuggestionContext;
  highlight: number;
  keyboardHeight: number;
  onAccept: (index: number) => void;
}

export function SuggestionsPanel({
  suggestions,
  highlight,
  keyboardHeight,
  onAccept,
}: SuggestionsPanelProps) {
  return (
    <ul
      data-testid="suggestions"
      className="flex flex-col gap-1 rounded-md border border-stone-200 bg-white p-1 font-mono text-base shadow-sm"
      style={
        keyboardHeight > 0
          ? {
              position: "fixed",
              bottom: keyboardHeight + 8,
              left: 16,
              right: 16,
              zIndex: 50,
            }
          : { marginTop: "0.5rem" }
      }
    >
      {suggestions.candidates.map((c, i) => (
        <li key={c.name}>
          <button
            type="button"
            data-testid="suggestion-item"
            onMouseDown={(e) => {
              e.preventDefault();
              onAccept(i);
            }}
            className={cn(
              "block w-full rounded px-3 py-1.5 text-left text-stone-800 hover:bg-stone-100",
              i === highlight && "bg-emerald-100",
            )}
          >
            {c.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
