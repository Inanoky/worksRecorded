"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteTgemProject } from "@/server/actions/tgem-project-actions";

function getCopy(language?: string | null) {
	if (language === "en")
		return {
			title: "Delete project",
			warning:
				"The project and its project-specific data and settings will be permanently deleted. TGEM invoices will be kept without a project assignment. Shared organization cost codes will not be deleted.",
			question: "Are you sure you want to delete this project?",
			cancel: "Cancel",
			confirm: "Yes, delete project",
			deleting: "Deleting…",
			failed: "Could not delete the project. Refresh the page and try again.",
		};
	if (language === "ru")
		return {
			title: "Удалить проект",
			warning:
				"Проект, его данные и настройки будут удалены безвозвратно. Счета TGEM сохранятся без привязки к проекту. Общие коды затрат организации не будут удалены.",
			question: "Вы уверены, что хотите удалить этот проект?",
			cancel: "Отмена",
			confirm: "Да, удалить проект",
			deleting: "Удаление…",
			failed:
				"Не удалось удалить проект. Обновите страницу и попробуйте снова.",
		};
	return {
		title: "Dzēst projektu",
		warning:
			"Projekts, tā dati un iestatījumi tiks neatgriezeniski dzēsti. TGEM rēķini tiks saglabāti bez piesaistes projektam. Organizācijas kopīgie izmaksu kodi netiks dzēsti.",
		question: "Vai tiešām vēlaties dzēst šo projektu?",
		cancel: "Atcelt",
		confirm: "Jā, dzēst projektu",
		deleting: "Dzēš…",
		failed: "Neizdevās dzēst projektu. Atjaunojiet lapu un mēģiniet vēlreiz.",
	};
}

export function TgemProjectDeleteCard({
	project,
	organizationLanguage,
}: {
	project: { id: string; name: string };
	organizationLanguage?: string | null;
}) {
	const copy = getCopy(organizationLanguage);
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState(false);
	const deleting = useRef(false);

	async function remove() {
		if (deleting.current) return;
		deleting.current = true;
		setPending(true);
		setError(false);
		try {
			const result = await deleteTgemProject(project.id);
			if (!result.ok) {
				setError(true);
				return;
			}
			setOpen(false);
			router.push("/dashboard/sites");
			router.refresh();
		} catch {
			setError(true);
		} finally {
			deleting.current = false;
			setPending(false);
		}
	}

	return (
		<Card className="mt-6 border-destructive/40">
			<CardHeader>
				<CardTitle className="text-base text-destructive">
					{copy.title}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<p className="break-words font-medium">{project.name}</p>
				<p className="max-w-3xl text-sm text-muted-foreground">
					{copy.warning}
				</p>
				<AlertDialog
					open={open}
					onOpenChange={(next) => {
						if (deleting.current) return;
						setError(false);
						setOpen(next);
					}}
				>
					<AlertDialogTrigger asChild>
						<Button type="button" variant="destructive" disabled={pending}>
							<Trash2 className="size-4" />
							{copy.title}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{copy.question}</AlertDialogTitle>
							<AlertDialogDescription>
								<span className="mb-2 block break-words font-semibold text-foreground">
									{project.name}
								</span>
								{copy.warning}
							</AlertDialogDescription>
						</AlertDialogHeader>
						{error ? (
							<p role="alert" className="text-sm text-destructive">
								{copy.failed}
							</p>
						) : null}
						<AlertDialogFooter>
							<AlertDialogCancel disabled={pending}>
								{copy.cancel}
							</AlertDialogCancel>
							<Button
								type="button"
								variant="destructive"
								disabled={pending}
								onClick={() => void remove()}
							>
								{pending ? copy.deleting : copy.confirm}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	);
}
