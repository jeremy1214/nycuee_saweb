export function SocialIcon({ platform }: { platform: "instagram" | "facebook" | "youtube" }) {
  const icons = {
    instagram: (<svg className="footer-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg> ),
    facebook: (<svg className="footer-social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M14.5 8H16V5.5h-2.2c-2.4 0-3.5 1.3-3.5 3.6V11H8v2.7h2.3V20h2.9v-6.3h2.4L16 11h-2.8V9.3c0-.8.2-1.3 1.3-1.3Z" />
                </svg> ),
    youtube: (<svg className="footer-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="2.5" y="5" width="19" height="14" rx="4" />
                  <path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" />
                </svg> )
  };
  return icons[platform];
}
