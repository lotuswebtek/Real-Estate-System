import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { Mark } from "@/components/brand/mark";
export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border bg-sidebar p-10 lg:flex">
        <div className="flex items-center gap-2">
          <Mark />
          <span className="text-[14px] font-medium tracking-tight">Lead Finder</span>
        </div>
        <div>
          <p className="max-w-md text-[24px] leading-snug font-medium tracking-tight">Every owner list, one search.</p>
          <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
            Sharjah communities, Dubai projects, and the files that show up next month.
          </p>
        </div>
        <p className="text-[12px] text-muted-foreground">Sign in to search the imported lead files.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Mark />
            <span className="text-[14px] font-medium">Lead Finder</span>
          </div>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
