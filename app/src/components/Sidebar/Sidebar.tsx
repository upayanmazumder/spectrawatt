"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchDeviceGroups, type DeviceGroupSummary } from "./lib/api";

type FetchState = "idle" | "loading" | "success" | "error";

const TARIFF_INR_PER_KWH = 7; // simple flat tariff so UI can show a rupee estimate
const SAVINGS_WINDOW_HOURS = 1; // show per-hour savings based on present draw

function nowLabel(): string {
	const today = new Date();
	return today.toLocaleDateString(undefined, {
		weekday: "long",
		month: "short",
		day: "numeric",
	});
}

function formatEnergyKWh(value: number): string {
	if (!Number.isFinite(value)) return "—";
	return `${value.toFixed(2)} kWh`;
}

function formatCostInr(value: number): string {
	if (!Number.isFinite(value)) return "₹0.00";
	return `₹${value.toFixed(2)}`;
}

function latestReading(groups: DeviceGroupSummary[]) {
	return groups.reduce<{
		reading: NonNullable<DeviceGroupSummary["latest_reading"]>;
		deviceId: string;
	} | null>((latest, group) => {
		const reading = group.latest_reading;
		if (!reading?.timestamp) return latest;

		const ts = new Date(reading.timestamp).getTime();
		if (Number.isNaN(ts)) return latest;

		if (!latest) return { reading, deviceId: group.device_id };

		const latestTs = new Date(latest.reading.timestamp).getTime();
		return ts > latestTs ? { reading, deviceId: group.device_id } : latest;
	}, null);
}

function mostPowerHungry(groups: DeviceGroupSummary[]) {
	return groups.reduce<{
		reading: NonNullable<DeviceGroupSummary["latest_reading"]>;
		deviceId: string;
	} | null>((winner, group) => {
		const reading = group.latest_reading;
		if (!reading) return winner;
		const current = reading.apparent_power ?? 0;
		if (!winner) return { reading, deviceId: group.device_id };
		const best = winner.reading.apparent_power ?? 0;
		return current > best ? { reading, deviceId: group.device_id } : winner;
	}, null);
}

function minutesAgo(timestamp?: string): number | null {
	if (!timestamp) return null;
	const ts = new Date(timestamp).getTime();
	if (Number.isNaN(ts)) return null;
	return Math.max(0, Math.round((Date.now() - ts) / 60000));
}

export default function Sidebar() {
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
		const interval = setInterval(() => load(false), 10000);

		return () => {
			mounted = false;
			clearInterval(interval);
		};
	}, []);

	const totals = useMemo(() => {
		const totalWh = deviceGroups.reduce((sum, group) => {
			const contribution = group.total_wh ?? 0;
			return Number.isFinite(contribution) ? sum + contribution : sum;
		}, 0);
		const latest = latestReading(deviceGroups);
		const powerNow = mostPowerHungry(deviceGroups);
		return { totalWh, latest, powerNow };
	}, [deviceGroups]);

	const energyKWh = totals.totalWh / 1000;
	const energyUsageLabel = formatEnergyKWh(energyKWh);
	const energyCostLabel = formatCostInr(energyKWh * TARIFF_INR_PER_KWH);

	const statusLabel = useMemo(() => {
		if (status === "loading" && deviceGroups.length === 0)
			return "Loading live data…";
		if (error) return error;
		const latest = totals.latest;
		if (!latest) return "No device data yet";
		const ageMinutes = minutesAgo(latest.reading.timestamp);
		if (ageMinutes === null) return `${latest.deviceId} reported recently`;
		if (ageMinutes < 1) return `${latest.deviceId} just reported`;
		if (ageMinutes === 1) return `${latest.deviceId} updated 1 minute ago`;
		return `${latest.deviceId} updated ${ageMinutes} minutes ago`;
	}, [status, deviceGroups.length, error, totals.latest]);

	const savings = useMemo(() => {
		const winner = totals.powerNow;
		const powerWatts = winner?.reading.apparent_power ?? 0;
		const kwhPerWindow = (powerWatts * SAVINGS_WINDOW_HOURS) / 1000;
		return {
			potentialSavings: formatEnergyKWh(kwhPerWindow),
			savingsCost: formatCostInr(kwhPerWindow * TARIFF_INR_PER_KWH),
		};
	}, [totals.powerNow]);

	return (
		<aside>
			<div
				className="fixed right-5 top-1/2 -translate-y-1/2 w-[85vw] sm:w-84.75 h-[90vh] max-h-[90vh] rounded-[40px] bg-contain bg-no-repeat bg-center"
				style={{ backgroundImage: 'url("/sidebar.svg")' }}
			>
				{/* Main Content */}
				<div className="p-[25px_33px]">
					{/* Today Label */}
					<h2 className="font-montserrat font-light text-3xl leading-10 text-black m-0 max-w-[60%]">
						{nowLabel()}
					</h2>

					{/* Energy Usage */}
					<div className="font-montserrat font-bold text-xl leading-6 text-[#70c1ff] w-50.5 h-8 mt-7">
						{energyUsageLabel} ({energyCostLabel})
					</div>

					{/* Divider Line */}
					<div className="w-55.5 border-t border-black border-opacity-15 mt-12" />

					{/* Device Status */}
					<p className="font-montserrat font-light text-sm leading-5 text-[#70c1ff] mt-9 m-0">
						{statusLabel}
					</p>

					{/* Savings Info */}
					<div className="relative mt-12">
						<div className="absolute w-1.5 h-1.5 bg-[#70c1ff] rounded-full top-0 left-0" />
						<p className="font-montserrat font-light text-[11px] leading-4 text-black m-0 ml-4">
							Switching it off now saves {savings.potentialSavings} (
							{savings.savingsCost}/hr)
						</p>
					</div>

					{status === "loading" && deviceGroups.length > 0 ?
						<p className="mt-6 text-[11px] font-montserrat text-[#70c1ff]">
							Refreshing from api.spectrawatt.upayan.dev…
						</p>
					:	null}
				</div>
			</div>
		</aside>
	);
}
