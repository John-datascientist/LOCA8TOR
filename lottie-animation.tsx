"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function LottieAnimation({
  src,
  className = "",
  loop = true,
  autoplay = true,
}: {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}) {
  return (
    <DotLottieReact
      src={src}
      loop={loop}
      autoplay={autoplay}
      className={className}
    />
  );
}
