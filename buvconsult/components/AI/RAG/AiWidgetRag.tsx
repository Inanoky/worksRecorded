"use client";

import { useState, useRef } from "react";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, SendHorizonal, Minus, X, GripVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TableModal } from "@/components/AI/RAG/TableModal";
import ReactMarkdown from "react-markdown";
import { talkToAgent } from "@/components/AI/RAG/LanggraphAgentVersion/graph";
import { Rnd } from "react-rnd";

export default function AiWidgetRag({ siteId }) {
  const [messages, setMessages] = useState([
    { sender: "bot", aiComment: "Hi! 👋 How can I help you today?", answer: "" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [expandedData, setExpandedData] = useState(null);
  const [size, setSize] = useState({ width: 500, height: 600 });
  const [position, setPosition] = useState({
    x: typeof window !== "undefined" ? window.innerWidth - 520 : 100,
    y: typeof window !== "undefined" ? window.innerHeight - 650 : 100,
  });

  const inputRef = useRef();

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: "user", text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setLoading(true);
    setInput("");
    try {
      const result = await talkToAgent(input, siteId);
      const botMsg = {
        sender: "bot",
        aiComment: result ?? "",
        answer: result.acceptedResults ?? "",
      };
      setMessages((msgs) => [...msgs, botMsg]);
    } catch (e) {
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", aiComment: "Something went wrong.", answer: "" },
      ]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) handleSend();
  };

  function renderMessage(msg) {
    if (msg.sender === "bot" && msg.aiComment !== undefined) {
      let isTable = false;
      let tableData = null;
      if (msg.answer) {
        if (Array.isArray(msg.answer) && typeof msg.answer[0] === "object") {
          isTable = true;
          tableData = msg.answer;
        } else {
          try {
            const parsed = JSON.parse(msg.answer);
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
          <ReactMarkdown>{String(msg.aiComment)}</ReactMarkdown>
          <span>: </span>
          {isTable ? (
            <button
              className="text-blue-700 dark:text-blue-400 underline hover:text-blue-900 dark:hover:text-blue-300 ml-1"
              onClick={() => setExpandedData(tableData)}
            >
              View table
            </button>
          ) : (
            <span className="ml-1">{String(msg.answer)}</span>
          )}
        </span>
      );
    }

    return (
      <span>
        {msg.sender === "user" ? (
          <User size={18} className="inline mr-2" />
        ) : (
          <Bot size={18} className="inline mr-2" />
        )}
        {msg.text}
      </span>
    );
  }

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl transition"
          aria-label="Open AI Assistant Chat"
        >
          <Bot size={28} />
        </button>
      )}

      {/* Chat Widget */}
      {open && (
        <Rnd
          size={size}
          position={position}
          onDragStop={(_, d) => setPosition({ x: d.x, y: d.y })}
          onResizeStop={(_, __, ref, ___, pos) => {
            setSize({ width: ref.offsetWidth, height: ref.offsetHeight });
            setPosition(pos);
          }}
          minWidth={350}
          minHeight={400}
          bounds="window"
          className="fixed z-50 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 flex flex-col"
        >
          <Card className="pt-0 w-full h-full rounded-2xl shadow-none border-0 bg-transparent flex flex-col relative">
            {/* Drag handle */}
            <CardHeader className="flex items-center justify-between py-3 px-4 bg-blue-600 text-white dark:bg-blue-800 dark:text-white rounded-t-2xl cursor-move">
              <div className="flex items-center gap-2">
                <GripVertical size={18} className="opacity-60" /> {/* drag hint */}
                <span className="text-lg font-semibold">AI Assistant</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="text-white hover:text-gray-200 dark:hover:text-gray-300 transition"
                  aria-label="Minimize Chat"
                >
                  <Minus size={18} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-white hover:text-gray-200 dark:hover:text-gray-300 transition"
                  aria-label="Close Chat"
                >
                  <X size={20} />
                </button>
              </div>
            </CardHeader>

            <Separator />
            <ScrollArea className="flex-1 p-4">
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
              </div>
            </ScrollArea>
            <Separator />
            <CardFooter className="flex gap-2 bg-white dark:bg-gray-900">
              <Input
                ref={inputRef}
                placeholder="Type your message…"
                value={input}
                disabled={loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-white dark:bg-gray-800 dark:text-gray-100"
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

            {/* Resize grip in bottom-right */}
          </Card>
        </Rnd>
      )}

      {/* Modal for data table */}
      {expandedData && <TableModal data={expandedData} onClose={() => setExpandedData(null)} />}
    </>
  );
}
