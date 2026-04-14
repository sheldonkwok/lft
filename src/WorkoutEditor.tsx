import { useWorkoutEditor } from "./hooks/useWorkoutEditor";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { SyncButton } from "./SyncButton";

export function WorkoutEditor() {
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
	);
}
