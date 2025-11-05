"use client";

import { useState, useEffect } from "react";
import Joyride from "react-joyride";

export default function TourRunner({steps}) {

  const [run, setRun] = useState(false);
  const runsteps = steps
  

  useEffect(() => {
    // Start automatically after render
    setRun(true);
  }, []);

  return (

    null
    // <Joyride
    //   steps={runsteps}
    //   run={run}
    //   continuous
    //   showSkipButton
    //   disableOverlayClose
    //   spotlightClicks={false}
    //   scrollToFirstStep
    //   locale={{
    //     last: "Ok"
    //   }}
 
    //   styles={{
    //     options:{
    //   primaryColor: "#2563eb",   // main button background
    //   textColor: "#111827",
    //   zIndex: 99999,
    // },
    //     overlay: { backgroundColor: "rgba(0,0,0,0.6)" },
    //   }}
    // />
  );
}
