import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-full p-8">
      <Skeleton className="h-12 w-full max-w-3xl" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-[480px] w-full" />
    </div>
  );
}
