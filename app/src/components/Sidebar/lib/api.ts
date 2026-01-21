import axios from "axios";

export interface EnergyData {
	id?: string;
	device_id: string;
	timestamp: string;
	vrms: number;
	irms: number;
	apparent_power: number;
	wh: number;
}

export interface DeviceDataGroup {
	device_id: string;
	data: EnergyData[];
}

// Shared axios instance pointing to the public API host (used in dev and prod).
export const apiClient = axios.create({
	baseURL: "https://api.spectrawatt.upayan.dev",
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

function normalizeEnergyList(
	payload: EnergyData[] | DeviceDataGroup[] | null | undefined,
): EnergyData[] {
	if (!payload) return [];
	if (payload.length === 0) return [];

	const first = payload[0] as DeviceDataGroup & EnergyData;
	const looksGrouped = Array.isArray((first as DeviceDataGroup).data);

	if (looksGrouped) {
		return (payload as DeviceDataGroup[]).flatMap((group) =>
			(group.data ?? []).map((item) => ({
				...item,
				device_id: item.device_id ?? group.device_id,
			})),
		);
	}

	return payload as EnergyData[];
}

export async function fetchLatestEnergyData(): Promise<EnergyData | null> {
	const response = await apiClient.get<EnergyData>("/api/data/latest");
	return response.data ?? null;
}

export async function fetchAllEnergyData(): Promise<EnergyData[]> {
	const response = await apiClient.get<EnergyData[] | DeviceDataGroup[]>(
		"/api/data",
	);
	return normalizeEnergyList(response.data);
}
