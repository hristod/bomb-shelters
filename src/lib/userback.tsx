"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface UserbackInstance {
  setData: (data: Record<string, string>) => void;
  open: (type: string, mode: string) => void;
}

declare global {
  interface Window {
    Userback?: UserbackInstance;
  }
}

const UserbackContext = createContext<UserbackInstance | null>(null);

export function UserbackProvider({ children }: { children: ReactNode }) {
  const [userback, setUserback] = useState<UserbackInstance | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_USERBACK_TOKEN?.trim();
    if (!token) return;

    // Script tag approach matching Userback's verification
    (window as any).Userback = (window as any).Userback || {};
    (window as any).Userback.access_token = token;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://static.userback.io/widget/v1.js";
    script.onload = () => {
      if (window.Userback) {
        setUserback(window.Userback);
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <UserbackContext.Provider value={userback}>
      {children}
    </UserbackContext.Provider>
  );
}

export function useUserback() {
  return useContext(UserbackContext);
}
