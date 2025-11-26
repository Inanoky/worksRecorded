"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, SendHorizonal, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TableModal } from "@/components/ai/TableModal";
import ReactMarkdown from "react-markdown";
import { Rnd } from "react-rnd";
import { Textarea } from "../ui/textarea";
import remarkGfm from "remark-gfm";
import OrchestratingAgentV2 from "@/server/ai-flows/agents/orchestrating-agent-v2/agent";

type Message =
  | { sender: "bot"; aiComment: string; answer?: string | any }
  | { sender: "user"; text: string };

const STORAGE_KEY = (siteId?: string) => `aiwidget:${siteId ?? "default"}`;

export default function AiWidgetRag({ siteId }: { siteId?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", aiComment: "Hi! 👋 How can I help you today?", answer: "" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [expandedData, setExpandedData] = useState<any>(null);

  const pad = 24; // keep 24px from bottom-right
  const [size, setSize] = useState({ width: 520, height: 600 });
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Refs for input focus and bottom anchor
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  // Place bottom-right when opened and clamp on window resize
  useEffect(() => {
    function placeBottomRight(w = size.width, h = size.height) {
      const x = Math.max(pad, window.innerWidth - w - pad);
      const y = Math.max(pad, window.innerHeight - h - pad);
      setPos({ x, y });
    }
    if (open) placeBottomRight();

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
  }, [open]);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(siteId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.messages) && parsed.messages.length) {
        setMessages(parsed.messages);
      }
    } catch {
      // ignore
    }
  }, [siteId]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY(siteId), JSON.stringify({ messages }));
    } catch {
      // ignore
    }
  }, [messages, siteId]);

  // When chat opens, jump to bottom and focus input
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      scrollToBottom("auto");
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Keep pinned to bottom when messages/loading change
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
        aiComment: result ?? "",
        answer: result?.acceptedResults ?? "",
      };
      setMessages((m) => [...m, botMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        { sender: "bot", aiComment: "Something went wrong.", answer: "" },
      ]);
    }
    setLoading(false);
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

      return (
        <span>
          <Bot size={18} className="inline mr-2" />
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {String((msg as any).aiComment)}
            </ReactMarkdown>
          </div>
          {isTable ? (
            <button
              className="text-blue-700 dark:text-blue-400 underline hover:text-blue-900 dark:hover:text-blue-300 ml-1"
              onClick={() => setExpandedData(tableData)}
            >
              View table
            </button>
          ) : rawAnswer ? (
            <span className="ml-1">{String(rawAnswer ?? "")}</span>
          ) : null}
        </span>
      );
    }

    // user
    return (
      <span>
        <User size={18} className="inline mr-2" />
        {(msg as any).text}
      </span>
    );
  }

  return (
    <>
      {/* Launcher */}
      {!open &&
        createPortal(
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl transition"
            aria-label="Open AI Assistant Chat"
            data-tour="AI-widget"   // 👈 move the data-tour here
          >
            <Bot size={28} />
          </button>,
          document.body
        )}

      {/* Fixed overlay; RND bounded to window */}
      {open &&
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
                bottomRight: { width: "16px", height: "16px", right: "-6px", bottom: "-6px", cursor: "nwse-resize" },
                bottomLeft: { width: "16px", height: "16px", left: "-6px", bottom: "-6px", cursor: "nesw-resize" },
                topRight: { width: "16px", height: "16px", right: "-6px", top: "-6px", cursor: "nwse-resize" },
                topLeft: { width: "16px", height: "16px", left: "-6px", top: "-6px", cursor: "nwse-resize" },
              }}
              minWidth={350}
              minHeight={400}
              className="pointer-events-auto border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 flex flex-col"
            >
              <Card className="pt-0 w-full h-full rounded-2xl shadow-none border-0 bg-transparent flex flex-col overflow-hidden">
                {/* Header */}
                <CardHeader className="shrink-0 flex items-center justify-between py-3 px-4 bg-blue-600 text-white dark:bg-blue-800 dark:text-white rounded-t-2xl">
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
                </CardHeader>

                <Separator className="shrink-0" />

                {/* Chat area */}
                <ScrollArea className="flex-1 min-h-0 p-4">
                  <div className="flex flex-col gap-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-2 max-w-[70%] ${
                            msg.sender === "user"
                              ? "bg-blue-500 text-white dark:bg-blue-600 dark:text-white"
                              : "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                          }`}
                        >
                          {renderMessage(msg)}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-2xl px-4 py-2 max-w-[70%] animate-pulse">
                          <Bot size={18} className="inline mr-2" /> ...
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>

                <Separator className="shrink-0" />

                {/* Footer */}
                <CardFooter className="shrink-0 flex gap-2 bg-white dark:bg-gray-900 p-3">
                  <Textarea
                    ref={inputRef}
                    placeholder="Type your message…"
                    value={input}
                    disabled={loading}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-0 bg-white dark:bg-gray-800 dark:text-gray-100"
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
            </Rnd>
          </div>,
          document.body
        )}

      {/* Table modal */}
      {expandedData && (
        <TableModal data={expandedData} onClose={() => setExpandedData(null)} />
      )}
    </>
  );
}