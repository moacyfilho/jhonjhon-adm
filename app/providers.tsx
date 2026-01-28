"use client";

import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <SessionProvider>
      {children}
      <Toaster />
    </SessionProvider>
  );
}
