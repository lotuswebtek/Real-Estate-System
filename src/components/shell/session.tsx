"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const SessionContext = createContext<{ email: string; role: string }>({
  email: "",
  role: "admin",
});

export function SessionProvider({
  email,
  role,
  children,
}: {
  email: string;
  role: string;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={{ email, role }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
