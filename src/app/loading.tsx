import { RouteLoadingIndicator } from "@/components/ui/route-loading-indicator";

export default function Loading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <RouteLoadingIndicator />
    </main>
  );
}
