"use client";

import React from "react";

interface SidebarProps {
  dayLabel?: string;
  energyUsage?: string;
  energyCost?: string;
  deviceStatus?: string;
  deviceRunningTime?: string;
  potentialSavings?: string;
  savingsCost?: string;
}

export default function Sidebar({
  dayLabel = "Today",
  energyUsage = "2.6 kWh",
  energyCost = "₹19",
  deviceStatus = "Geyser has been running for 48 minutes",
  potentialSavings = "0.35 kWh",
  savingsCost = "₹2.60",
}: SidebarProps) {
  return (
    <aside>
      <div
        className="absolute w-[339px] h-[716px] right-5 top-[156px] rounded-[40px] bg-cover bg-center"
        style={{ backgroundImage: 'url("/sidebar.svg")' }}
      >
        {/* Main Content */}
        <div className="p-[25px_33px]">
          {/* Today Label */}
          <h2 className="font-montserrat font-light text-4xl leading-[49px] text-black m-0">
            {dayLabel}
          </h2>

          {/* Energy Usage */}
          <div className="font-montserrat font-bold text-2xl leading-7 text-[#70c1ff] w-[202px] h-8 mt-8">
            {energyUsage} ({energyCost})
          </div>

          {/* Divider Line */}
          <div className="w-[222px] border-t border-black border-opacity-15 mt-12" />

          {/* Device Status */}
          <p className="font-montserrat font-light text-base leading-[21px] text-[#70c1ff] mt-11 m-0">
            {deviceStatus}
          </p>

          {/* Savings Info */}
          <div className="relative mt-16">
            <div className="absolute w-1.5 h-1.5 bg-[#70c1ff] rounded-full top-0 left-0" />
            <p className="font-montserrat font-light text-xs leading-[15px] text-black m-0 ml-4">
              Switching it off now saves {potentialSavings} ({savingsCost})
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
