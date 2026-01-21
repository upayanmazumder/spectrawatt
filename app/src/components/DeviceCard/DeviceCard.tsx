import React from "react";
import { Icon } from "@iconify/react";

type DeviceCardProps = {
	deviceId: string;
	status: "online" | "offline";
	lastActive?: string | null;
	vrms?: number;
	irms?: number;
	apparentPower?: number;
	wh?: number;
	averagePower?: number;
	totalWh?: number;
};

function formatRelativeTime(iso?: string | null): string {
	if (!iso) return "No data yet";
	const ts = new Date(iso).getTime();
	if (Number.isNaN(ts)) return iso;

	const diffMinutes = Math.round((Date.now() - ts) / 60000);
	if (diffMinutes < 1) return "Just now";
	if (diffMinutes < 60) return `${diffMinutes} min ago`;

	const hours = Math.floor(diffMinutes / 60);
	if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;

	const days = Math.floor(hours / 24);
	return `${days} day${days > 1 ? "s" : ""} ago`;
}

function formatNumber(value?: number, digits = 2): string {
	if (value === undefined || value === null || Number.isNaN(value)) return "—";
	return value.toFixed(digits);
}

function getDeviceIcon(deviceId: string): string {
	const name = deviceId.toLowerCase();

	if (name.includes("bulb")) return "mdi:lightbulb-on-outline";
	if (name.includes("sonnet")) return "mdi:laptop";
	if (name.includes("pc")) return "mdi:desktop-tower";
	if (name.includes("solder")) return "mdi:soldering-iron";

	return "mdi:power-plug";
}

export default function DeviceCard({
	deviceId,
	status,
	lastActive,
	wh,
	averagePower,
	totalWh,
}: DeviceCardProps) {
	const isOnline = status === "online";
	const deviceIcon = getDeviceIcon(deviceId);

	return (
		<div className="relative w-full max-w-[339px] aspect-[339/216] drop-shadow-md">
			<svg
				className="absolute h-full w-full"
				viewBox="0 0 339 216"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M199.289 0C217.631 0 232.5 14.8689 232.5 33.2107C232.5 51.5525 247.369 66.4215 265.711 66.4215H299C321.091 66.4215 339 84.3301 339 106.421V176C339 198.091 321.091 216 299 216H40C17.9086 216 1.54234e-06 198.091 3.44491e-06 176L1.51576e-05 40C1.70602e-05 17.9086 17.9086 0 40 0H199.289Z"
					fill={isOnline ? "#70C1FF" : "#434343"}
				/>
			</svg>
			<div className="absolute inset-0 h-full w-full">
				<div className="absolute right-[6%] top-[4%] flex h-[26%] min-h-[45px] w-1/4 min-w-[72px] items-center justify-center rounded-full bg-white text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-800">
					{isOnline ? "Online" : "Offline"}
				</div>

				<div className="absolute left-[4.28%] top-[4.44%] flex h-7 w-7 items-center justify-center rounded-full bg-white">
					<Icon
						icon={deviceIcon}
						className="h-[18px] w-[18px] text-gray-800"
						aria-label={`${deviceId} icon`}
					/>
				</div>

				<div className="absolute left-[21px] top-[50px] flex h-[50px] w-[150px] items-center justify-start">
					<span className="text-[22px] font-semibold text-white">
						{deviceId || "Device"}
					</span>
				</div>

				<div className="absolute left-[21px] top-[95px] text-[26px] font-light text-white">
					{formatNumber(averagePower, 1)} W
				</div>

				<div className="absolute left-[26px] top-[146px] flex h-[21px] w-[180px] items-center rounded-full bg-black">
					<span className="ml-[10px] whitespace-nowrap text-[10px] font-medium text-white">
						Last active: {formatRelativeTime(lastActive)}
					</span>
				</div>

				<div className="absolute left-[26px] top-[173px] flex h-[21px] w-[180px] items-center rounded-full bg-black">
					<span className="ml-[10px] whitespace-nowrap text-[10px] font-medium text-white">
						Today: {formatNumber(totalWh ?? wh, 2)} Wh
					</span>
				</div>
			</div>
		</div>
	);
}
