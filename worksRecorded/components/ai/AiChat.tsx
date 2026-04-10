"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { createPortal } from "react-dom";
import { Bot, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useChatKit, ChatKit } from "@openai/chatkit-react";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_ai_widget_open } from "@/components/joyride/JoyRideSteps";

type AiWidgetRagProps = {
  siteId?: string;
};

export default function AiWidgetRag({ siteId }: AiWidgetRagProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [chatkitKey, setChatkitKey] = useState(0);

  const { control } = useChatKit({
    api: {
      async getClientSecret() {
        const res = await fetch("/api/chatkit/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId }),
        });

        const data = await res.json();

        if (!res.ok || !data?.client_secret) {
          throw new Error(data?.error ?? "Failed to initialize ChatKit session");
        }

        return data.client_secret;
      },
    },
  });

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const resetConversation = () => {
    // Remount ChatKit so it requests a new client secret/session.
    setChatkitKey((k) => k + 1);
  };

  const chatContent = (
    <Card className="pt-0 w-full h-full rounded-2xl shadow-none border-0 bg-transparent flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 flex items-center justify-between py-3 px-4 bg-blue-600 text-white dark:bg-blue-800 rounded-t-2xl">
        <div>
          <span className="text-lg font-semibold">AI Assistant</span>
          <p className="text-[11px] text-blue-100/90 mt-0.5">OpenAI ChatKit</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetConversation}
            className="text-white hover:text-gray-200"
            title="New conversation"
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
      </CardHeader>

      <div className="flex-1 min-h-0 bg-white dark:bg-gray-950 rounded-b-2xl overflow-hidden">
        <ChatKit key={chatkitKey} control={control} className="h-full w-full" />
      </div>
    </Card>
  );

  return (
    <>
      <Script src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js" strategy="afterInteractive" />

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
          <div className="fixed bottom-6 right-6 z-50 w-[min(92vw,560px)] h-[min(82vh,700px)] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
            {chatContent}
          </div>,
          document.body
        )}

      {open &&
        isMobile &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-black/30 backdrop-blur-sm">
            <div className="mt-auto w-full max-h-[90vh] rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden">
              {chatContent}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
