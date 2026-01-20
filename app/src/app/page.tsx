import Link from "next/link";

export default function Home() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
			<main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
				<Link
					href="/live"
					className="mb-12 rounded-xl border border-zinc-200 bg-white/80 px-6 py-4 text-zinc-900 shadow-lg backdrop-blur-sm hover:bg-white/90 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-50 hover:dark:bg-zinc-900/80"
				>
					<h2 className="text-2xl font-semibold">
						Go to Live Energy Stream &rarr;
					</h2>
					<p className="mt-2 text-zinc-600 dark:text-zinc-400">
						View real-time energy data pulled directly from the SpectraWatt API.
					</p>
				</Link>
			</main>
		</div>
	);
}
