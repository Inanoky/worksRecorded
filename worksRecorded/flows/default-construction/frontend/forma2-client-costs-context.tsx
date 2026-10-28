"use client";

import { createContext } from "react";
import type { Forma2ClientCosts } from "../lib/forma2-client-costs";

export const Forma2ClientCostsContext = createContext<Forma2ClientCosts | null>(
	null,
);
