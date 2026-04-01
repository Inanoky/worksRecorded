"use client";

import { useEffect } from "react";
import { DashboardLanguage, translateStaticUiText } from "@/lib/dashboard-i18n";

function walkAndTranslate(node: Node, language: DashboardLanguage) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (!text) return;

    const translated = translateStaticUiText(language, text);
    if (translated && translated !== text && node.textContent) {
      node.textContent = node.textContent.replace(text, translated);
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as Element;
  if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) return;

  for (const child of Array.from(element.childNodes)) {
    walkAndTranslate(child, language);
  }
}

export function DashboardAutoTranslator({ language }: { language: DashboardLanguage }) {
  useEffect(() => {
    if (language !== "lv") return;

    const root = document.querySelector("[data-dashboard-root='true']");
    if (!root) return;

    walkAndTranslate(root, language);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((added) => walkAndTranslate(added, language));
        if (mutation.type === "characterData" && mutation.target) {
          walkAndTranslate(mutation.target, language);
        }
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}
