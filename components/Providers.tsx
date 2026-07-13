"use client";

import { AppProvider } from "@/lib/store";
import NowPlayingBar from "@/components/ui/NowPlayingBar";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
      <NowPlayingBar />
    </AppProvider>
  );
}
