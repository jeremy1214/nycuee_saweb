import type { ReactNode } from "react";

export function ExternalLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}<span className="external-arrow" aria-hidden="true">↗</span>
    </a>
  );
}
