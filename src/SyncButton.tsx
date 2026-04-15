import { useCallback, useEffect, useState } from "react";
import type { ParsedExercise } from "./parser";
import { cn } from "./utils";

type SyncStatus = "idle" | "loading" | "success" | "error";

interface SyncButtonProps {
	exercises: ParsedExercise[];
	text: string;
	valid: boolean;
	setText: (text: string) => void;
	startTime: number | null;
}

export function SyncButton({
	exercises,
	text,
	valid,
	setText,
	startTime,
}: SyncButtonProps) {
	const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
	const [autoSync, setAutoSync] = useState(false);

	useEffect(() => {
		const saved = localStorage.getItem("pending_workout");
		if (saved) {
			localStorage.removeItem("pending_workout");
			setText(saved);
			setAutoSync(true);
		}
	}, [setText]);

	const syncToStrava = useCallback(async () => {
		setSyncStatus("loading");
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		const startDateLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
		const elapsedTime = startTime
			? Math.round((Date.now() - startTime) / 1000)
			: 3600;
		try {
			const res = await fetch("/api/strava/sync", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					exercises,
					startDateLocal,
					elapsedTime,
				}),
			});
			if (res.status === 401) {
				localStorage.setItem("pending_workout", text);
				window.location.href = "/api/auth/strava";
				return;
			}
			if (!res.ok) {
				setSyncStatus("error");
				return;
			}
			setSyncStatus("success");
		} catch {
			setSyncStatus("error");
		}
	}, [exercises, text, startTime]);

	useEffect(() => {
		if (autoSync && valid && exercises.length > 0) {
			setAutoSync(false);
			syncToStrava();
		}
	}, [autoSync, valid, exercises.length, syncToStrava]);

	const canSync = valid && exercises.length > 0;

	const syncLabel =
		syncStatus === "loading"
			? "Syncing..."
			: syncStatus === "success"
				? "Synced!"
				: syncStatus === "error"
					? "Error"
					: "Sync to Strava";

	return (
		<button
			type="button"
			data-testid="sync-button"
			onClick={syncToStrava}
			disabled={!canSync || syncStatus === "loading"}
			className={cn(
				"rounded-md px-3 py-1.5 font-sans text-sm font-medium transition-colors",
				syncStatus === "success" && "bg-emerald-600 text-white",
				syncStatus === "error" && "bg-red-600 text-white",
				syncStatus !== "success" &&
					syncStatus !== "error" &&
					canSync &&
					"bg-orange-500 text-white hover:bg-orange-600",
				syncStatus !== "success" &&
					syncStatus !== "error" &&
					!canSync &&
					"cursor-not-allowed bg-stone-200 text-stone-400",
			)}
		>
			{syncLabel}
		</button>
	);
}
