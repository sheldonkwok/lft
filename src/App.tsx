import { useEffect, useMemo, useRef, useState } from "react";
import { EXERCISES } from "./exercises";
import { parseWorkout } from "./parser";
import { getSuggestionContext } from "./suggest";

function App() {
	const [text, setText] = useState("");
	const [caret, setCaret] = useState(0);
	const [highlight, setHighlight] = useState(0);
	const [dismissed, setDismissed] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const result = useMemo(() => parseWorkout(text, EXERCISES), [text]);
	const valid = result.errors.length === 0;
	const totalSets = result.exercises.reduce((n, e) => n + e.sets.length, 0);

	const suggestions = useMemo(
		() => getSuggestionContext(text, caret, EXERCISES),
		[text, caret],
	);
	const showSuggestions = suggestions.active && !dismissed;

	useEffect(() => {
		if (highlight >= suggestions.candidates.length) setHighlight(0);
	}, [highlight, suggestions.candidates.length]);

	function syncCaret() {
		const el = textareaRef.current;
		if (el) setCaret(el.selectionStart);
		setDismissed(false);
	}

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

	function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (!showSuggestions) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlight((h) => (h + 1) % suggestions.candidates.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlight(
				(h) =>
					(h - 1 + suggestions.candidates.length) %
					suggestions.candidates.length,
			);
		} else if (e.key === "Tab" || e.key === "Enter") {
			e.preventDefault();
			accept(highlight);
		} else if (e.key === "Escape") {
			e.preventDefault();
			setDismissed(true);
		}
	}

	return (
		<main className="min-h-screen bg-stone-100 px-5 py-10">
			<div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_280px]">
				<div>
					<h1 className="mb-4 font-sans text-2xl font-semibold text-stone-800">
						lft
					</h1>
					<div className="relative">
						<textarea
							ref={textareaRef}
							data-testid="workout-input"
							value={text}
							onChange={(e) => {
								setText(e.target.value);
								setCaret(e.target.selectionStart);
								setDismissed(false);
							}}
							onSelect={syncCaret}
							onKeyUp={syncCaret}
							onClick={syncCaret}
							onKeyDown={onKeyDown}
							placeholder="Bench&#10;135x8&#10;225x5"
							spellCheck={false}
							autoCapitalize="off"
							autoCorrect="off"
							className="block min-h-[480px] w-full resize-y rounded-md border-l-2 border-red-300 bg-white py-2 pr-5 pl-14 font-mono text-[22px] leading-[44px] text-stone-800 shadow-md outline-none focus:ring-2 focus:ring-blue-400 bg-[linear-gradient(to_bottom,transparent_0,transparent_43px,#bfdbfe_43px,#bfdbfe_44px)] [background-size:100%_44px] [background-attachment:local]"
						/>
						{showSuggestions && (
							<ul
								data-testid="suggestions"
								className="mt-2 flex flex-col gap-1 rounded-md border border-stone-200 bg-white p-1 font-mono text-base shadow-sm"
							>
								{suggestions.candidates.map((c, i) => (
									<li key={c.name}>
										<button
											type="button"
											data-testid="suggestion-item"
											onMouseDown={(e) => {
												e.preventDefault();
												accept(i);
											}}
											className={`block w-full rounded px-3 py-1.5 text-left text-stone-800 hover:bg-stone-100 ${
												i === highlight ? "bg-emerald-100" : ""
											}`}
										>
											{c.name}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
				<aside className="rounded-md border border-stone-200 bg-white p-4 font-mono text-sm shadow-sm md:mt-12">
					{valid ? (
						<div
							data-testid="status-valid"
							className="font-medium text-emerald-700"
						>
							Valid · {result.exercises.length} exercise
							{result.exercises.length === 1 ? "" : "s"} · {totalSets} set
							{totalSets === 1 ? "" : "s"}
						</div>
					) : (
						<ul
							data-testid="status-errors"
							className="flex flex-col gap-1.5 text-red-700"
						>
							{result.errors.map((err) => (
								<li key={`${err.line}-${err.message}`} data-testid="error-line">
									Line {err.line}: {err.message}
								</li>
							))}
						</ul>
					)}
				</aside>
			</div>
		</main>
	);
}

export default App;
