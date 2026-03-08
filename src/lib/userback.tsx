"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import UserbackModule from "@userback/widget";
import type { UserbackWidget } from "@userback/widget";

const UserbackContext = createContext<UserbackWidget | null>(null);

export function UserbackProvider({ children }: { children: ReactNode }) {
  const [userback, setUserback] = useState<UserbackWidget | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_USERBACK_TOKEN;
    if (!token) return;
    UserbackModule(token).then(setUserback).catch(() => {});
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
