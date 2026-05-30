"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface BarcodeDisplayProps {
  value: string;
  /** Pixel width of each bar. Default 2. */
  barWidth?: number;
  /** Pixel height of the bars. Default 60. */
  height?: number;
  /** Font size of the text below. Default 12. */
  fontSize?: number;
  className?: string;
}

/**
 * Renders a Code-128 barcode via JsBarcode into an <svg> element.
 * Safe for SSR — library is loaded lazily via dynamic import.
 */
export function BarcodeDisplay({
  value,
  barWidth = 2,
  height = 60,
  fontSize = 12,
  className,
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    import("jsbarcode").then(({ default: JsBarcode }) => {
      if (!svgRef.current) return;
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: barWidth,
        height,
        displayValue: true,
        fontSize,
        margin: 8,
        textAlign: "center",
        background: "#ffffff",
        lineColor: "#000000",
      });
    });
  }, [value, barWidth, height, fontSize]);

  return <svg ref={svgRef} className={cn("max-w-full", className)} />;
}
