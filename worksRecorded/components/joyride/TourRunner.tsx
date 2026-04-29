// C:\...\components\joyride\TourRunner.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Joyride, { CallBackProps, STATUS } from "react-joyride";
import { hasCompletedTour, markTourCompleted } from "@/components/joyride/user-tour-action";
import { getTourCopy, resolveTourLang } from "@/components/joyride/i18n";

type Props = {
  steps: { target: string; content: string; disableBeacon?: boolean }[];
  stepName: string;
  onFinished?: () => void;   // 👈 add this
};

export default function TourRunner({ steps, stepName, onFinished }: Props) {
  const [shouldRun, setShouldRun] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [lang, setLang] = useState("en");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const done = await hasCompletedTour(stepName);
      if (!cancelled) {
        setShouldRun(!done);
        setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stepName]);


  useEffect(() => {
    if (typeof document !== "undefined") {
      const documentLang = document.documentElement.lang;
      const browserLang = typeof navigator !== "undefined" ? navigator.language : undefined;
      setLang(resolveTourLang(documentLang || browserLang));
    }
  }, []);

  const joyrideLocale = useMemo(() => getTourCopy(lang).joyrideLocale, [lang]);
  const onCallback = useCallback(
    async (data: CallBackProps) => {
      const { status } = data;
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        await markTourCompleted(stepName);
        setShouldRun(false);
        onFinished?.();        // 👈 call optional redirect callback
      }
    },
    [stepName, onFinished]
  );

  if (!checked) return null;

  return (
    <Joyride
      steps={steps}
      run={shouldRun}
      continuous
      showSkipButton
      disableOverlayClose
      spotlightClicks={false}
      scrollToFirstStep
      callback={onCallback}
      locale={joyrideLocale}
      styles={{
        options: {
          primaryColor: "#2563eb",
          textColor: "#111827",
          zIndex: 99999,
        },
        overlay: { backgroundColor: "rgba(0,0,0,0.6)" },
      }}
    />
  );
}
