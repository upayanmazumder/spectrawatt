import Loader from "@/components/Loader/Loader";

export default function Loading() {
	return (
		<div className="flex flex-col items-center justify-center h-full py-20">
			<Loader />
		</div>
	);
}
