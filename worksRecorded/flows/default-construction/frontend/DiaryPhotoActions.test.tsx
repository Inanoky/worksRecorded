import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	DiaryPhotoActions,
	DiaryPhotoUploadMenuItem,
	DiaryPhotoUploadProvider,
} from "./DiaryPhotoActions";

const upload = jest.fn();
const refresh = jest.fn();
const success = jest.fn();
const error = jest.fn();
let callbacks: {
	onUploadBegin: () => void;
	onUploadProgress: (value: number) => void;
	onUploadError: (value: { code: string }) => void;
};
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("sonner", () => ({
	toast: {
		success: (...args: unknown[]) => success(...args),
		error: (...args: unknown[]) => error(...args),
	},
}));
jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	useUploadThing: (_route: string, options: typeof callbacks) => {
		callbacks = options;
		return { startUpload: upload };
	},
}));

function menu(onUploaded = jest.fn()) {
	render(
		<DiaryPhotoUploadProvider>
			<DropdownMenu defaultOpen>
				<DropdownMenuTrigger>Actions</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DiaryPhotoUploadMenuItem
						siteId="site"
						recordId="record"
						onUploaded={onUploaded}
					/>
				</DropdownMenuContent>
			</DropdownMenu>
		</DiaryPhotoUploadProvider>,
	);
	fireEvent.click(screen.getByRole("menuitem", { name: "Pievienot foto" }));
	return onUploaded;
}
const photo = () => new File(["image"], "photo.jpg", { type: "image/jpeg" });
function select(files = [photo()]) {
	fireEvent.change(
		screen.getByLabelText("Izvēlēties foto", { selector: "input" }),
		{ target: { files } },
	);
}
function start() {
	fireEvent.click(screen.getByRole("button", { name: "Augšupielādēt" }));
}
const saved = (url = "https://host/new") => ({
	serverData: { url, photos: ["https://host/old", url] },
});
beforeEach(() => jest.resetAllMocks());

it("only shows the upload option inside the actions menu", () => {
	render(<DiaryPhotoActions siteId="site" recordId="record" />);
	expect(screen.getByRole("button", { name: "Darbības" })).toBeInTheDocument();
	expect(screen.queryByText("Pievienot foto")).toBeNull();
});
it("keeps the picker and dialog mounted after the menu closes", async () => {
	menu();
	await waitFor(() => expect(screen.queryByRole("menuitem")).toBeNull());
	expect(screen.getByRole("dialog")).toBeInTheDocument();
	const input = screen.getByLabelText("Izvēlēties foto", { selector: "input" });
	const click = jest.spyOn(input, "click").mockImplementation(() => {});
	fireEvent.click(screen.getByRole("button", { name: "Izvēlēties foto" }));
	expect(click).toHaveBeenCalled();
});
it("waits for explicit upload and updates the selected record with confirmed photos", async () => {
	upload.mockResolvedValue([saved()]);
	const onUploaded = menu();
	const file = photo();
	select([file]);
	expect(upload).not.toHaveBeenCalled();
	expect(screen.getByText("photo.jpg")).toBeInTheDocument();
	start();
	await waitFor(() => expect(success).toHaveBeenCalled());
	expect(upload).toHaveBeenCalledWith([file], {
		siteId: "site",
		recordId: "record",
	});
	expect(onUploaded).toHaveBeenCalledWith([
		"https://host/old",
		"https://host/new",
	]);
	expect(refresh).toHaveBeenCalled();
	expect(screen.getByRole("status")).toHaveTextContent("Pievienoti 1 foto.");
});
it("shows progress and a distinct saving phase until the server confirms linkage", async () => {
	let resolve!: (value: unknown[]) => void;
	upload.mockImplementation(
		() =>
			new Promise((done) => {
				resolve = done;
			}),
	);
	menu();
	select();
	start();
	act(() => callbacks.onUploadProgress(45));
	expect(screen.getByRole("progressbar")).toHaveAttribute("value", "45");
	expect(screen.getByRole("status")).toHaveTextContent("45%");
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(screen.getByRole("dialog")).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Pievieno foto…" })).toBeDisabled();
	act(() => callbacks.onUploadProgress(100));
	expect(screen.getByRole("status")).toHaveTextContent(
		"Saglabā foto pie ieraksta",
	);
	expect(success).not.toHaveBeenCalled();
	await act(async () => resolve([saved()]));
	expect(success).toHaveBeenCalledTimes(1);
});
it.each([
	undefined,
	[],
	[{ serverData: null }],
	[{ serverData: { url: "https://host/new", photos: [] } }],
])(
	"does not report success without attachment confirmation: %j",
	async (result) => {
		upload.mockResolvedValue(result);
		const onUploaded = menu();
		select();
		start();
		await waitFor(() => expect(error).toHaveBeenCalled());
		expect(success).not.toHaveBeenCalled();
		expect(onUploaded).not.toHaveBeenCalled();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Daži foto, iespējams, ir saglabāti",
		);
		expect(screen.getByRole("button", { name: "Aizvērt" })).toBeEnabled();
	},
);
it("preserves confirmed photos but warns about a partial batch", async () => {
	upload.mockResolvedValue([saved()]);
	const onUploaded = menu();
	select([photo(), photo()]);
	start();
	await waitFor(() => expect(error).toHaveBeenCalled());
	expect(onUploaded).toHaveBeenCalledWith([
		"https://host/old",
		"https://host/new",
	]);
	expect(success).not.toHaveBeenCalled();
});
it("displays the SDK error code even when the SDK resolves undefined", async () => {
	upload.mockImplementation(async () => {
		callbacks.onUploadError({ code: "FORBIDDEN" });
		return undefined;
	});
	menu();
	select();
	start();
	await waitFor(() =>
		expect(screen.getByRole("alert")).toHaveTextContent("FORBIDDEN"),
	);
});
it("clearly reports rejection before uploading without claiming photos may be saved", async () => {
	upload.mockImplementation(async () => {
		callbacks.onUploadError({ code: "BAD_REQUEST" });
		return undefined;
	});
	menu();
	select();
	start();
	await waitFor(() =>
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Foto augšupielāde nav sākta",
		),
	);
	expect(screen.getByRole("alert")).not.toHaveTextContent("Daži foto");
	expect(success).not.toHaveBeenCalled();
});
it("keeps the partial-upload warning if a file already started uploading", async () => {
	upload.mockImplementation(async () => {
		callbacks.onUploadBegin();
		callbacks.onUploadError({ code: "BAD_REQUEST" });
		return undefined;
	});
	menu();
	select();
	start();
	await waitFor(() =>
		expect(screen.getByRole("alert")).toHaveTextContent("Daži foto"),
	);
});
it.each(["pdf", "count", "size"])(
	"rejects invalid files before upload: %s",
	(kind) => {
		menu();
		const large = photo();
		Object.defineProperty(large, "size", { value: 17 * 1024 * 1024 });
		select(
			kind === "pdf"
				? [new File(["x"], "x.pdf", { type: "application/pdf" })]
				: kind === "count"
					? Array.from({ length: 11 }, photo)
					: [large],
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Izvēlieties līdz 10 attēliem",
		);
		expect(
			screen.getByRole("button", { name: "Augšupielādēt" }),
		).toBeDisabled();
		expect(upload).not.toHaveBeenCalled();
	},
);
it("handles network failures without dismissing the error", async () => {
	upload.mockRejectedValue(new Error("network"));
	menu();
	select();
	start();
	await waitFor(() => expect(error).toHaveBeenCalled());
	expect(screen.getByRole("dialog")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Aizvērt" }));
	await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});
