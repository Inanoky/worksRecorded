// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\joyride\TourRunner.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Joyride, { CallBackProps, STATUS } from "react-joyride";
import { hasCompletedTour, markTourCompleted } from "@/components/joyride/user-tour-action";

type Props = {
  steps: { target: string; content: string; disableBeacon?: boolean }[];
  /** e.g. "steps_dashboard", "steps_dashboard_sites_new" */
  stepName: string;
};

export default function TourRunner({ steps, stepName }: Props) {
  const [shouldRun, setShouldRun] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false); // gate render until we know

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

  const onCallback = useCallback(
    async (data: CallBackProps) => {
      const { status } = data;
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        // mark group as completed only after the run is done
        await markTourCompleted(stepName);
        setShouldRun(false);
      }
    },
    [stepName]
  );

  if (!checked) return null; // don't flash the tour before we know

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
      locale={{ last: "Ok" }}
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
