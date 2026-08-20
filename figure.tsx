export type Pose = "offering" | "waving" | "crossed" | "relaxed";

const commonProps = {
  viewBox: "0 0 260 460",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function Body() {
  return (
    <>
      <circle cx="130" cy="50" r="28" />
      <line x1="130" y1="78" x2="130" y2="230" />
      <line x1="100" y1="112" x2="160" y2="112" />
      <line x1="100" y1="230" x2="160" y2="230" />
      <path d="M108,230 L100,338 L92,410" />
      <path d="M152,230 L160,338 L168,410" />
      <line x1="92" y1="410" x2="74" y2="410" />
      <line x1="168" y1="410" x2="186" y2="410" />
    </>
  );
}

function Arms({ pose }: { pose: Pose }) {
  switch (pose) {
    case "offering":
      return (
        <>
          <path d="M100,112 L75,155 L68,208" />
          <g>
            <path d="M160,112 L196,148 L214,108" />
            <rect x="204" y="92" width="24" height="24" rx="2" strokeWidth={4} />
            <line x1="216" y1="92" x2="216" y2="116" strokeWidth={3} />
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 160 112; -16 160 112; 0 160 112"
              dur="3s"
              repeatCount="indefinite"
            />
          </g>
        </>
      );
    case "waving":
      return (
        <>
          <path d="M100,112 L72,155 L65,208" />
          <g>
            <path d="M160,112 L178,72 L198,40" />
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-6 160 112; 14 160 112; -6 160 112"
              dur="1.1s"
              repeatCount="indefinite"
            />
          </g>
        </>
      );
    case "crossed":
      return (
        <>
          <path d="M100,112 L150,190" />
          <path d="M160,112 L110,190" />
        </>
      );
    case "relaxed":
    default:
      return (
        <>
          <path d="M100,112 L85,158 L78,206" />
          <path d="M160,112 L175,158 L182,206" />
        </>
      );
  }
}

export function PersonFigure({
  pose,
  delay = 0,
  duration = 4.5,
  className = "",
}: {
  pose: Pose;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <svg
      {...commonProps}
      className={`hero-figure ${className}`}
      style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
    >
      <Body />
      <Arms pose={pose} />
    </svg>
  );
}
