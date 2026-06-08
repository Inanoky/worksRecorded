import { render, screen } from "@testing-library/react";
import { OriginalSourceContent } from "./OriginalSourceContent";

describe("OriginalSourceContent", () => {
  it("renders the original message and playable audio when audio URL exists", () => {
    const { container } = render(
      <OriginalSourceContent
        originalUserComment="Test Worker : poured concrete"
        originalAudioUrl="https://ut.test/voice.ogg"
      />,
    );

    expect(screen.getByText("Test Worker : poured concrete")).toBeInTheDocument();
    expect(screen.getByText("Original voice message")).toBeInTheDocument();

    const audio = container.querySelector("audio");
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute("controls");
    expect(audio).toHaveAttribute("preload", "metadata");
    expect(audio).toHaveAttribute("src", "https://ut.test/voice.ogg");
  });

  it("does not render an audio control without audio URL", () => {
    const { container } = render(
      <OriginalSourceContent originalUserComment="Text-only message" />,
    );

    expect(screen.getByText("Text-only message")).toBeInTheDocument();
    expect(container.querySelector("audio")).toBeNull();
  });
});
