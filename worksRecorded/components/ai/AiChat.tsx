"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Download,
  FileDown,
  Loader2,
  Paperclip,
  SendHorizonal,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TableModal } from "@/components/ai/TableModal";
import ReactMarkdown from "react-markdown";
import { Rnd } from "react-rnd";
import { Textarea } from "@/components/ui/textarea";
import remarkGfm from "remark-gfm";
import OrchestratingAgentV2 from "@/server/ai-flows/agents/orchestrating-agent-v2/agent";
import {
  hasCompletedTour,
  markTourCompleted,
} from "@/components/joyride/user-tour-action";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_ai_widget_open } from "@/components/joyride/JoyRideSteps";
import { downloadDataUrl, extractDataUrls } from "@/components/ai/AIchatHelpers";

type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: "image" | "document";
  downloadUrl?: string;
  textContent?: string;
};

type BotMessage = {
  id: string;
  sender: "bot";
  aiComment: string;
  answer?: string | any;
  createdAt: string;
  streaming?: boolean;
  attachments?: Attachment[];
};

type UserMessage = {
  id: string;
  sender: "user";
  text: string;
  createdAt: string;
  attachments?: Attachment[];
};

type Message = BotMessage | UserMessage;

// Primary context store for chat continuity:
// we persist the local conversation per site in localStorage
// and only send a trimmed recent window on each request.
const STORAGE_KEY = (siteId?: string) => `aiwidget:${siteId ?? "default"}`;
const MAX_ATTACHMENTS = 8;
const MAX_TEXT_EXTRACT = 5000;
const STREAM_CHUNK_SIZE = 18;
const STREAM_DELAY_MS = 14;
const MAX_CONTEXT_MESSAGES = 10;
const MAX_CONTEXT_CHARS = 4000;

type AiWidgetRagProps = {
  siteId?: string;
};

function toId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function toText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function safeFilename(name = "download.bin") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function composePrompt(text: string, attachments: Attachment[], recentContext: string) {
  const sections: string[] = [];

  if (recentContext.trim()) {
    sections.push(`Recent conversation context:\n${recentContext}`);
  }

  if (attachments.length) {
    const attachmentContext = attachments
      .map((file, i) => {
        const base = `#${i + 1} ${file.name} (${file.mimeType || "unknown"}, ${formatBytes(file.size)})`;
        const extracted = file.textContent?.trim();
        if (!extracted) return base;
        return `${base}\nExtracted content:\n${extracted.slice(0, MAX_TEXT_EXTRACT)}`;
      })
      .join("\n\n");

    sections.push(
      `Attached files context:\n${attachmentContext}\n\nUse the attached file context in your answer when relevant.`
    );
  }

  if (!sections.length) return text;
  return `${sections.join("\n\n")}\n\nCurrent user message:\n${text}`;
}

export default function AiWidgetRag({ siteId }: AiWidgetRagProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: toId(),
      sender: "bot",
      aiComment: "Hi! 👋 How can I help you today?",
      answer: "",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [queuedAttachments, setQueuedAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [expandedData, setExpandedData] = useState<any>(null);
  const [showDiaryUpdatedTour, setShowDiaryUpdatedTour] = useState(false);
  const [tutorialLocked, setTutorialLocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const pad = 24;
  const [size, setSize] = useState({ width: 560, height: 680 });
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const presetPendingMarkRef = useRef(false);

  const canSend = useMemo(
    () => (!loading && !!input.trim()) || (!loading && queuedAttachments.length > 0),
    [input, loading, queuedAttachments.length]
  );

  const buildRecentContext = (history: Message[]) => {
    const filtered = history.filter((m) => {
      if (m.sender === "user") return !!m.text?.trim();
      return !!m.aiComment?.trim() && m.aiComment !== "Hi! 👋 How can I help you today?";
    });

    const recent = filtered.slice(-MAX_CONTEXT_MESSAGES);
    const context = recent
      .map((msg) => {
        if (msg.sender === "user") return `User: ${msg.text}`;
        return `Assistant: ${String(msg.aiComment ?? "").replace(/\s+/g, " ").trim()}`;
      })
      .join("\n");

    return context.slice(-MAX_CONTEXT_CHARS);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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
        width: Math.max(380, Math.min(s.width, window.innerWidth - pad * 2)),
        height: Math.max(460, Math.min(s.height, window.innerHeight - pad * 2)),
      }));
      placeBottomRight(size.width, size.height);
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile]);

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
        presetPendingMarkRef.current = false;
      }
    })();
  }, [open]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(siteId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.messages) && parsed.messages.length) {
        setMessages(parsed.messages);
      }
    } catch {
      // ignore persisted state errors
    }
  }, [siteId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY(siteId), JSON.stringify({ messages }));
    } catch {
      // ignore persisted state errors
    }
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

  async function buildAttachment(file: File): Promise<Attachment> {
    const isImage = file.type.startsWith("image/");
    const isTextLike =
      file.type.startsWith("text/") ||
      ["application/json", "application/xml", "text/csv"].includes(file.type) ||
      /\.(md|txt|csv|json|xml|log)$/i.test(file.name);

    let textContent: string | undefined;
    let downloadUrl: string | undefined;

    if (isTextLike && file.size < 3 * 1024 * 1024) {
      textContent = (await toText(file)).slice(0, MAX_TEXT_EXTRACT);
      downloadUrl = await toDataUrl(file);
    } else if (isImage || file.size < 2 * 1024 * 1024) {
      downloadUrl = await toDataUrl(file);
    }

    return {
      id: toId(),
      name: safeFilename(file.name),
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      kind: isImage ? "image" : "document",
      downloadUrl,
      textContent,
    };
  }

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const roomLeft = Math.max(0, MAX_ATTACHMENTS - queuedAttachments.length);
    const filesToProcess = files.slice(0, roomLeft);
    if (!filesToProcess.length) return;

    const built = await Promise.all(filesToProcess.map(buildAttachment));
    setQueuedAttachments((prev) => [...prev, ...built].slice(0, MAX_ATTACHMENTS));
  };

  async function streamBotMessage(messageId: string, fullText: string) {
    if (!fullText) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === messageId && msg.sender === "bot"
            ? { ...msg, aiComment: "No response content received.", streaming: false }
            : msg
        )
      );
      return;
    }

    for (let i = STREAM_CHUNK_SIZE; i <= fullText.length + STREAM_CHUNK_SIZE; i += STREAM_CHUNK_SIZE) {
      const chunk = fullText.slice(0, i);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === messageId && msg.sender === "bot"
            ? { ...msg, aiComment: chunk, streaming: i < fullText.length }
            : msg
        )
      );
      await sleep(STREAM_DELAY_MS);
    }
  }

  const handleSend = async () => {
    const textToSend = input.trim();
    if (!textToSend && queuedAttachments.length === 0) return;

    const shouldMarkPresetSent = presetPendingMarkRef.current;
    const outgoingText = textToSend || "Please analyze the attached files.";

    const userMsg: UserMessage = {
      id: toId(),
      sender: "user",
      text: outgoingText,
      attachments: queuedAttachments,
      createdAt: new Date().toISOString(),
    };

    const pendingBotId = toId();

    setMessages((m) => [
      ...m,
      userMsg,
      {
        id: pendingBotId,
        sender: "bot",
        aiComment: "",
        answer: "",
        createdAt: new Date().toISOString(),
        streaming: true,
      },
    ]);

    setLoading(true);
    setInput("");
    setQueuedAttachments([]);

    try {
      const recentContext = buildRecentContext(messages);
      const prompt = composePrompt(outgoingText, userMsg.attachments ?? [], recentContext);
      const result = await OrchestratingAgentV2(prompt, siteId);

      const aiComment = String((result as any) ?? "");
      const acceptedResults = (result as any)?.acceptedResults ?? "";

      await streamBotMessage(pendingBotId, aiComment);

      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingBotId && msg.sender === "bot"
            ? {
                ...msg,
                aiComment,
                answer: acceptedResults,
                streaming: false,
              }
            : msg
        )
      );

      setShowDiaryUpdatedTour(true);

      if (shouldMarkPresetSent) {
        await markTourCompleted("steps_ai_widget_open");
        presetPendingMarkRef.current = false;
      }
    } catch {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingBotId && msg.sender === "bot"
            ? {
                ...msg,
                aiComment: "Something went wrong while contacting AI. Please try again.",
                answer: "",
                streaming: false,
              }
            : msg
        )
      );
    }

    setLoading(false);
    setTutorialLocked(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && canSend) {
      e.preventDefault();
      handleSend();
    }
  };

  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY(siteId));
    } catch {
      // ignore clear errors
    }
    setMessages([
      {
        id: toId(),
        sender: "bot",
        aiComment: "Hi! 👋 How can I help you today?",
        answer: "",
        createdAt: new Date().toISOString(),
      },
    ]);
    setQueuedAttachments([]);
  }

  function downloadAttachment(att: Attachment) {
    if (!att.downloadUrl) return;
    void downloadDataUrl(att.downloadUrl, att.name);
  }

  function renderAttachments(attachments?: Attachment[]) {
    if (!attachments?.length) return null;

    return (
      <div className="mt-3 grid gap-2">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950/50"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{att.name}</p>
                <p className="text-slate-500 dark:text-slate-400">{formatBytes(att.size)}</p>
              </div>
              {att.downloadUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  onClick={() => downloadAttachment(att)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Open
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderMessage(msg: Message) {
    if (msg.sender === "bot") {
      let isTable = false;
      let tableData: any = null;

      const rawAnswer = msg.answer;
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
          } catch {
            // ignore table parse issues
          }
        }
      }

      const aiTextRaw = String(msg.aiComment ?? "");
      const fileLinkMatch = aiTextRaw.match(
        /(https?:\/\/[^\s)]+\/api\/webhook\/filesDownload[^\s)]*)/i
      );
      const fileLink = fileLinkMatch ? fileLinkMatch[0] : null;
      const aiTextClean = fileLink ? aiTextRaw.replace(fileLink, "").trim() : aiTextRaw;

      const inlineDataUrls = extractDataUrls(aiTextRaw);

      return (
        <div className="space-y-2">
          {aiTextClean && (
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiTextClean}</ReactMarkdown>
            </div>
          )}

          {msg.streaming && (
            <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Streaming response…
            </div>
          )}

          {fileLink && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
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

          {inlineDataUrls.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-700">
              <p className="mb-2 font-medium">Generated attachments</p>
              <div className="flex flex-wrap gap-2">
                {inlineDataUrls.map((url, idx) => (
                  <Button
                    key={`${msg.id}-${idx}`}
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDataUrl(url, `ai-generated-${idx + 1}`)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    File {idx + 1}
                  </Button>
                ))}
              </div>
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

          {renderAttachments(msg.attachments)}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="text-sm text-white dark:text-white text-right leading-relaxed whitespace-pre-wrap">
          {msg.text}
        </div>
        {renderAttachments(msg.attachments)}
      </div>
    );
  }

  const chatContent = (
    <Card className="pt-0 w-full h-full rounded-2xl shadow-none border-0 bg-transparent flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 flex flex-col items-start gap-1 py-3 px-4 bg-blue-600 text-white dark:bg-blue-800 dark:text-white rounded-t-2xl">
        <div className="w-full flex items-center justify-between">
          <div>
            <span className="text-lg font-semibold">AI Assistant</span>
            <p className="text-[11px] text-blue-100/90 mt-0.5">Ask about diary, invoices, timesheets, analytics and uploaded files.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Ready
            </span>
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
      </CardHeader>

      <Separator className="shrink-0" />

      <ScrollArea className="flex-1 min-h-0 p-4" data-tour="AI-responed-received">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-4 py-3 max-w-[88%] ${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white dark:bg-blue-600 dark:text-white"
                    : "bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/70"
                }`}
              >
                <div className={`mb-2 flex items-center gap-2 text-[11px] ${msg.sender === "user" ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${msg.sender === "user" ? "bg-white/20" : "bg-blue-500 text-white"}`}>
                    {msg.sender === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  </span>
                  <span>{msg.sender === "user" ? "You" : "Assistant"}</span>
                  <span>•</span>
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {renderMessage(msg)}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-2xl px-4 py-2 max-w-[70%] animate-pulse">
                <Bot size={18} className="inline mr-2" /> Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <Separator className="shrink-0" />

      <CardFooter className="shrink-0 flex flex-col gap-2 bg-white dark:bg-gray-900 p-3">
        {queuedAttachments.length > 0 && (
          <div className="w-full flex flex-wrap gap-2">
            {queuedAttachments.map((file) => (
              <div
                key={file.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="max-w-[180px] truncate">{file.name}</span>
                <span className="text-slate-500">{formatBytes(file.size)}</span>
                <button
                  className="text-slate-500 hover:text-red-500"
                  onClick={() =>
                    setQueuedAttachments((prev) => prev.filter((item) => item.id !== file.id))
                  }
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="w-full flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.json,.md"
            onChange={handleFileSelect}
          />

          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Attach image or document"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Textarea
            ref={inputRef}
            placeholder="Type your message… (Shift+Enter for new line)"
            value={input}
            disabled={loading}
            readOnly={tutorialLocked}
            onChange={(e) => {
              if (tutorialLocked) return;
              setInput(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 min-h-[56px] max-h-48 bg-white dark:bg-gray-800 dark:text-gray-100"
            data-tour="AI-widget-open"
          />

          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
            title="Send"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal size={20} />}
          </Button>
        </div>
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
            data-tour="AI-widget"
          >
            <Bot size={28} />
          </button>,
          document.body
        )}

      {open &&
        !isMobile &&
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
              minWidth={380}
              minHeight={460}
              className="pointer-events-auto border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 flex flex-col"
            >
              {chatContent}
            </Rnd>
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

      {showDiaryUpdatedTour ? <div className="hidden" aria-hidden="true" /> : null}
    </>
  );
}
