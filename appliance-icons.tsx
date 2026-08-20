const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CounterIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 260" className={className} {...stroke} aria-hidden="true">
      <rect x="18" y="150" width="184" height="94" rx="2" />
      <line x1="10" y1="150" x2="210" y2="150" strokeWidth={5} />
      <rect x="42" y="98" width="26" height="52" rx="3" strokeWidth={3} />
      <circle cx="55" cy="90" r="8" strokeWidth={3} />
      <rect x="96" y="112" width="22" height="38" rx="10" strokeWidth={3} />
      <line x1="107" y1="90" x2="107" y2="112" strokeWidth={3} />
      <g strokeWidth={3}>
        <rect x="146" y="70" width="46" height="26" rx="3" />
        <path d="M154,78 L184,78 M154,86 L172,86" />
      </g>
      <path
        d="M158,44 c0,-8 12,-8 12,0 c0,-8 12,-8 12,0 c0,10 -12,16 -12,20 c0,-4 -12,-10 -12,-20 Z"
        strokeWidth={3}
      />
    </svg>
  );
}

export function FridgeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 320" className={className} {...stroke} aria-hidden="true">
      <rect x="15" y="15" width="120" height="290" rx="6" />
      <line x1="15" y1="110" x2="135" y2="110" />
      <line x1="30" y1="40" x2="30" y2="90" strokeWidth={5} />
      <line x1="30" y1="140" x2="30" y2="220" strokeWidth={5} />
    </svg>
  );
}

export function WashingMachineIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 210" className={className} {...stroke} aria-hidden="true">
      <rect x="15" y="15" width="150" height="180" rx="8" />
      <circle cx="90" cy="120" r="58" />
      <circle cx="90" cy="120" r="40" strokeWidth={3} />
      <circle cx="34" cy="38" r="6" strokeWidth={3} />
      <circle cx="54" cy="38" r="6" strokeWidth={3} />
    </svg>
  );
}

export function TvIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 210 230" className={className} {...stroke} aria-hidden="true">
      <rect x="15" y="15" width="180" height="120" rx="6" />
      <line x1="40" y1="55" x2="130" y2="55" strokeWidth={3} />
      <line x1="40" y1="75" x2="100" y2="75" strokeWidth={3} />
      <line x1="105" y1="135" x2="105" y2="175" />
      <line x1="60" y1="205" x2="150" y2="205" strokeWidth={5} />
    </svg>
  );
}

export function HeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 36" className={className} {...stroke} strokeWidth={3} aria-hidden="true">
      <path d="M20,32 C4,20 2,10 10,5 C15,2 20,6 20,12 C20,6 25,2 30,5 C38,10 36,20 20,32 Z" />
    </svg>
  );
}
