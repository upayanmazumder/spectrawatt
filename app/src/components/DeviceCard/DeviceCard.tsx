import React, { CSSProperties } from "react";

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

export default function DeviceCard({
	deviceId,
	status,
	lastActive,
	wh,
	averagePower,
	totalWh,
}: DeviceCardProps) {
	const isOnline = status === "online";

	const getCardBackgroundColor = () => {
		return isOnline ? "#70C1FF" : "#434343";
	};

	return (
		<div style={styles.wrapper}>
			<svg
				style={styles.cardSvg}
				viewBox="0 0 339 216"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M199.289 0C217.631 0 232.5 14.8689 232.5 33.2107C232.5 51.5525 247.369 66.4215 265.711 66.4215H299C321.091 66.4215 339 84.3301 339 106.421V176C339 198.091 321.091 216 299 216H40C17.9086 216 1.54234e-06 198.091 3.44491e-06 176L1.51576e-05 40C1.70602e-05 17.9086 17.9086 0 40 0H199.289Z"
					fill={getCardBackgroundColor()}
				/>
			</svg>
			<div style={styles.cardContent}>
				<div style={styles.topPill}>{isOnline ? "Online" : "Offline"}</div>

				<div style={styles.icon} />

				<div style={styles.deviceFrame}>
					<span style={styles.deviceText}>{deviceId || "Device"}</span>
				</div>

				<div style={styles.powerReadout}>{formatNumber(averagePower, 1)} W</div>

				<div style={styles.infoBar1}>
					<span style={styles.infoText}>
						Last active: {formatRelativeTime(lastActive)}
					</span>
				</div>

				<div style={styles.infoBar2}>
					<span style={styles.infoText}>
						Today: {formatNumber(totalWh ?? wh, 2)} Wh
					</span>
				</div>
			</div>
		</div>
	);
}

const styles: { [key: string]: CSSProperties } = {
	wrapper: {
		position: "relative",
		width: "100%",
		maxWidth: 339,
		aspectRatio: "339 / 216",
		filter: "drop-shadow(0px 4px 4px rgba(0,0,0,0.25))",
	} as CSSProperties,
	cardSvg: {
		position: "absolute",
		width: "100%",
		height: "100%",
	} as CSSProperties,
	cardContent: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
	} as CSSProperties,
	topPill: {
		position: "absolute",
		right: "6%",
		top: "4%",
		width: "25%",
		height: "26%",
		minWidth: 72,
		minHeight: 45,
		background: "#FFFFFF",
		borderRadius: 30,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontFamily: "Montserrat, sans-serif",
		fontWeight: 600,
		fontSize: 12,
		textTransform: "uppercase",
		letterSpacing: "0.08em",
		color: "#1f2937",
	} as CSSProperties,
	icon: {
		position: "absolute",
		left: "4.28%",
		top: "4.44%",
		width: 24,
		height: 24,
		background: "#FFFFFF",
		borderRadius: "50%",
	} as CSSProperties,
	deviceFrame: {
		position: "absolute",
		left: 21,
		top: 50,
		width: 150,
		height: 50,
		display: "flex",
		justifyContent: "flex-start",
		alignItems: "center",
	} as CSSProperties,
	deviceText: {
		fontFamily: "Montserrat, sans-serif",
		fontWeight: 600,
		fontSize: 22,
		color: "#FFFFFF",
	} as CSSProperties,
	powerReadout: {
		position: "absolute",
		left: 21,
		top: 95,
		fontFamily: "Montserrat, sans-serif",
		fontWeight: 300,
		fontSize: 26,
		color: "#FFFFFF",
	} as CSSProperties,
	infoBar1: {
		position: "absolute",
		left: 26,
		top: 146,
		width: 180,
		height: 21,
		background: "#000000",
		borderRadius: 20,
		display: "flex",
		alignItems: "center",
	} as CSSProperties,
	infoBar2: {
		position: "absolute",
		left: 26,
		top: 173,
		width: 180,
		height: 21,
		background: "#000000",
		borderRadius: 20,
		display: "flex",
		alignItems: "center",
	} as CSSProperties,
	infoText: {
		marginLeft: 10,
		fontFamily: "Montserrat, sans-serif",
		fontWeight: 500,
		fontSize: 10,
		color: "#FFFFFF",
		whiteSpace: "nowrap",
	} as CSSProperties,
};
