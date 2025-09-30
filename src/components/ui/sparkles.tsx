"use client";

import React from "react";

interface SparklesCoreProps {
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  particleColor?: string;
}

// Lightweight fallback sparkle component so Compare can render without errors.
export function SparklesCore({ className, background }: SparklesCoreProps) {
  return (
    <div
      className={className}
      style={{
        background: background ?? "transparent",
        pointerEvents: "none",
      }}
    />
  );
}
