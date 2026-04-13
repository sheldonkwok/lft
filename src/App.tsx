import { useMemo, useState } from "react";
import "./App.css";
import { EXERCISES } from "./exercises";
import { parseWorkout } from "./parser";

function App() {
	const [text, setText] = useState("");
	const result = useMemo(() => parseWorkout(text, EXERCISES), [text]);
	const valid = result.errors.length === 0;
	const totalSets = result.exercises.reduce((n, e) => n + e.sets.length, 0);

	return (
		<main className="app">
			<h1>lft</h1>
			<div className="workspace">
				<textarea
					data-testid="workout-input"
					className="workout-input"
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Bench&#10;135x8&#10;225x5"
					spellCheck={false}
					autoCapitalize="off"
					autoCorrect="off"
				/>
				<aside className="status">
					{valid ? (
						<div data-testid="status-valid" className="status-valid">
							Valid · {result.exercises.length} exercise
							{result.exercises.length === 1 ? "" : "s"} · {totalSets} set
							{totalSets === 1 ? "" : "s"}
						</div>
					) : (
						<ul data-testid="status-errors" className="status-errors">
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
