"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ActiveDevices from "@/components/ActiveDevices/ActiveDevices";
import DeviceCard from "@/components/DeviceCard/DeviceCard";
import Loader from "@/components/Loader/Loader";
import {
	fetchDeviceGroups,
	type DeviceGroupSummary,
} from "@/components/Sidebar/lib/api";
import { Github } from "lucide-react";

type FetchState = "idle" | "loading" | "success" | "error";

const ONLINE_WINDOW_MS = 2 * 60 * 1000; // treat readings within last 2 minutes as online

function isOnline(timestamp?: string) {
	if (!timestamp) return false;
	const parsed = new Date(timestamp).getTime();
	if (Number.isNaN(parsed)) return false;
	return Date.now() - parsed <= ONLINE_WINDOW_MS;
}

function formatUpdatedLabel(timestamp: number | null): string | null {
	if (!timestamp) return null;
	const date = new Date(timestamp);
	return date.toLocaleString();
}

export default function Home() {
	const [deviceGroups, setDeviceGroups] = useState<DeviceGroupSummary[]>([]);
	const [status, setStatus] = useState<FetchState>("idle");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		const load = async (initial = false) => {
			try {
				if (initial) setStatus("loading");
				const groups = await fetchDeviceGroups();
				if (!mounted) return;
				setDeviceGroups(groups ?? []);
				setError(null);
				setStatus("success");
			} catch (err) {
				console.error("Failed to fetch device groups", err);
				if (!mounted) return;
				setError("Unable to reach api.spectrawatt.upayan.dev");
				setStatus((prev) => (initial || prev === "idle" ? "error" : prev));
			}
		};

		load(true);
		const interval = setInterval(() => load(false), 8000);

		return () => {
			mounted = false;
			clearInterval(interval);
		};
	}, []);

	const totals = useMemo(() => {
		const totalDevices = deviceGroups.length;
		const onlineDevices = deviceGroups.filter((group) =>
			isOnline(group.latest_reading?.timestamp),
		).length;
		const newestTimestamp = deviceGroups.reduce<number | null>(
			(latest, group) => {
				const ts = group.latest_reading?.timestamp;
				if (!ts) return latest;
				const parsed = new Date(ts).getTime();
				if (Number.isNaN(parsed)) return latest;
				return latest === null || parsed > latest ? parsed : latest;
			},
			null,
		);
		return { totalDevices, onlineDevices, newestTimestamp };
	}, [deviceGroups]);

	return (
		<div className="min-h-screen  px-6 py-10 font-sans text-zinc-200 lg:pr-95">
			<header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">
						SpectraWatt Dashboard
					</h1>
					<p className="text-sm text-zinc-600 dark:text-zinc-400">
						Live device status pulled from api.spectrawatt.upayan.dev every 8
						seconds.
					</p>
				</div>
				<Link
					href="https://github.com/upayanmazumder/spectrawatt"
					target="_blank"
					className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-800/60 dark:bg-sky-900/40 dark:text-sky-100"
				>
					<Github /> Github Repository
				</Link>
			</header>

			<div className="mt-8 space-y-4">
				<ActiveDevices
					activeCount={totals.onlineDevices}
					totalCount={totals.totalDevices}
					loading={status === "loading" && totals.totalDevices === 0}
					lastUpdatedLabel={formatUpdatedLabel(totals.newestTimestamp)}
				/>

				{error ?
					<div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-100">
						{error}
					</div>
				:	null}

				<section className="rounded-3xl p-6 shadow-sm">
					<header className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
							Devices
						</h2>
						<span className="text-xs text-zinc-500 dark:text-zinc-400">
							{status === "loading" ?
								"Refreshing…"
							:	`${totals.totalDevices} total`}
						</span>
					</header>

					{status === "loading" ?
						<div className="flex w-full items-center justify-center py-12">
							<Loader />
						</div>
					: deviceGroups.length === 0 ?
						<div className="mt-4 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
							No devices have reported data yet. Once readings arrive, they will
							appear here.
						</div>
					:	<div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{deviceGroups.map((group) => {
								const latest = group.latest_reading;
								const online = isOnline(latest?.timestamp);
								return (
									<DeviceCard
										key={group.device_id}
										deviceId={group.device_id}
										status={online ? "online" : "offline"}
										lastActive={latest?.timestamp ?? null}
										vrms={latest?.vrms}
										irms={latest?.irms}
										apparentPower={latest?.apparent_power}
										wh={latest?.wh}
										averagePower={group.average_power}
										totalWh={group.total_wh}
									/>
								);
							})}
						</div>
					}
				</section>
			</div>
		</div>
	);
}
