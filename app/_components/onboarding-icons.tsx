// Брендовые SVG иконки (минималистичные, белые)

type IconProps = { className?: string };

/* ===== Профессии ===== */

export function WebDevIcon({ className }: IconProps) {
  // </> — иконка кода со слэшем
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="13" y1="5" x2="11" y2="19" />
    </svg>
  );
}

export function WebDesignerIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

export function CardDesignerIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

export function InteriorDesignerIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
      <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
    </svg>
  );
}

export function ShortVideoEditorIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <polygon points="10,9 15,12 10,15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LongVideoEditorIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <polygon points="7,9 12,12 7,15" fill="currentColor" stroke="none" />
      <path d="m16 10 4-2v8l-4-2" />
    </svg>
  );
}

export function IllustratorIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

export function CopywriterIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function MarketerIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function OtherIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16v.01" />
    </svg>
  );
}

/* ===== Соцсети (брендовые) ===== */

export function YouTubeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
    </svg>
  );
}

export function TikTokIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.6 6.3a4.8 4.8 0 0 1-1.2-.1 4.6 4.6 0 0 1-3.4-3.6V2h-3.4v13.6a2.7 2.7 0 1 1-2.7-2.7c.3 0 .5 0 .8.1V9.6a6.1 6.1 0 1 0 5.3 6V8.7a8 8 0 0 0 4.6 1.5V6.3z" />
    </svg>
  );
}

export function VKIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.2 17.3c-5.4 0-8.9-3.7-9-9.8h2.7c.1 4.5 2.2 6.4 3.8 6.8V7.5h2.5v3.9c1.6-.2 3.3-2 3.9-3.9h2.5c-.4 2.3-2.2 4.1-3.5 4.8 1.3.6 3.3 2.2 4.1 4.9h-2.8c-.6-1.9-2.1-3.4-4.2-3.6v3.6h-.5z" />
    </svg>
  );
}

export function TelegramIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.9 4.3l-3.3 15.6c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.3-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.8 13 1 11.5c-1-.3-1.1-1 .2-1.5l19.3-7.4c.9-.3 1.6.2 1.4 1.7z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AIIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
    </svg>
  );
}

export function ChatGPTIcon({ className }: IconProps) {
  // OpenAI логотип — узнаваемый, чистый, минималистичный
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22.28 9.82a5.96 5.96 0 0 0-.51-4.91 6.04 6.04 0 0 0-6.5-2.9A6.06 6.06 0 0 0 4.98 4.18a5.96 5.96 0 0 0-3.99 2.9 6.04 6.04 0 0 0 .74 7.08 5.96 5.96 0 0 0 .51 4.91 6.04 6.04 0 0 0 6.5 2.9 5.96 5.96 0 0 0 4.49 2 6.04 6.04 0 0 0 5.79-4.18 5.96 5.96 0 0 0 3.99-2.9 6.04 6.04 0 0 0-.74-7.08zM13.26 20.5a4.46 4.46 0 0 1-2.87-1.04l.14-.08 4.78-2.76a.78.78 0 0 0 .39-.68v-6.75l2.02 1.17a.07.07 0 0 1 .04.06v5.58a4.5 4.5 0 0 1-4.5 4.5zM4.04 16.48a4.46 4.46 0 0 1-.53-3.01l.14.08 4.78 2.76a.78.78 0 0 0 .78 0l5.85-3.37v2.33a.07.07 0 0 1-.03.06L9.98 18.1a4.5 4.5 0 0 1-6.14-1.65l.2-.07zM2.85 8.16a4.47 4.47 0 0 1 2.35-1.97v5.68a.78.78 0 0 0 .39.68l5.84 3.36-2.02 1.17a.07.07 0 0 1-.07 0L4.55 14.32a4.5 4.5 0 0 1-1.65-6.15l-.05-.01zM18.31 11.04l-5.85-3.38 2.02-1.17a.07.07 0 0 1 .07 0l4.78 2.77a4.5 4.5 0 0 1-.68 8.13v-5.68a.78.78 0 0 0-.34-.67zm2.01-3.01l-.14-.09-4.77-2.78a.78.78 0 0 0-.79 0L9.28 8.53V6.2a.07.07 0 0 1 .03-.06l4.78-2.76a4.5 4.5 0 0 1 6.23 4.65zM7.96 13.33l-2.02-1.17a.07.07 0 0 1-.04-.06V6.52a4.5 4.5 0 0 1 7.38-3.46l-.14.08L8.36 5.9a.78.78 0 0 0-.4.68l-.01 6.75zm1.1-2.37L11.93 9.5l2.87 1.66v3.31l-2.87 1.66-2.88-1.66z" />
    </svg>
  );
}

export function SearchSourceIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function FriendIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
