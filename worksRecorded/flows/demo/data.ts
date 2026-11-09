import type { VisualMark } from "@/flows/default-construction/visual/model";
import { emptyProposal, type FimaRow } from "@/flows/fima/lib/records";

import { DEMO_SITE_ID } from "./constants";
export { DEMO_SITE_ID };
export const DEMO_PROJECT_NAME = "Ozolu biroju centrs";
export const demoFloors = ["1. stāvs", "2. stāvs"];
export const demoWorks = [
	"Smilts pamatnes izlīdzināšana",
	"XPS siltumizolācijas ieklāšana, 100 mm",
	"Hidroizolācijas plēves ieklāšana",
	"Betona grīdas izbūve, 70 mm",
];
export const demoRooms = [
	{ x: 300, y: 180, width: 210, height: 180 },
	{ x: 510, y: 180, width: 210, height: 180 },
	{ x: 720, y: 180, width: 210, height: 180 },
	{ x: 300, y: 420, width: 210, height: 180 },
	{ x: 510, y: 420, width: 210, height: 180 },
	{ x: 720, y: 420, width: 210, height: 180 },
];

export function createDemoData() {
	const records: FimaRow[] = [];
	const marks: Record<string, VisualMark[]> = {};
	const locations: Record<
		string,
		{ floor: string; room: string; image: string }
	> = {};
	for (let floor = 1; floor <= 2; floor++) {
		const location = demoFloors[floor - 1];
		marks[location] = [];
		for (let index = 0; index < 6; index++) {
			const id = `demo-work-${floor}-${index + 1}`;
			const roomIndex = [0, 0, 1, 1, 3, 4][index];
			const room = demoRooms[roomIndex];
			const roomName = `${floor}0${roomIndex + 1}`;
			const work = demoWorks[index % demoWorks.length];
			const date = `2026-11-0${2 + index}`;
			const quantity = [42, 42, 38, 38, 46, 44][index];
			records.push({
				id,
				localId: `DEMO-${String(records.length + 1).padStart(3, "0")}`,
				siteId: DEMO_SITE_ID,
				version: 1,
				stage: index % 3 === 0 ? "ready" : index === 4 ? "hold" : "draft",
				proposal: {
					...emptyProposal(date),
					sourceWork: work,
					description: `${location}, telpa ${roomName}. Pabeigta ${work.toLocaleLowerCase("lv")}. Veikts ${quantity} m² apjomā.`,
					quantity,
					measurement: "31",
					unit: "m²",
					workers: 4,
					start: "08:00",
					end: "16:30",
					responsibleId: "1",
					responsibleType: "person",
					buildingIds: ["1"],
					drawings: [
						{
							id: String(floor),
							title: `${location} plāns`,
							sheet: `AR-0${floor}`,
							revision: "A",
						},
					],
					materials: [
						{
							id: String(index + 1),
							name: ["Smilts", "XPS 100 mm", "PE plēve", "Betons C25/30"][
								index % 4
							],
							quantity: index % 4 === 3 ? 2.66 : quantity,
							unit: index % 4 === 3 ? "m³" : "m²",
							plannedQuantity: null,
						},
					],
					notes: `${location}, telpa ${roomName}.`,
					reviewed: index % 3 === 0,
				},
				sources: [
					{
						file: "Darbu atskaite.xlsx",
						sheet: location,
						cell: `A${index + 2}`,
						raw: `${date}. ${location}, telpa ${roomName}. ${work}, ${quantity} m². Brigādē ${4} cilvēki.`,
						crew: "Grīdu darbu brigāde",
					},
				],
				bisId: null,
				bisCaseId: null,
				bisStatus: null,
				managed: false,
				snapshot: null,
				updatedAt: `${date}T16:30:00.000Z`,
			});
			locations[id] = {
				floor: location,
				room: roomName,
				image: `/demo/source-${floor}-${index + 1}.svg`,
			};
			marks[location].push({
				id: `mark-${id}`,
				evidenceId: id,
				page: 1,
				polygon: [
					{ x: (room.x + 5) / 1200, y: (room.y + 5) / 800 },
					{ x: (room.x + room.width - 5) / 1200, y: (room.y + 5) / 800 },
					{
						x: (room.x + room.width - 5) / 1200,
						y: (room.y + room.height - 5) / 800,
					},
					{ x: (room.x + 5) / 1200, y: (room.y + room.height - 5) / 800 },
				],
				layer: ["sand", "xps", "film", "estrich"][index % 4],
				confidence: 1,
				anchors: [`Telpa ${roomName}`, `AR-0${floor}`],
				explanation: "Darba zona atbilstoši avota rasējumam.",
			});
		}
	}
	return { records, marks, locations };
}
