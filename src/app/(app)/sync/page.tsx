import type { Metadata } from "next";
import { RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Sync" };

export default function SyncPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <PageHeader
          title="Sync"
          description="Google Drive and local folders will check for new and changed workbooks, then keep a history of each run."
        />
        <EmptyState
          icon={RefreshCw}
          title="Nothing is syncing yet"
          body="Phase 3 adds a local folder on this PC, including Google Drive for Desktop, and an online Drive connection with Sync now and a run history."
        />
      </div>
    </div>
  );
}
