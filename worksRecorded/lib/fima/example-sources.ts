export type FimaExampleSource = {
	id: string;
	siteId: string;
	fimaNumber: number | null;
	work: string;
};

export type FimaExampleSources = Record<string, FimaExampleSource[]>;
