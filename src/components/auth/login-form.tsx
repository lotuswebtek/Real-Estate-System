"use client";

import type * as React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeNextPath } from "@/lib/auth/paths";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          next: safeNextPath(new URLSearchParams(window.location.search).get("next")),
        }),
      });
      const body = (await response.json()) as { error?: string; next?: string };
      if (!response.ok) {
        setError(body.error ?? "Sign-in failed. Check the email and password in .env.");
        setPending(false);
        return;
      }
      window.location.href = safeNextPath(body.next ?? "/");
    } catch {
      setError("The app could not reach its own sign-in route. Make sure npm run dev is still running.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="w-full max-w-sm">
      <h1 className="text-[24px] font-medium tracking-tight">Sign in</h1>
      <p className="mt-2 text-[13px] text-muted-foreground">Use the admin email and password from your .env file.</p>
      <label className="mt-6 block text-[13px] font-medium" htmlFor="email">
        Email
      </label>
      <Input
        id="email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-1.5"
      />
      <label className="mt-4 block text-[13px] font-medium" htmlFor="password">
        Password
      </label>
      <Input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-1.5"
      />
      {error ? (
        <p className="mt-3 text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-6 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
