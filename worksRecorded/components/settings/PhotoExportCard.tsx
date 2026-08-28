import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type PhotoExportCardProps = {
	organizationLanguage?: string | null;
	photoCount: number;
	siteId: string;
};

export function PhotoExportCard({
	organizationLanguage,
	photoCount,
	siteId,
}: PhotoExportCardProps) {
	const isLatvian = organizationLanguage === "lv";
	const text = {
		title: isLatvian ? "Fotoattēlu eksports" : "Photo export",
		description: isLatvian
			? "Lejupielādējiet visus objekta žurnāla fotoattēlus ZIP failā. Fotoattēli tiks sakārtoti mapēs pa mēnešiem."
			: "Download all site diary photos in a ZIP file. Photos are organized into folders by month.",
		button: isLatvian ? "Eksportēt fotoattēlus" : "Export photos",
		count: isLatvian
			? `${photoCount} ${photoCount === 1 ? "fotoattēls" : "fotoattēli"}`
			: `${photoCount} ${photoCount === 1 ? "photo" : "photos"}`,
		empty: isLatvian
			? "Šim objektam vēl nav eksportējamu fotoattēlu."
			: "This site does not have any photos to export yet.",
	};

	return (
		<Card data-tour="settings-photo-export">
			<CardHeader>
				<CardTitle>{text.title}</CardTitle>
				<CardDescription>{text.description}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-wrap items-center gap-3">
				{photoCount > 0 ? (
					<Button asChild>
						<a href={`/api/sites/${encodeURIComponent(siteId)}/photos/export`}>
							<Download />
							{text.button}
						</a>
					</Button>
				) : (
					<Button disabled>
						<Download />
						{text.button}
					</Button>
				)}
				<span className="text-sm text-muted-foreground">
					{photoCount > 0 ? text.count : text.empty}
				</span>
			</CardContent>
		</Card>
	);
}
