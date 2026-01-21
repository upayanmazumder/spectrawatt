"use client";

type ActiveDevicesProps = {
	activeCount: number;
	totalCount: number;
	loading?: boolean;
	lastUpdatedLabel?: string | null;
};

export default function ActiveDevices({
	activeCount,
	totalCount,
	loading = false,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	lastUpdatedLabel: _lastUpdatedLabel,
}: ActiveDevicesProps) {
	const countText =
		loading ? "Loading…" : `${activeCount} / ${totalCount || 0}`;

	return (
		<div className="relative w-full max-w-84.5 overflow-hidden rounded-[30px] shadow-[4px_4px_4px_rgba(0,0,0,0.25)]">
			<div className="flex h-11.75 items-center rounded-[30px] bg-black pl-6 pr-0 text-white">
				<span className="text-[20px] font-light leading-6">Active devices</span>
				<div className="ml-auto flex h-11.5 min-w-35 items-center justify-center rounded-l-none rounded-r-[23px] bg-[#70C1FF] px-12.75 text-[20px] font-light leading-6 text-black">
					{countText}
				</div>
			</div>
		</div>
	);
}
