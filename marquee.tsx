const items = [
  "Give Something Away",
  "Claim What You Need",
  "Sponsor a Delivery",
  "Track in Real Time",
];

export function Marquee() {
  const track = (
    <div className="marquee-track">
      {[0, 1].map((copy) => (
        <div key={copy} className="flex shrink-0 items-center">
          {items.map((item) => (
            <span
              key={`${copy}-${item}`}
              className="label-caps flex items-center gap-6 whitespace-nowrap px-6 text-xs font-semibold text-surface/80"
            >
              {item}
              <span className="text-surface/30">&#10022;</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-b border-border-strong bg-panel py-3">
      {track}
    </div>
  );
}
