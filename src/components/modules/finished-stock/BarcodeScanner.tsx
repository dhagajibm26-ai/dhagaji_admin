"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";

const SCANNER_DIV_ID = "dc-barcode-scanner-region";

interface BarcodeScannerProps {
  isOpen: boolean;
  onScan: (barcodeId: string) => void;
  onClose: () => void;
}

/**
 * Full-screen camera overlay for scanning Code-128 barcodes.
 * Uses html5-qrcode (loaded lazily) — works on mobile Chrome + Safari.
 *
 * Usage:
 *   <BarcodeScanner isOpen={open} onScan={(id) => handleBarcode(id)} onClose={() => setOpen(false)} />
 */
export function BarcodeScanner({ isOpen, onScan, onClose }: BarcodeScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const hasScanned = useRef(false);

  // Stable callback reference to avoid re-starting scanner on parent re-renders
  const handleScan = useCallback(
    (decodedText: string) => {
      if (hasScanned.current) return;
      hasScanned.current = true;
      onScan(decodedText);
    },
    [onScan]
  );

  useEffect(() => {
    if (!isOpen) return;

    hasScanned.current = false;
    setCameraError(null);

    let mounted = true;

    import("html5-qrcode")
      .then(({ Html5Qrcode }) => {
        if (!mounted) return;

        const qr = new Html5Qrcode(SCANNER_DIV_ID);
        scannerRef.current = qr;

        qr.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },

          },
          handleScan,
          () => {
            // Per-frame decode errors are expected — ignore
          }
        ).catch((err: unknown) => {
          if (!mounted) return;
          const msg =
            typeof err === "string"
              ? err
              : err instanceof Error
              ? err.message
              : "Camera access denied. Please allow camera permission and try again.";
          setCameraError(msg);
        });
      })
      .catch(() => {
        if (mounted) setCameraError("Scanner failed to load. Check your internet connection.");
      });

    return () => {
      mounted = false;
      const qr = scannerRef.current;
      if (qr) {
        qr.stop()
          .then(() => qr.clear())
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, [isOpen, handleScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <h2 className="text-white font-semibold text-base">Scan Barcode</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:text-gray-300 hover:bg-white/10"
          onClick={onClose}
        >
          ✕ Close
        </Button>
      </div>

      {/* Scanner region */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* html5-qrcode mounts the video element here */}
        <div id={SCANNER_DIV_ID} className="w-full max-w-md" />

        {/* Visual guide frame (sits on top of video) */}
        {!cameraError && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark overlay with cutout effect */}
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative">
              <div className="w-72 h-32 border-2 border-[#D32F2F] rounded-lg bg-transparent relative z-10">
                {/* Corner accents */}
                <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-4 border-l-4 border-[#D32F2F] rounded-tl-md" />
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-4 border-r-4 border-[#D32F2F] rounded-tr-md" />
                <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-4 border-l-4 border-[#D32F2F] rounded-bl-md" />
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-4 border-r-4 border-[#D32F2F] rounded-br-md" />
                {/* Scanning line animation */}
                <div className="absolute inset-x-0 h-0.5 bg-[#D32F2F]/80 animate-bounce top-1/2" />
              </div>
            </div>
          </div>
        )}

        {/* Camera error state */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 px-6">
            <Camera size={56} className="text-slate-300" />
            <p className="text-white text-center text-sm leading-relaxed">{cameraError}</p>
            <Button variant="primary" onClick={onClose}>
              Close Scanner
            </Button>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!cameraError && (
        <div className="bg-black/80 px-4 py-3 text-center">
          <p className="text-gray-400 text-xs">
            Align the Code-128 barcode within the red frame
          </p>
        </div>
      )}
    </div>
  );
}
