import "@testing-library/jest-dom";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { requestWasenderConnections } from "@/flows/default-construction/visual/wasender-connections-client";
import { VisualWhatsAppConnectionsCard } from "./VisualWhatsAppConnectionsCard";

jest.mock(
	"@/flows/default-construction/visual/wasender-connections-client",
	() => ({
		...jest.requireActual(
			"@/flows/default-construction/visual/wasender-connections-client",
		),
		requestWasenderConnections: jest.fn(),
	}),
);

const request = jest.mocked(requestWasenderConnections);

afterEach(() => {
	jest.clearAllMocks();
	jest.useRealTimers();
});

it("adds a number in project settings and closes the QR panel when the phone connects", async () => {
	jest.useFakeTimers();
	const phone = "+371 20 000 000";
	const connection = {
		id: "phone-connection",
		phone: "+37120000000",
		status: "pairing",
	};
	request
		.mockResolvedValueOnce({ enabled: true, connections: [] })
		.mockResolvedValueOnce({ connection })
		.mockResolvedValueOnce({ ...connection, status: "connected" });
	render(<VisualWhatsAppConnectionsCard siteId="site" />);
	const input = await screen.findByRole("textbox", { name: "Tālruņa numurs" });
	fireEvent.change(input, { target: { value: phone } });
	fireEvent.click(screen.getByRole("button", { name: "Pievienot numuru" }));
	const qr = await screen.findByRole("img", {
		name: "WhatsApp savienošanas QR kods",
	});
	expect(qr.getAttribute("src")).toContain(
		"/api/sites/site/visual/whatsapp-connections?qr=phone-connection",
	);
	expect(request).toHaveBeenCalledWith(
		"/api/sites/site/visual/whatsapp-connections",
		expect.objectContaining({
			method: "POST",
			body: JSON.stringify({ action: "add", phone }),
		}),
	);
	await act(async () => {
		jest.advanceTimersByTime(5000);
	});
	await waitFor(() =>
		expect(screen.getByText("Savienots")).toBeInTheDocument(),
	);
	expect(
		screen.queryByRole("img", { name: "WhatsApp savienošanas QR kods" }),
	).toBeNull();
	expect(screen.getByRole("button", { name: "Atvienot" })).toBeEnabled();
});
