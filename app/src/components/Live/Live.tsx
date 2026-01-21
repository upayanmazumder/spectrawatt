"use client";
// cspell:ignore spectrawatt vrms irms

import { useEffect, useMemo, useState } from "react";
import { fetchAllEnergyData, type EnergyData } from "@/components/Sidebar/lib/api";

type FetchState = "idle" | "loading" | "success" | "error";
type SortField =
	| "timestamp"
	| "id"
	| "device_id"
	| "vrms"
	| "irms"
	| "apparent_power"
	| "wh";
type SortDirection = "asc" | "desc";

function readingKey(reading: EnergyData): string {
	return `${reading.device_id}-${reading.timestamp}-${reading.id ?? ""}`;
}

function compareValues(a: number | string, b: number | string): number {
	const aIsNumber = typeof a === "number";
	const bIsNumber = typeof b === "number";

	if (aIsNumber && bIsNumber) {
		return (a as number) - (b as number);
	}

	return String(a).localeCompare(String(b));
}

function valueForField(reading: EnergyData, field: SortField) {
	switch (field) {
		case "timestamp":
			return Date.parse(reading.timestamp);
		case "id":
			return reading.id ?? null;
		case "device_id":
			return reading.device_id;
		case "vrms":
			return reading.vrms;
		case "irms":
			return reading.irms;
		case "apparent_power":
			return reading.apparent_power;
		case "wh":
			return reading.wh;
		default:
			return null;
	}
}

function sortReadings(
	list: EnergyData[],
	field: SortField,
	direction: SortDirection,
): EnergyData[] {
	const multiplier = direction === "asc" ? 1 : -1;
	return [...list].sort((a, b) => {
		const aVal = valueForField(a, field);
		const bVal = valueForField(b, field);

		const aMissing =
			aVal === null ||
			aVal === undefined ||
			(typeof aVal === "number" && Number.isNaN(aVal));
		const bMissing =
			bVal === null ||
			bVal === undefined ||
			(typeof bVal === "number" && Number.isNaN(bVal));

		if (aMissing && bMissing) return 0;
		if (aMissing) return 1;
		if (bMissing) return -1;

		const result = compareValues(
			aVal as number | string,
			bVal as number | string,
		);
		return result * multiplier;
	});
}

function latestReading(list: EnergyData[]): EnergyData | null {
	return list.reduce<EnergyData | null>((latest, current) => {
		const latestTime =
			latest ? Date.parse(latest.timestamp) : Number.NEGATIVE_INFINITY;
		const currentTime = Date.parse(current.timestamp);
		if (Number.isNaN(currentTime)) return latest;
		if (!latest || currentTime > latestTime) return current;
		return latest;
	}, null);
}

function formatNumber(value: number | null | undefined, digits = 2): string {
	if (value === null || value === undefined || Number.isNaN(value)) return "—";
	return value.toFixed(digits);
}

function formatDate(value: string | undefined | null): string {
	if (!value) return "—";
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function Live() {
	const [rawData, setRawData] = useState<EnergyData[]>([]);
	const [status, setStatus] = useState<FetchState>("idle");
	const [error, setError] = useState<string | null>(null);
	const [sortField, setSortField] = useState<SortField>("timestamp");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

	useEffect(() => {
		let isMounted = true;

		const loadAll = async (initial = false) => {
			try {
				if (initial) setStatus("loading");
				const list = await fetchAllEnergyData();
				if (!isMounted) return;
				const nextList = list ?? [];
				setRawData(nextList);
				setError(null);
				setStatus("success");
			} catch (err) {
				console.error("Failed to fetch energy data", err);
				if (!isMounted) return;
				setError("Unable to reach api.spectrawatt.upayan.dev");
				setStatus((prev) => (initial || prev === "idle" ? "error" : prev));
			}
		};

		loadAll(true);
		const interval = setInterval(() => loadAll(false), 5000);

		return () => {
			isMounted = false;
			clearInterval(interval);
		};
	}, []);

	const sortedData = useMemo(
		() => sortReadings(rawData, sortField, sortDirection),
		[rawData, sortField, sortDirection],
	);

	const latestData = useMemo(() => latestReading(rawData), [rawData]);

	const lastUpdated =
		latestData?.timestamp ? formatDate(latestData.timestamp) : null;

	const handleSort = (field: SortField) => {
		setSortField((prevField) => {
			if (prevField === field) {
				setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
				return prevField;
			}
			setSortDirection("desc");
			return field;
		});
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-linear-to-b from-zinc-50 via-white to-zinc-100 px-6 py-12 font-sans text-zinc-900 dark:from-black dark:via-zinc-900 dark:to-black dark:text-zinc-50">
			<main className="w-full max-w-4xl space-y-8 rounded-3xl border border-zinc-200 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70">
				<header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-sm uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">
							SpectraWatt Live
						</p>
						<h1 className="text-3xl font-semibold tracking-tight">
							Energy Stream
						</h1>
						<p className="text-sm text-zinc-600 dark:text-zinc-400">
							Pulling directly from api.spectrawatt.upayan.dev every 5 seconds.
						</p>
					</div>
					{lastUpdated && (
						<div className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-700 shadow-sm dark:border-zinc-700 dark:text-zinc-300">
							Updated {lastUpdated}
						</div>
					)}
				</header>

				<section className="grid gap-4 sm:grid-cols-2">
					<MetricCard
						label="Voltage"
						value={latestData?.vrms}
						unit="V"
						status={status}
					/>
					<MetricCard
						label="Current"
						value={latestData?.irms}
						unit="A"
						status={status}
					/>
					<MetricCard
						label="Apparent Power"
						value={latestData?.apparent_power}
						unit="W"
						status={status}
					/>
					<MetricCard
						label="Energy"
						value={latestData?.wh}
						unit="Wh"
						status={status}
					/>
				</section>

				<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100">
					<p>
						Device{" "}
						<span className="font-semibold">
							{latestData?.device_id ?? "—"}
						</span>
					</p>
					{error ?
						<p className="mt-1 text-amber-700">{error}</p>
					:	null}
					{status === "loading" && !latestData ?
						<p className="mt-1 text-amber-700">Loading live data…</p>
					:	null}
				</div>

				<section className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
					<header className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
							All Readings
						</h2>
						<span className="text-xs text-zinc-500 dark:text-zinc-400">
							{sortedData.length} records
						</span>
					</header>
					<div className="max-h-96 overflow-auto">
						<table className="min-w-full text-left text-sm">
							<thead className="sticky top-0 bg-white/95 text-zinc-500 backdrop-blur-sm dark:bg-zinc-950/90 dark:text-zinc-400">
								<tr>
									<SortableHeader
										label="ID"
										active={sortField === "id"}
										direction={sortDirection}
										onClick={() => handleSort("id")}
									/>
									<SortableHeader
										label="Device"
										active={sortField === "device_id"}
										direction={sortDirection}
										onClick={() => handleSort("device_id")}
									/>
									<SortableHeader
										label="Timestamp (raw)"
										active={sortField === "timestamp"}
										direction={sortDirection}
										onClick={() => handleSort("timestamp")}
									/>
									<SortableHeader
										label="Timestamp (local)"
										active={sortField === "timestamp"}
										direction={sortDirection}
										onClick={() => handleSort("timestamp")}
									/>
									<SortableHeader
										label="Vrms"
										active={sortField === "vrms"}
										direction={sortDirection}
										onClick={() => handleSort("vrms")}
									/>
									<SortableHeader
										label="Irms"
										active={sortField === "irms"}
										direction={sortDirection}
										onClick={() => handleSort("irms")}
									/>
									<SortableHeader
										label="Power"
										active={sortField === "apparent_power"}
										direction={sortDirection}
										onClick={() => handleSort("apparent_power")}
									/>
									<SortableHeader
										label="Wh"
										active={sortField === "wh"}
										direction={sortDirection}
										onClick={() => handleSort("wh")}
									/>
								</tr>
							</thead>
							<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
								{sortedData.map((row) => (
									<tr
										key={readingKey(row)}
										className="text-zinc-800 dark:text-zinc-100"
									>
										<td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
											{row.id ?? "—"}
										</td>
										<td className="px-3 py-2 font-medium">{row.device_id}</td>
										<td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
											{row.timestamp ?? "—"}
										</td>
										<td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
											{formatDate(row.timestamp)}
										</td>
										<td className="px-3 py-2">{formatNumber(row.vrms, 2)}</td>
										<td className="px-3 py-2">{formatNumber(row.irms, 3)}</td>
										<td className="px-3 py-2">
											{formatNumber(row.apparent_power, 2)}
										</td>
										<td className="px-3 py-2">{formatNumber(row.wh, 2)}</td>
									</tr>
								))}
								{sortedData.length === 0 ?
									<tr>
										<td
											className="px-3 py-4 text-center text-zinc-500 dark:text-zinc-400"
											colSpan={8}
										>
											No data yet.
										</td>
									</tr>
								:	null}
							</tbody>
						</table>
					</div>
				</section>
			</main>
		</div>
	);
}

function SortableHeader({
	label,
	active,
	direction,
	onClick,
}: {
	label: string;
	active: boolean;
	direction: SortDirection;
	onClick: () => void;
}) {
	const glyph =
		active ?
			direction === "asc" ?
				"▲"
			:	"▼"
		:	"⇅";

	return (
		<th className="px-3 py-2 font-medium">
			<button
				type="button"
				onClick={onClick}
				className="flex items-center gap-1 text-left text-sm font-medium text-zinc-700 hover:text-zinc-900 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-zinc-200 dark:hover:text-white"
				aria-sort={
					active ?
						direction === "asc" ?
							"ascending"
						:	"descending"
					:	"none"
				}
			>
				<span>{label}</span>
				<span className="text-xs text-zinc-400 dark:text-zinc-500">
					{glyph}
				</span>
			</button>
		</th>
	);
}

function MetricCard({
	label,
	value,
	unit,
	status,
}: {
	label: string;
	value?: number;
	unit: string;
	status: FetchState;
}) {
	const displayValue =
		value === undefined || value === null ?
			status === "loading" ?
				"…"
			:	"—"
		:	value.toFixed(2);

	return (
		<div className="space-y-2 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
			<p className="text-sm uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
				{label}
			</p>
			<div className="flex items-baseline gap-2 text-3xl font-semibold">
				<span>{displayValue}</span>
				<span className="text-base font-medium text-zinc-500 dark:text-zinc-400">
					{unit}
				</span>
			</div>
		</div>
	);
}
