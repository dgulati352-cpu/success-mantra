"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface KatexRendererProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const KatexRenderer: React.FC<KatexRendererProps> = ({ math, block = false, className = "" }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
    } catch (error) {
      console.error("KaTeX error:", error);
      return `<span class="text-red-500">[Math Error: ${math}]</span>`;
    }
  }, [math, block]);

  return (
    <span
      className={`inline-block ${block ? "my-2 text-center w-full overflow-x-auto" : ""} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
