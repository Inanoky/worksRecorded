export type DiaryPromptSection = {
	id: string;
	title: string;
	description: string;
	version: number;
	text: string;
};

export type DiaryPromptSelection = Omit<DiaryPromptSection, "text"> & {
	included: boolean;
	reason: string;
	characters: number;
};
