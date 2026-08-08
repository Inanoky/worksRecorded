import { sendGTMEvent } from "@next/third-parties/google";
import { trackGenerateLeadOnce } from "./marketing-events";

jest.mock("@next/third-parties/google", () => ({
  sendGTMEvent: jest.fn(),
}));

const sendGTMEventMock = jest.mocked(sendGTMEvent);

describe("trackGenerateLeadOnce", () => {
  beforeEach(() => {
    sendGTMEventMock.mockClear();
  });

  it("sends one standard lead event with a stable event ID", () => {
    expect(trackGenerateLeadOnce("lead-1")).toBe(true);
    expect(trackGenerateLeadOnce("lead-1")).toBe(false);

    expect(sendGTMEventMock).toHaveBeenCalledTimes(1);
    expect(sendGTMEventMock).toHaveBeenCalledWith({
      event: "generate_lead",
      eventModel: {
        currency: "EUR",
        event_id: "lead-1",
        event_name: "generate_lead",
        transaction_id: "lead-1",
        value: 1,
      },
    });
  });

  it("does not send an event without a lead ID", () => {
    expect(trackGenerateLeadOnce("")).toBe(false);
    expect(sendGTMEventMock).not.toHaveBeenCalled();
  });
});
