"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface LayoutTextFlipProps {
  text?: string;
  words?: string[];
  duration?: number;
}

const DEFAULT_WORDS = [
  "Landing Pages",
  "Component Blocks",
  "Page Sections",
  "3D Shaders",
];

export const LayoutTextFlip = ({
  text = "Build Amazing",
  words = DEFAULT_WORDS,
  duration = 3000,
}: LayoutTextFlipProps) => {
  const wordList = words.length ? words : DEFAULT_WORDS;
  const wordsRef = useRef(wordList);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    wordsRef.current = wordList;
    setCurrentIndex((prev) => (prev >= wordList.length ? 0 : prev));
  }, [wordList]);

  useEffect(() => {
    if (!wordsRef.current.length) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const list = wordsRef.current;
        if (!list.length) return 0;
        return (prevIndex + 1) % list.length;
      });
    }, duration);

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <>
      <motion.span
        layoutId="subtext"
        className="text-2xl font-bold tracking-tight drop-shadow-lg md:text-4xl"
      >
        {text}
      </motion.span>

      <motion.span
        layout
        className="relative w-fit overflow-hidden rounded-md border border-transparent bg-white px-4 py-2 font-sans text-2xl font-bold tracking-tight text-black shadow-sm ring shadow-black/10 ring-black/10 drop-shadow-lg md:text-4xl dark:bg-neutral-900 dark:text-white dark:shadow-sm dark:ring-1 dark:shadow-white/10 dark:ring-white/10"
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={currentIndex}
            initial={{ y: -40, filter: "blur(10px)" }}
            animate={{
              y: 0,
              filter: "blur(0px)",
            }}
            exit={{ y: 50, filter: "blur(10px)", opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={cn("inline-block whitespace-nowrap")}
          >
            {wordsRef.current[currentIndex] ?? ""}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
};
