import Image from "next/image";
import BudgetOverrunDiagram from "@/public/frontend/pages/Home/BudgetOverrunDiagram.png";

export function BudgetOutcomeSection() {
	return (
		<section className="bg-white dark:bg-slate-950">
			<div className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-6 lg:py-14">
				<Image
					src={BudgetOverrunDiagram}
					alt="Why projects are over budget: problems, WorksRecorded solutions, and project impact"
					className="h-auto w-full"
					sizes="(min-width: 1120px) 1072px, 100vw"
				/>
			</div>
		</section>
	);
}
