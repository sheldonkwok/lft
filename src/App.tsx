import { useEffect, useMemo, useRef, useState } from "react";
import { EXERCISES } from "./exercises";
import { useSuggestions } from "./hooks/useSuggestions";
import { parseWorkout, SET_RE } from "./parser";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { SyncButton } from "./SyncButton";

function useWorkoutEditor() {
	const [text, setText] = useState("");
	const [caret, setCaret] = useState(0);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const result = useMemo(() => parseWorkout(text, EXERCISES), [text]);
	const valid = result.errors.length === 0;
	const totalSets = result.exercises.reduce((n, e) => n + e.sets.length, 0);

	const {
		suggestions,
		showSuggestions,
		highlight,
		accept,
		moveDown,
		moveUp,
		dismiss,
		resetDismissed,
	} = useSuggestions(text, caret, textareaRef, setText, setCaret);

	const isSetContext = useMemo(() => {
		const lines = text.split("\n");
		let offset = 0;
		for (let i = 0; i < lines.length; i++) {
			const end = offset + lines[i].length;
			if (caret <= end) {
				const cur = lines[i].trim();
				if (/^\d/.test(cur)) return true;
				if (i > 0) {
					const prev = lines[i - 1].trim();
					if (/^\d/.test(prev)) return true;
					if (
						EXERCISES.some((e) => e.name.toLowerCase() === prev.toLowerCase())
					)
						return true;
				}
				return false;
			}
			offset = end + 1;
		}
		return false;
	}, [text, caret]);

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	useEffect(() => {
		const vv = window.visualViewport;
		if (!vv) return;
		function handleResize() {
			setKeyboardHeight(
				Math.max(0, window.innerHeight - (vv?.height ?? window.innerHeight)),
			);
		}
		vv.addEventListener("resize", handleResize);
		return () => vv.removeEventListener("resize", handleResize);
	}, []);

	function syncCaret() {
		const el = textareaRef.current;
		if (el) setCaret(el.selectionStart);
		resetDismissed();
	}

	function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		const val = e.target.value.replace(/\./g, "x");
		setText(val);
		setCaret(e.target.selectionStart);
		resetDismissed();
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter") {
			const lines = text.split("\n");
			let lineIdx = 0;
			let offset = 0;
			for (let i = 0; i < lines.length; i++) {
				const end = offset + lines[i].length;
				if (caret <= end) {
					lineIdx = i;
					break;
				}
				offset = end + 1;
				lineIdx = i + 1;
			}
			const currentLine = (lines[lineIdx] ?? "").trim();
			const prev = lineIdx > 0 ? lines[lineIdx - 1].trim() : "";
			const isSlot = lineIdx === 0 || prev === "";
			if (!isSlot && currentLine !== "" && !SET_RE.test(currentLine)) {
				e.preventDefault();
				return;
			} else if (!isSlot && currentLine === "") {
				let hasSets = false;
				for (let j = lineIdx - 1; j >= 0; j--) {
					const l = lines[j].trim();
					if (l === "") break;
					if (SET_RE.test(l)) {
						hasSets = true;
						break;
					}
				}
				if (!hasSets) {
					e.preventDefault();
					return;
				}
			}
		}
		if (!showSuggestions) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			moveDown();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			moveUp();
		} else if (e.key === "Tab" || e.key === "Enter") {
			e.preventDefault();
			accept(highlight);
		} else if (e.key === "Escape") {
			e.preventDefault();
			dismiss();
		}
	}

	return {
		text,
		setText,
		result,
		valid,
		totalSets,
		suggestions,
		showSuggestions,
		isSetContext,
		highlight,
		keyboardHeight,
		textareaRef,
		syncCaret,
		accept,
		onChange,
		onKeyDown,
	};
}

function App() {
	const {
		text,
		setText,
		result,
		valid,
		totalSets,
		suggestions,
		showSuggestions,
		isSetContext,
		highlight,
		keyboardHeight,
		textareaRef,
		syncCaret,
		accept,
		onChange,
		onKeyDown,
	} = useWorkoutEditor();

	return (
		<main className="min-h-screen bg-stone-100 px-5 py-10">
			<div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_280px]">
				<div>
					<div className="mb-4 flex items-center justify-between">
						<h1 className="font-sans text-2xl font-semibold text-stone-800">
							lft
						</h1>
						<SyncButton
							exercises={result.exercises}
							text={text}
							valid={valid}
							setText={setText}
						/>
					</div>
					<div className="relative">
						<textarea
							ref={textareaRef}
							data-testid="workout-input"
							value={text}
							onChange={onChange}
							onSelect={syncCaret}
							onKeyUp={syncCaret}
							onClick={syncCaret}
							onKeyDown={onKeyDown}
							placeholder="Bench&#10;135x8&#10;225x5"
							inputMode={isSetContext ? "numeric" : "text"}
							spellCheck={false}
							autoCapitalize="off"
							autoCorrect="off"
							className="block min-h-[480px] w-full resize-y rounded-md border-l-2 border-red-300 bg-white py-2 pr-5 pl-14 font-mono text-[22px] leading-[44px] text-stone-800 shadow-md outline-none bg-[linear-gradient(to_bottom,transparent_0,transparent_43px,#bfdbfe_43px,#bfdbfe_44px)] [background-size:100%_44px] [background-attachment:local]"
						/>
						{showSuggestions && (
							<SuggestionsPanel
								suggestions={suggestions}
								highlight={highlight}
								keyboardHeight={keyboardHeight}
								onAccept={accept}
							/>
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
