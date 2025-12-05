// C:\...\components\ai\AiChat.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, SendHorizonal, Trash2, FileDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TableModal } from "@/components/ai/TableModal";
import ReactMarkdown from "react-markdown";
import { Rnd } from "react-rnd";
import { Textarea } from "@/components/ui/textarea";
import remarkGfm from "remark-gfm";
import OrchestratingAgentV2 from "@/server/ai-flows/agents/orchestrating-agent-v2/agent";
import { hasCompletedTour } from "@/components/joyride/user-tour-action";
import TourRunner from "@/components/joyride/TourRunner";
import {
  steps_ai_diary_updated,
  steps_ai_widget_open,
} from "@/components/joyride/JoyRideSteps";

type Message =
  | { sender: "bot"; aiComment: string; answer?: string | any }
  | { sender: "user"; text: string };

const STORAGE_KEY = (siteId?: string) => `aiwidget:${siteId ?? "default"}`;

type AiWidgetRagProps = {
  siteId?: string;
};

export default function AiWidgetRag({ siteId }: AiWidgetRagProps) {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", aiComment: "Hi! 👋 How can I help you today?", answer: "" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [expandedData, setExpandedData] = useState<any>(null);
  const [showDiaryUpdatedTour, setShowDiaryUpdatedTour] = useState(false);
  const [tutorialLocked, setTutorialLocked] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  const router = useRouter();

  const pad = 24;
  const [size, setSize] = useState({ width: 520, height: 600 });
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  // 🔹 Responsive breakpoint
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // 🔹 Position / size only for desktop mode
  useEffect(() => {
    if (!open || isMobile) return;

    function placeBottomRight(w = size.width, h = size.height) {
      const x = Math.max(pad, window.innerWidth - w - pad);
      const y = Math.max(pad, window.innerHeight - h - pad);
      setPos({ x, y });
    }
    placeBottomRight();

    function onResize() {
      setSize((s) => ({
        width: Math.max(350, Math.min(s.width, window.innerWidth - pad * 2)),
        height: Math.max(400, Math.min(s.height, window.innerHeight - pad * 2)),
      }));
      placeBottomRight(size.width, size.height);
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile]);

  // Tutorial preset
  useEffect(() => {
    if (!open) return;

    (async () => {
      const done = await hasCompletedTour("steps_ai_widget_open");
      if (!done) {
        const preset =
          "Today we 5 workers casted 10m3, and 3 workers we doing steel fixing for 5 hours additional work, delivery of timber was delayed";
        setInput(preset);
        setTutorialLocked(true);
      } else {
        setTutorialLocked(false);
      }
    })();
  }, [open]);

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(siteId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.messages) && parsed.messages.length) {
        setMessages(parsed.messages);
      }
    } catch {}
  }, [siteId]);

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY(siteId), JSON.stringify({ messages }));
    } catch {}
  }, [messages, siteId]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      scrollToBottom("auto");
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    scrollToBottom("smooth");
  }, [messages, loading, open]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { sender: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setInput("");

    try {
      const result = await OrchestratingAgentV2(input, siteId);

      const botMsg: Message = {
        sender: "bot",
        aiComment: (result as any) ?? "",
        answer: (result as any)?.acceptedResults ?? "",
      };
      setMessages((m) => [...m, botMsg]);

      setShowDiaryUpdatedTour(true);
    } catch {
      setMessages((m) => [
        ...m,
        { sender: "bot", aiComment: "Something went wrong.", answer: "" },
      ]);
    }

    setLoading(false);
    setTutorialLocked(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSend();
    }
  };

  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY(siteId));
    } catch {}
    setMessages([
      { sender: "bot", aiComment: "Hi! 👋 How can I help you today?", answer: "" },
    ]);
  }

  function renderMessage(msg: Message) {
    if (msg.sender === "bot" && "aiComment" in msg) {
      let isTable = false;
      let tableData: any = null;

      const rawAnswer = (msg as any).answer;
      if (rawAnswer) {
        if (Array.isArray(rawAnswer) && typeof rawAnswer[0] === "object") {
          isTable = true;
          tableData = rawAnswer;
        } else {
          try {
            const parsed = JSON.parse(rawAnswer);
            if (Array.isArray(parsed) && typeof parsed[0] === "object") {
              isTable = true;
              tableData = parsed;
            }
          } catch {}
        }
      }

      const aiTextRaw = String((msg as any).aiComment ?? "");
      const fileLinkMatch = aiTextRaw.match(
        /(https?:\/\/[^\s)]+\/api\/webhook\/filesDownload[^\s)]*)/i
      );
      const fileLink = fileLinkMatch ? fileLinkMatch[0] : null;
      const aiTextClean = fileLink
        ? aiTextRaw.replace(fileLink, "").trim()
        : aiTextRaw;

      return (
        <div className="space-y-3">
          {aiTextClean && (
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {aiTextClean}
              </ReactMarkdown>
            </div>
          )}

          {fileLink && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">
                <FileDown className="h-4 w-4" />
                <span>Download generated file</span>
              </div>
              <a
                href={fileLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-blue-500 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-500/10"
              >
                Download
              </a>
            </div>
          )}

          {isTable ? (
            <button
              className="text-sm text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => setExpandedData(tableData)}
            >
              View table
            </button>
          ) : rawAnswer ? (
            <span className="ml-1 text-sm">{String(rawAnswer ?? "")}</span>
          ) : null}
        </div>
      );
    }

    // USER MESSAGE – keep text white for readability
    return (
      <div className="flex items-start gap-2 justify-end">
        <div className="mt-0.5 shrink-0 rounded-full bg-blue-500 p-1.5 text-white">
          <User className="h-4 w-4" />
        </div>
        <div className="text-sm text-white dark:text-white text-right leading-relaxed whitespace-pre-wrap">
          {(msg as any).text}
        </div>
      </div>
    );
  }

  const chatContent = (
    <Card className="pt-0 w-full h-full rounded-2xl shadow-none border-0 bg-transparent flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 flex flex-col items-start gap-1 py-3 px-4 bg-blue-600 text-white dark:bg-blue-800 dark:text-white rounded-t-2xl">
        <div className="w-full flex items-center justify-between">
          <span className="text-lg font-semibold">AI Assistant</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              className="text-white hover:text-gray-200 dark:hover:text-gray-300"
              title="Clear history"
            >
              <Trash2 size={18} />
            </Button>
            <button
              onClick={() => setOpen(false)}
              className="text-white hover:text-gray-200 dark:hover:text-gray-300 transition text-2xl leading-none"
              aria-label="Close Chat"
            >
              ×
            </button>
          </div>
        </div>
        <p className="text-xs text-blue-100/90">
          Ask about this project, invoices, diary, or analytics.
        </p>
      </CardHeader>

      <Separator className="shrink-0" />

      <ScrollArea
        className="flex-1 min-h-0 p-4"
        data-tour="AI-responed-received"
      >
        <div className="flex flex-col gap-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-2xl px-4 py-2 max-w-[80%] ${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white dark:bg-blue-600 dark:text-white"
                    : "bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/70"
                }`}
              >
                {renderMessage(msg)}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-2xl px-4 py-2 max-w-[70%] animate-pulse">
                <Bot size={18} className="inline mr-2" /> ...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <Separator className="shrink-0" />

      <CardFooter className="shrink-0 flex gap-2 bg-white dark:bg-gray-900 p-3">
        <Textarea
          ref={inputRef}
          placeholder="Type your message…"
          value={input}
          disabled={loading}
          readOnly={tutorialLocked}
          onChange={(e) => {
            if (tutorialLocked) return;
            setInput(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-white dark:bg-gray-800 dark:text-gray-100"
          data-tour="AI-widget-open"
        />
        <Button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          size="icon"
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
        >
          <SendHorizonal size={20} />
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <>
      {open && (
        <TourRunner
          steps={steps_ai_widget_open}
          stepName="steps_ai_widget_open"
        />
      )}
      {showDiaryUpdatedTour && (
        <TourRunner
          steps={steps_ai_diary_updated}
          stepName="steps_ai_diary_updated"
          onFinished={() => {
            setShowDiaryUpdatedTour(false);
            if (siteId) {
              window.location.reload();
            }
          }}
        />
      )}

      {/* Floating button */}
      {!open &&
        createPortal(
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl transition"
            aria-label="Open AI Assistant Chat"
            data-tour="AI-widget"
          >
            <Bot size={28} />
          </button>,
          document.body
        )}

      {/* Desktop: floating resizable window */}
      {open && !isMobile &&
        createPortal(
          <div className="fixed inset-0 z-50 pointer-events-none">
            <Rnd
              size={size}
              position={pos}
              bounds="window"
              disableDragging
              enableResizing={{
                top: true,
                right: true,
                bottom: true,
                left: true,
                topRight: true,
                bottomRight: true,
                bottomLeft: true,
                topLeft: true,
              }}
              onResizeStop={(_, __, ref) => {
                const newW = ref.offsetWidth;
                const newH = ref.offsetHeight;
                const newX = Math.max(pad, window.innerWidth - newW - pad);
                const newY = Math.max(pad, window.innerHeight - newH - pad);
                setSize({ width: newW, height: newH });
                setPos({ x: newX, y: newY });
              }}
              resizeHandleStyles={{
                right: { width: "10px", right: "-4px", cursor: "ew-resize" },
                left: { width: "10px", left: "-4px", cursor: "ew-resize" },
                bottom: { height: "10px", bottom: "-4px", cursor: "ns-resize" },
                top: { height: "10px", top: "-4px", cursor: "ns-resize" },
                bottomRight: {
                  width: "16px",
                  height: "16px",
                  right: "-6px",
                  bottom: "-6px",
                  cursor: "nwse-resize",
                },
                bottomLeft: {
                  width: "16px",
                  height: "16px",
                  left: "-6px",
                  bottom: "-6px",
                  cursor: "nesw-resize",
                },
                topRight: {
                  width: "16px",
                  height: "16px",
                  right: "-6px",
                  top: "-6px",
                  cursor: "nwse-resize",
                },
                topLeft: {
                  width: "16px",
                  height: "16px",
                  left: "-6px",
                  top: "-6px",
                  cursor: "nwse-resize",
                },
              }}
              minWidth={350}
              minHeight={400}
              className="pointer-events-auto border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 flex flex-col"
            >
              {chatContent}
            </Rnd>
          </div>,
          document.body
        )}

      {/* Mobile: bottom sheet */}
      {open && isMobile &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-black/30 backdrop-blur-sm">
            <div className="mt-auto w-full max-h-[80vh] rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
              {chatContent}
            </div>
          </div>,
          document.body
        )}

      {expandedData && (
        <TableModal data={expandedData} onClose={() => setExpandedData(null)} />
      )}
    </>
  );
}
