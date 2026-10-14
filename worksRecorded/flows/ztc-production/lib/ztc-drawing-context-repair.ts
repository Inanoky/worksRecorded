import { readZtcAdditionalWorkContext } from "./ztc-additional-work-context";

export function canRepairZtcDrawingContext(session: {
	Location: string | null;
	Works_Custom_1: string | null;
	Comments_Custom_2: string | null;
}) {
	return (
		session.Location !== "Papilddarbi" &&
		session.Works_Custom_1 !== "Papilddarbi" &&
		!readZtcAdditionalWorkContext(session.Comments_Custom_2)
	);
}
