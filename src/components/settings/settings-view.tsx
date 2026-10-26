"use client";

import { useTheme } from "next-themes";
import { useDensity } from "@/components/providers";
import { useThemeChoice } from "@/components/theme-choice";
import { useSignOut } from "@/lib/auth/sign-out";
import { useSession } from "@/components/shell/session";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const;

export function SettingsView() {
  const { email, role } = useSession();
  const { setTheme } = useTheme();
  const theme = useThemeChoice();
  const { density, setDensity } = useDensity();
  const signOut = useSignOut();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <PageHeader title="Settings" description="Appearance works now. Connecting folders and Google Drive comes in the next phases." />

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-[16px] font-medium">Account</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">One admin from .env for now. Viewer accounts can be added later.</p>
          <dl className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-[12px] text-muted-foreground">Email</dt>
              <dd className="mt-1">{email}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">Role</dt>
              <dd className="mt-1 capitalize">{role}</dd>
            </div>
          </dl>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void signOut()}>
            Sign out
          </Button>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-[16px] font-medium">Appearance</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Theme follows your system until you choose otherwise.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={cn(
                  "h-8 rounded-lg border px-3 text-[13px] transition-colors duration-150",
                  theme === item.id ? "border-primary/40 bg-accent text-accent-foreground" : "border-border bg-background hover:bg-muted",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-5 text-[13px] font-medium">Table density</p>
          <div className="mt-2 flex gap-2">
            {(["compact", "comfortable"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDensity(item)}
                className={cn(
                  "h-8 rounded-lg border px-3 text-[13px] capitalize transition-colors duration-150",
                  density === item ? "border-primary/40 bg-accent text-accent-foreground" : "border-border bg-background hover:bg-muted",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-[16px] font-medium">Sources</h2>
          <div className="mt-4 grid gap-3">
            <article className="rounded-lg border border-border px-4 py-3">
              <h3 className="text-[14px] font-medium">Local folder</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                A path on this PC, including the G: drive from Google Drive for Desktop. Watching and rescan arrive in Phase 3.
              </p>
            </article>
            <article className="rounded-lg border border-border px-4 py-3">
              <h3 className="text-[14px] font-medium">Google Drive</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Paste a shared folder link and sync with your Google account. The connect button arrives in Phase 3. The README already has the Cloud setup steps.
              </p>
            </article>
            <article className="rounded-lg border border-border px-4 py-3">
              <h3 className="text-[14px] font-medium">Manual uploads</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">Drag in workbooks and folders. Import starts in Phase 2.</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
