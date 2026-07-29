import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalyticsLoading() {
	return (
		<div className="space-y-4">
			<div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
			<div className="h-4 w-full max-w-2xl animate-pulse rounded-md bg-muted" />
			<Card>
				<CardContent className="flex min-h-56 items-center justify-center p-6 text-muted-foreground">
					<Loader2 className="mr-2 size-5 animate-spin" />
					Analytics
				</CardContent>
			</Card>
		</div>
	);
}
