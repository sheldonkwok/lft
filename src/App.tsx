import { useWorkoutEditor } from "./hooks/useWorkoutEditor";
import { SyncButton } from "./SyncButton";
import { WorkoutEditor } from "./WorkoutEditor";

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
					<WorkoutEditor
						textareaRef={textareaRef}
						text={text}
						isSetContext={isSetContext}
						showSuggestions={showSuggestions}
						suggestions={suggestions}
						highlight={highlight}
						keyboardHeight={keyboardHeight}
						onChange={onChange}
						onKeyDown={onKeyDown}
						onAccept={accept}
						syncCaret={syncCaret}
					/>
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
