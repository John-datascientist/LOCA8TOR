import { PersonFigure } from "@/components/figure";
import {
  CounterIcon,
  FridgeIcon,
  HeartIcon,
  TvIcon,
  WashingMachineIcon,
} from "@/components/appliance-icons";

export function HeroScene({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex items-end gap-1.5 text-surface sm:gap-3 xl:gap-2.5 2xl:gap-4 ${className}`}
      style={{
        maskImage: "linear-gradient(to right, transparent, black 12%)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 12%)",
      }}
    >
      <HeartIcon className="absolute -top-5 left-16 h-5 w-5 text-surface/40 sm:-top-8 sm:left-24 sm:h-8 sm:w-8" />
      <HeartIcon className="absolute -top-2 right-20 h-4 w-4 text-surface/30 sm:-top-4 sm:right-32 sm:h-6 sm:w-6" />

      <PersonFigure pose="relaxed" duration={4.4} className="h-16 w-auto shrink-0 sm:h-24 lg:h-32 xl:h-28 2xl:h-36" />
      <CounterIcon className="h-14 w-auto shrink-0 sm:h-20 lg:h-28 xl:h-24 2xl:h-32" />
      <FridgeIcon className="h-24 w-auto shrink-0 sm:h-32 lg:h-44 xl:h-40 2xl:h-52" />
      <WashingMachineIcon className="h-14 w-auto shrink-0 sm:h-20 lg:h-28 xl:h-24 2xl:h-32" />
      <PersonFigure pose="offering" duration={4.8} className="h-20 w-auto shrink-0 sm:h-28 lg:h-36 xl:h-32 2xl:h-44" />
      <TvIcon className="h-12 w-auto shrink-0 sm:h-16 lg:h-24 xl:h-20 2xl:h-28" />
      <PersonFigure pose="waving" delay={0.4} duration={4.2} className="h-16 w-auto shrink-0 sm:h-24 lg:h-32 xl:h-28 2xl:h-36" />
    </div>
  );
}
