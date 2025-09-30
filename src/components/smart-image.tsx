"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState, type ElementType } from "react";
import { cn } from "@/lib/utils";

type WrapperOption = "div" | "span";

type SmartImageProps = ImageProps & {
  fallbackSrc?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  loaderClassName?: string;
  errorMessage?: string;
  wrapper?: WrapperOption;
  wrapperClassName?: string;
};

export function SmartImage({
  src,
  fallbackSrc = "/opengraph-image.png",
  maxRetries = 3,
  retryDelayMs = 1000,
  loaderClassName = "animate-pulse rounded-md bg-muted",
  errorMessage = "We couldn't load this image. Please try again later.",
  alt,
  width,
  height,
  wrapper = "div",
  wrapperClassName,
  ...props
}: SmartImageProps) {
  const isFillLayout = Boolean((props as ImageProps).fill);

  const [currentSrc, setCurrentSrc] = useState(src);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState<string | null>(null);

  const placeholderStyle = useMemo(() => {
    if (isFillLayout) return undefined;
    if (naturalRatio) return { aspectRatio: naturalRatio, width: "100%" };

    if (typeof width === "number" && typeof height === "number") {
      return { aspectRatio: `${width} / ${height}`, width: "100%" };
    }

    return { aspectRatio: "16 / 9", width: "100%" };
  }, [naturalRatio, width, height, isFillLayout]);

  const wrapperTag: WrapperOption = wrapper ?? "div";
  const WrapperComponent = wrapperTag as ElementType;
  const PlaceholderComponent = (wrapperTag === "span" ? "span" : "div") as ElementType;

  useEffect(() => {
    setCurrentSrc(src);
    setAttempt(0);
    setLoading(true);
    setFailed(false);
    setNaturalRatio(null);
  }, [src]);

  const scheduleRetry = (nextAttempt: number) => {
    setTimeout(() => {
      const withRetry =
        typeof src === "string"
          ? `${src}${src.includes("?") ? "&" : "?"}retry=${nextAttempt}`
          : src;
      setCurrentSrc(withRetry);
      setLoading(true);
    }, retryDelayMs);
  };

  const handleError = () => {
    const nextAttempt = attempt + 1;
    if (nextAttempt <= maxRetries) {
      setAttempt(nextAttempt);
      scheduleRetry(nextAttempt);
    } else {
      setLoading(false);
      setFailed(true);
    }
  };

  const handleLoad = (result?: { naturalWidth: number; naturalHeight: number }) => {
    if (result?.naturalWidth && result?.naturalHeight) {
      setNaturalRatio(`${result.naturalWidth} / ${result.naturalHeight}`);
    }
    setLoading(false);
  };

  if (failed && !fallbackSrc) {
    return (
      <WrapperComponent
        className={cn(
          "rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive",
          wrapperClassName
        )}
        style={placeholderStyle}
      >
        {errorMessage}
      </WrapperComponent>
    );
  }

  if (failed && fallbackSrc) {
    return (
      <WrapperComponent
        className={wrapperClassName}
        style={placeholderStyle}
      >
        <Image
          {...props}
          src={fallbackSrc}
          alt={alt ?? ""}
          width={width}
          height={height}
          unoptimized
          onError={handleError}
          onLoadingComplete={handleLoad}
          className={cn(props.className, loading ? "invisible" : "block")}
        />
      </WrapperComponent>
    );
  }

  return (
    <WrapperComponent
      className={cn("relative block", wrapperClassName)}
      style={placeholderStyle}
    >
      {loading && (
        <PlaceholderComponent
          className={loaderClassName}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      )}
      <Image
        {...props}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        unoptimized
        onError={handleError}
        onLoadingComplete={handleLoad}
        className={cn(props.className, loading ? "invisible" : "block")}
      />
    </WrapperComponent>
  );
}

