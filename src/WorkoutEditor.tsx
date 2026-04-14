import type React from "react";
import { SuggestionsPanel } from "./SuggestionsPanel";
import type { SuggestionContext } from "./suggest";

interface WorkoutEditorProps {
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	text: string;
	isSetContext: boolean;
	showSuggestions: boolean;
	suggestions: SuggestionContext;
	highlight: number;
	keyboardHeight: number;
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	onAccept: (index: number) => void;
	syncCaret: () => void;
}

export function WorkoutEditor({
	textareaRef,
	text,
	isSetContext,
	showSuggestions,
	suggestions,
	highlight,
	keyboardHeight,
	onChange,
	onKeyDown,
	onAccept,
	syncCaret,
}: WorkoutEditorProps) {
	return (
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
					onAccept={onAccept}
				/>
			)}
		</div>
	);
}
