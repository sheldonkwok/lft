import { useEffect, useMemo, useState } from "react";
import { EXERCISES } from "../exercises";
import type { SuggestionContext } from "../suggest";
import { getSuggestionContext } from "../suggest";

export function useSuggestions(
	text: string,
	caret: number,
	textareaRef: React.RefObject<HTMLTextAreaElement | null>,
	setText: (t: string) => void,
	setCaret: (n: number) => void,
): {
	suggestions: SuggestionContext;
	showSuggestions: boolean;
	highlight: number;
	accept: (index: number) => void;
	moveDown: () => void;
	moveUp: () => void;
	dismiss: () => void;
	resetDismissed: () => void;
} {
	const [highlight, setHighlight] = useState(0);
	const [dismissed, setDismissed] = useState(false);

	const suggestions = useMemo(
		() => getSuggestionContext(text, caret, EXERCISES),
		[text, caret],
	);

	const showSuggestions = suggestions.active && !dismissed;

	useEffect(() => {
		if (highlight >= suggestions.candidates.length) setHighlight(0);
	}, [highlight, suggestions.candidates.length]);

	function accept(index: number) {
		const choice = suggestions.candidates[index];
		if (!choice) return;
		const after = text.slice(suggestions.lineEnd);
		const insert = after.startsWith("\n") ? choice.name : `${choice.name}\n`;
		const next = text.slice(0, suggestions.lineStart) + insert + after;
		const newCaret =
			suggestions.lineStart + insert.length + (after.startsWith("\n") ? 1 : 0);
		setText(next);
		setHighlight(0);
		requestAnimationFrame(() => {
			const el = textareaRef.current;
			if (el) {
				el.focus();
				el.setSelectionRange(newCaret, newCaret);
				setCaret(newCaret);
			}
		});
	}

	function moveDown() {
		setHighlight((h) => (h + 1) % suggestions.candidates.length);
	}

	function moveUp() {
		setHighlight(
			(h) =>
				(h - 1 + suggestions.candidates.length) % suggestions.candidates.length,
		);
	}

	function dismiss() {
		setDismissed(true);
	}

	function resetDismissed() {
		setDismissed(false);
	}

	return {
		suggestions,
		showSuggestions,
		highlight,
		accept,
		moveDown,
		moveUp,
		dismiss,
		resetDismissed,
	};
}
