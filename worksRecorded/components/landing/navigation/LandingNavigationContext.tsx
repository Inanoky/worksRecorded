"use client";

import { createContext, useContext } from "react";

export const LandingNavigationContext = createContext<{
	navigate: (href: string) => Promise<void>;
	prefetch: (href: string) => void;
} | null>(null);

export function useLandingNavigation() {
	return useContext(LandingNavigationContext);
}
