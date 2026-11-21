import type { MultiPolygon } from "polygon-clipping";

export const SMERLA_SECTION_MAP_SITE_ID =
	"b07a1080-0d74-4991-80ea-20f378420542";

export const sectionBoundaryStyles = {
	"PA1.1": { color: "#2563eb", label: "Ārpus vannas istabām" },
	"PA1.2": { color: "#a21caf", label: "Vannas istabas" },
	"PA1.6": { color: "#2563eb", label: "Ārpus vannas istabām" },
	"PA1.7": { color: "#a21caf", label: "Vannas istabas" },
};

export type SectionBoundaryCode = keyof typeof sectionBoundaryStyles;
export type SectionBoundary = {
	code: SectionBoundaryCode;
	geometry: MultiPolygon;
};

export type SectionBoundaryMap = {
	drawing: string;
	finishDrawing: string;
	drawingSha256: string;
	finishSha256: string;
	page: number;
	unmappedRooms: string[];
	sections: SectionBoundary[];
	revision: string | null;
	editedAt?: string;
};
