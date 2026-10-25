import { ExternalLink } from "../../../shared/components/index";
import type { ActivityLink } from "../activityTypes";
import "./activityLinks.css";

type LinkKind = "website" | "instagram" | "facebook" | "registration";

function describeLink(url: string): { kind: LinkKind; typeLabel: string; destination: string } {
  const { hostname, pathname } = new URL(url);
  const host = hostname.replace(/^www\./, "");
  const isHost = (domain: string) => host === domain || host.endsWith(`.${domain}`);

  if (isHost("instagram.com")) {
    const account = pathname.split("/").filter(Boolean)[0];
    const isProfile = account && !["p", "reel", "reels", "stories", "explore", "share", "direct"].includes(account);
    return { kind: "instagram", typeLabel: "Instagram", destination: isProfile ? `@${account}` : host };
  }
  if (isHost("facebook.com") || isHost("fb.com") || isHost("fb.me")) {
    return { kind: "facebook", typeLabel: "Facebook", destination: "粉專與最新消息" };
  }
  if (isHost("forms.gle") || (host === "docs.google.com" && pathname.startsWith("/forms/"))) {
    return { kind: "registration", typeLabel: "線上表單", destination: host };
  }
  return { kind: "website", typeLabel: "活動網站", destination: host };
}

function LinkIcon({ kind }: { kind: LinkKind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "instagram" ? <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </> : kind === "facebook" ? (
        <path d="M14.5 8H16V5.5h-2.2c-2.4 0-3.5 1.3-3.5 3.6V11H8v2.7h2.3V20h2.9v-6.3h2.4L16 11h-2.8V9.3c0-.8.2-1.3 1.3-1.3Z" fill="currentColor" stroke="none" />
      ) : kind === "registration" ? <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V2h6v2M9 10h6m-6 4h3m2 3 1.5 1.5L19 15" />
      </> : <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18M5 6.5h14M5 17.5h14" />
      </>}
    </svg>
  );
}

export function ActivityLinks({ links }: { links?: ActivityLink[] }) {
  if (!links?.length) return null;

  return (
    <nav className="activity-links" aria-label="活動相關連結">
      {links.map((link, index) => {
        const { kind, typeLabel, destination } = describeLink(link.url);
        return (
          <ExternalLink className={`activity-links-button activity-links-${kind}`} href={link.url} key={`${link.url}-${index}`}>
            <span className="activity-links-icon"><LinkIcon kind={kind} /></span>
            <span className="activity-links-copy">
              <span className="activity-links-type" aria-hidden="true">{typeLabel}</span>
              <span className="activity-links-title">{link.label}</span>
              <span className="activity-links-destination" aria-hidden="true">{destination}</span>
            </span>
            <span className="activity-links-sr-only">（另開分頁）</span>
          </ExternalLink>
        );
      })}
    </nav>
  );
}
