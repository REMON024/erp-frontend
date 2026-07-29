import { Construction } from "lucide-react";

export function ComingSoon({ module }: { module: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Construction className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-content">{module}</h2>
        <p className="text-content-muted mt-1 text-sm">
          This module is being built. Coming in the next sprint1.
        </p>
      </div>
    </div>
  );
}
