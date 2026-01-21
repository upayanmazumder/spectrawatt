import Link from "next/link";
import ActiveDevices from "@/components/ActiveDevices/ActiveDevices";
import DeviceCard from "@/components/DeviceCard/DeviceCard";

export default function Home() {
  return (
    <div className="min-h-screen font-sans">
      {/* Dashboard Title */}
      <header className="px-10 pt-8">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">
          Dashboard
        </h1>
      </header>

      {/* Main Dashboard Layout */}
      <div className="flex px-10 py-6 gap-8">
        {/* LEFT: Main content */}
        <main className="flex-1 flex flex-col gap-6">
          {/* Active devices header */}
          <ActiveDevices />

          {/* Device cards section */}
          <div className="flex gap-6 flex-wrap">
            <DeviceCard status="online" />
            <DeviceCard status="offline" />
          </div>
        </main>
      </div>
    </div>
  );
}
