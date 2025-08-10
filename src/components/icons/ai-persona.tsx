import type { SVGProps } from "react";

export function AiPersonaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <defs>
        <linearGradient id="ai-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary))", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--secondary))", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d="M12 2a10 10 0 1 0 10 10" stroke="url(#ai-gradient)" />
      <path d="M12 12a7.5 7.5 0 1 1-7.5-7.5" stroke="url(#ai-gradient)" strokeOpacity="0.7" />
       <circle cx="12" cy="12" r="2.5" fill="url(#ai-gradient)" stroke="none" />
    </svg>
  );
}
