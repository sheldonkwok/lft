import { useEffect, useState } from "react";

type Activity = {
	id: number;
	name: string;
	distance: number;
	moving_time: number;
	start_date_local: string;
};

function formatDistance(meters: number): string {
	const miles = meters / 1609.344;
	return `${miles.toFixed(2)} mi`;
}

function formatTime(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0)
		return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
	return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export default function IntervalsPage() {
	const [activities, setActivities] = useState<Activity[]>([]);
	const [status, setStatus] = useState<"loading" | "error" | "done">("loading");

	useEffect(() => {
		fetch("/api/strava/activities")
			.then(async (res) => {
				if (res.status === 401) {
					window.location.href = "/api/auth/strava";
					return;
				}
				if (!res.ok) throw new Error("Failed to fetch");
				const data = await res.json();
				setActivities(data);
				setStatus("done");
			})
			.catch(() => setStatus("error"));
	}, []);

	return (
		<div className="min-h-screen bg-black text-white font-mono p-6">
			<h1 className="text-xl font-bold mb-6">Recent Runs</h1>

			{status === "loading" && <p className="text-zinc-400">Loading...</p>}

			{status === "error" && (
				<p className="text-red-400">Failed to load activities.</p>
			)}

			{status === "done" && activities.length === 0 && (
				<p className="text-zinc-400">No recent runs found.</p>
			)}

			{status === "done" && activities.length > 0 && (
				<ul className="space-y-3">
					{activities.map((a) => (
						<li key={a.id} className="border border-zinc-800 rounded p-4">
							<div className="font-bold">{a.name}</div>
							<div className="text-zinc-400 text-sm mt-1">
								{formatDate(a.start_date_local)} &middot;{" "}
								{formatDistance(a.distance)} &middot;{" "}
								{formatTime(a.moving_time)}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
