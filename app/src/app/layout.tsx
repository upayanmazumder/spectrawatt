import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Sidebar from "@/components/Sidebar/Sidebar";
import Particles from "@/components/Particles/Particles";
import "./globals.css";

const montserrat = Montserrat({
	variable: "--font-montserrat",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "SpectraWatt",
	description:
		"SpectraWatt is a real-time energy monitoring dashboard. Monitor your energy usage and device status with ease. Stay informed and in control of your energy consumption.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${montserrat.variable} antialiased relative`}>
				<Particles particleColors={undefined} className={undefined} />
				<div className="relative z-10">{children}</div>
				<Sidebar />
			</body>
		</html>
	);
}
