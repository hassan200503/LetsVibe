import { Monogram } from "@/components/icons";

export default function Loading() {
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status" aria-label="Loading">
      <Monogram size={44} className="motion-safe:animate-pulse opacity-80" />
    </div>
  );
}
