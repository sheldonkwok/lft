import type { Exercise } from "./exercises";

export type ParsedSet = { weight: number; reps: number };
export type ParsedExercise = { name: string; sets: ParsedSet[] };
export type ParseError = { line: number; message: string };
export type ParseResult = {
	exercises: ParsedExercise[];
	errors: ParseError[];
};

const SET_RE = /^(\d+)x(\d+)$/;

export function parseWorkout(text: string, known: Exercise[]): ParseResult {
	const byLower = new Map(known.map((e) => [e.name.toLowerCase(), e]));
	const exercises: ParsedExercise[] = [];
	const errors: ParseError[] = [];
	const used = new Set<string>();
	let current: ParsedExercise | null = null;

	const lines = text.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i].trimEnd();
		const lineNum = i + 1;

		if (raw.trim() === "") {
			if (current) {
				exercises.push(current);
				current = null;
			}
			continue;
		}

		const match = raw.match(SET_RE);
		if (current) {
			if (match) {
				const weight = Number(match[1]);
				const reps = Number(match[2]);
				if (weight > 0 && reps > 0) {
					current.sets.push({ weight, reps });
				} else {
					errors.push({ line: lineNum, message: "Expected set like 135x8" });
				}
				continue;
			}
			const known = byLower.get(raw.toLowerCase());
			if (known) {
				errors.push({
					line: lineNum,
					message: "Finish previous exercise with a blank line",
				});
			} else {
				errors.push({ line: lineNum, message: "Expected set like 135x8" });
			}
			continue;
		}

		const exercise = byLower.get(raw.toLowerCase());
		if (!exercise) {
			errors.push({ line: lineNum, message: "Unknown exercise" });
			continue;
		}
		if (used.has(exercise.name)) {
			errors.push({ line: lineNum, message: "Exercise already used" });
			continue;
		}
		used.add(exercise.name);
		current = { name: exercise.name, sets: [] };
	}

	if (current) exercises.push(current);

	return { exercises, errors };
}
