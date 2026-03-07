"use client";

import { I18nProvider } from "@/lib/i18n";
import { UserbackProvider } from "@/lib/userback";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <UserbackProvider>{children}</UserbackProvider>
    </I18nProvider>
  );
}
