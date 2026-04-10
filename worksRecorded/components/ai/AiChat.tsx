"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useChat } from "ai/react";
import { createPortal } from "react-dom";
import { Bot, Download, Paperclip, SendHorizonal, Trash2, User, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { TableModal } from "@/components/ai/TableModal";
import { downloadDataUrl, extractDataUrls } from "@/components/ai/AIchatHelpers";
import { hasCompletedTour, markTourCompleted } from "@/components/joyride/user-tour-action";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_ai_widget_open } from "@/components/joyride/JoyRideSteps";

type AiWidgetRagProps = {
  siteId?: string;
};

const STORAGE_KEY = (siteId?: string) => `aiwidget:${siteId ?? "default"}`;

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AiWidgetRag({ siteId }: AiWidgetRagProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [expandedData, setExpandedData] = useState<any>(null);
  const [tutorialLocked, setTutorialLocked] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const presetPendingMarkRef = useRef(false);

  const { messages, input, handleInputChange, handleSubmit, setInput, setMessages, isLoading } =
    useChat({
      api: "/api/ai/chat",
      body: { siteId },
      streamProtocol: "text",
      initialMessages: [
        {
          id: "welcome",
          role: "assistant",
          content: "Hi! 👋 How can I help you today?",
        },
      ],
      onError: () => {
        // optional toast hook point
      },
    });

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(siteId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.messages) && parsed.messages.length) {
        setMessages(parsed.messages);
      }
    } catch {
      // ignore storage issues
    }
  }, [setMessages, siteId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY(siteId), JSON.stringify({ messages }));
    } catch {
      // ignore storage issues
    }
  }, [messages, siteId]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [messages, isLoading, open]);

  useEffect(() => {
    if (!open) return;

    (async () => {
      const done = await hasCompletedTour("steps_ai_widget_open");

      if (!done) {
        const preset =
          "Today we 5 workers casted 10m3, and 3 workers we doing steel fixing for 5 hours additional work, delivery of timber was delayed";
        setInput(preset);
        setTutorialLocked(true);
        presetPendingMarkRef.current = true;
      } else {
        setTutorialLocked(false);
      }
    })();
  }, [open, setInput]);

  const submitWithAttachments = async (e?: FormEvent<HTMLFormElement>) => {
    if (!input.trim() && queuedFiles.length === 0) return;

    await handleSubmit(e, {
      experimental_attachments: queuedFiles,
      body: { siteId },
    });

    setQueuedFiles([]);
    setTutorialLocked(false);

    if (presetPendingMarkRef.current) {
      await markTourCompleted("steps_ai_widget_open");
      presetPendingMarkRef.current = false;
    }
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY(siteId));
    } catch {
      // ignore storage issues
    }
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! 👋 How can I help you today?",
      },
    ]);
    setQueuedFiles([]);
  };

  const renderAttachments = (message: any) => {
    const attachments = message.experimental_attachments ?? [];
    if (!attachments.length) return null;

    return (
      <div className="mt-2 grid gap-2">
        {attachments.map((att: any, i: number) => (
          <div
            key={`${message.id}-att-${i}`}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">{att.name ?? `attachment-${i + 1}`}</span>
              {att.url ? (
                <Button size="sm" variant="outline" onClick={() => downloadDataUrl(att.url, att.name)}>
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              ) : null}
            </div>
            {att.size ? <p className="text-slate-500 mt-1">{formatBytes(att.size)}</p> : null}
          </div>
        ))}
      </div>
    );
  };

  const renderMessage = (message: any) => {
    const aiTextRaw = String(message.content ?? "");
    const dataUrls = extractDataUrls(aiTextRaw);

    let tableData: any = null;
    try {
      const maybe = JSON.parse(aiTextRaw);
      if (Array.isArray(maybe) && typeof maybe[0] === "object") {
        tableData = maybe;
      }
    } catch {
      // not table json
    }

    return (
      <div className="space-y-2">
        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiTextRaw}</ReactMarkdown>
        </div>

        {dataUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {dataUrls.map((url, idx) => (
              <Button
                key={`${message.id}-data-${idx}`}
                variant="outline"
                size="sm"
                onClick={() => downloadDataUrl(url, `ai-generated-${idx + 1}`)}
              >
                <Download className="h-3 w-3 mr-1" />
                File {idx + 1}
              </Button>
            ))}
          </div>
        )}

        {tableData ? (
          <Button variant="link" className="p-0 h-auto" onClick={() => setExpandedData(tableData)}>
            View table
          </Button>
        ) : null}

        {renderAttachments(message)}
      </div>
    );
  };

  const chatContent = (
    <Card className="pt-0 w-full h-full rounded-2xl shadow-none border-0 bg-transparent flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 flex flex-col items-start gap-1 py-3 px-4 bg-blue-600 text-white dark:bg-blue-800 rounded-t-2xl">
        <div className="w-full flex items-center justify-between">
          <div>
            <span className="text-lg font-semibold">AI Assistant</span>
            <p className="text-[11px] text-blue-100/90 mt-0.5">Powered by Vercel chat streaming</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              className="text-white hover:text-gray-200"
              title="Clear history"
            >
              <Trash2 size={18} />
            </Button>
            <button
              onClick={() => setOpen(false)}
              className="text-white hover:text-gray-200 transition text-2xl leading-none"
              aria-label="Close Chat"
            >
              ×
            </button>
          </div>
        </div>
      </CardHeader>

      <Separator className="shrink-0" />

      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-4 py-3 max-w-[88%] ${
                  m.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/70"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 text-[11px] opacity-80">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    {m.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  </span>
                  <span>{m.role === "user" ? "You" : "Assistant"}</span>
                </div>
                {renderMessage(m)}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <Separator className="shrink-0" />

      <CardFooter className="shrink-0 flex flex-col gap-2 bg-white dark:bg-gray-900 p-3">
        {queuedFiles.length > 0 && (
          <div className="w-full flex flex-wrap gap-2">
            {queuedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="max-w-[180px] truncate">{file.name}</span>
                <span className="text-slate-500">{formatBytes(file.size)}</span>
                <button
                  className="text-slate-500 hover:text-red-500"
                  onClick={() => setQueuedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submitWithAttachments} className="w-full flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.json,.md"
            onChange={(e) => setQueuedFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Textarea
            ref={inputRef}
            placeholder="Ask anything..."
            value={input}
            disabled={isLoading}
            readOnly={tutorialLocked}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                e.preventDefault();
                void submitWithAttachments();
              }
            }}
            className="flex-1 min-w-0 min-h-[56px] max-h-48"
          />

          <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
            <SendHorizonal size={20} />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );

  return (
    <>
      {open && <TourRunner steps={steps_ai_widget_open} stepName="steps_ai_widget_open" />}

      {!open &&
        createPortal(
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl transition"
            aria-label="Open AI Assistant Chat"
          >
            <Bot size={28} />
          </button>,
          document.body
        )}

      {open &&
        !isMobile &&
        createPortal(
          <div className="fixed bottom-6 right-6 z-50 w-[min(92vw,560px)] h-[min(82vh,680px)] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 flex flex-col">
            {chatContent}
          </div>,
          document.body
        )}

      {open &&
        isMobile &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-black/30 backdrop-blur-sm">
            <div className="mt-auto w-full max-h-[86vh] rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
              {chatContent}
            </div>
          </div>,
          document.body
        )}

      {expandedData && <TableModal data={expandedData} onClose={() => setExpandedData(null)} />}
    </>
  );
}
