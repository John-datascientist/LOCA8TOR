import { PersonFigure } from "@/components/figure";

export function PeopleGroup({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-end justify-center gap-4 sm:gap-8 ${className}`}>
      <PersonFigure pose="crossed" delay={0.2} duration={4.2} className="h-52 w-auto sm:h-64" />
      <PersonFigure pose="offering" delay={0} duration={4.8} className="h-64 w-auto sm:h-80" />
      <PersonFigure pose="relaxed" delay={0.6} duration={4} className="h-40 w-auto sm:h-52" />
      <PersonFigure pose="waving" delay={0.3} duration={4.6} className="h-60 w-auto sm:h-72" />
    </div>
  );
}
