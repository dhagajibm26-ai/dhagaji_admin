"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BarcodeDisplay } from "./BarcodeDisplay";
import type { IFinishedProduct } from "@/types";

interface PrintBarcodeProps {
  products: IFinishedProduct[];
  isOpen: boolean;
  onClose: () => void;
}

/** Single barcode label — used in preview and print area */
function BarcodeLabel({ product }: { product: IFinishedProduct }) {
  const mrpValue = product.MRP || product.sellingPrice;
  const mrpFormatted = mrpValue.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

  const hsnCode = product.hsnCodes && product.hsnCodes.length > 0
    ? product.hsnCodes.join(", ")
    : "N/A";

  return (
    <div
      className="barcode-label-container"
      style={{
        border: "1.5px solid #000000",
        borderRadius: "8px",
        padding: "14px",
        backgroundImage: "url('/step-and-repeat.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#000000",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        position: "relative",
      }}
    >
      {/* Centered Brand Logo */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
        <img
          className="brand-logo"
          src="/logo.png"
          alt="Dhagaji Creation"
          style={{ height: "56px", objectFit: "contain", filter: "brightness(0)" }}
        />
      </div>

      {/* Horizontal Divider 1 */}
      <div className="horizontal-divider" style={{ borderTop: "1px solid #000000", height: "0px", margin: "6px 0" }} />

      {/* Product Name */}
      <div className="product-name" style={{ fontSize: "12px", margin: "3px 0", textAlign: "left", lineHeight: "1.2" }}>
        <span style={{ fontWeight: 700 }}>Product Name: </span>
        <span style={{ fontWeight: 600 }}>{product.designName}</span>
      </div>

      {/* Horizontal Divider 2 */}
      <div className="horizontal-divider" style={{ borderTop: "1px solid #000000", height: "0px", margin: "6px 0" }} />

      {/* Detail Grid (2 Columns + Vertical Divider) */}
      <div
        className="detail-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: "6px 12px",
          fontSize: "10px",
          lineHeight: "1.4",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <div>
            <span style={{ fontWeight: 700 }}>Brand: </span>
            <span style={{ fontWeight: 400 }}>Dhagaji Creation</span>
          </div>
          <div>
            <span style={{ fontWeight: 700 }}>Code: </span>
            <span style={{ fontWeight: 400 }}>{product.designCode || "N/A"}</span>
          </div>
          <div>
            <span style={{ fontWeight: 700 }}>Stock: </span>
            <span style={{ fontWeight: 400 }}>{product.readyStock}</span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="vertical-divider" style={{ borderLeft: "1px solid #000000", width: "0px" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <div>
            <span style={{ fontWeight: 700 }}>Size: </span>
            <span style={{ fontWeight: 400 }}>{product.size}</span>
          </div>
          <div>
            <span style={{ fontWeight: 700 }}>MRP: </span>
            <span style={{ fontWeight: 400 }}>₹ {mrpFormatted}</span>
          </div>
          <div>
            <span style={{ fontWeight: 700 }}>HSN Code: </span>
            <span style={{ fontWeight: 400 }}>{hsnCode}</span>
          </div>
        </div>
      </div>

      {/* Horizontal Divider 3 */}
      <div className="horizontal-divider" style={{ borderTop: "1px solid #000000", height: "0px", margin: "6px 0" }} />

      {/* Manufactured by */}
      <div className="manufactured-by" style={{ fontSize: "10px", textAlign: "left", lineHeight: "1.4" }}>
        <span style={{ fontWeight: 700 }}>Manufactured by: </span>
        <span style={{ fontWeight: 400 }}>Dhagaji Creation, Himatnagar, Gujarat, India</span>
      </div>

      {/* Horizontal Divider 4 */}
      <div className="horizontal-divider" style={{ borderTop: "1px solid #000000", height: "0px", margin: "6px 0" }} />

      {/* Bottom Row: Customer Care & Vertical Divider & Barcode */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", gap: "8px" }}>
        <div
          className="bottom-row-text"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            fontSize: "8.5px",
            textAlign: "left",
            lineHeight: "1.4",
            flex: 1,
          }}
        >
          <div>
            <span style={{ fontWeight: 700 }}>Customer Care: </span>
            <span style={{ fontWeight: 400 }}>+91 94092 70532</span>
          </div>
          <div>
            <span style={{ fontWeight: 700 }}>Email: </span>
            <span style={{ fontWeight: 400 }}>dhagaji.officialindia@gmail.com</span>
          </div>
          <div>
            <span style={{ fontWeight: 700 }}>Instagram: </span>
            <span style={{ fontWeight: 400 }}>dhagaji_creation</span>
          </div>
          <div>
            <span style={{ fontWeight: 700 }}>Address: </span>
            <span style={{ fontWeight: 400 }}>1/Samprat 2/Ternamet, Motipura, Himatnagar, Sabarkantha, Gujarat-383001</span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="vertical-divider" style={{ borderLeft: "1px solid #000000", width: "0px", margin: "2px 0" }} />

        <div className="barcode-display-wrapper" style={{ display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0, paddingLeft: "4px" }}>
          <BarcodeDisplay
            value={product.barcodeId}
            barWidth={1.1}
            height={35}
            fontSize={8}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Print-barcode label component.
 *
 * Shows a preview grid of selected products.
 * Clicking "Print" uses window.print() with injected @media print CSS
 * that hides everything except the label area.
 */
export function PrintBarcode({ products, isOpen, onClose }: PrintBarcodeProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const printArea = printAreaRef.current;
    if (!printArea) return;

    // Create a temporary iframe to print the contents in isolation
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    // Write complete isolated HTML document to the iframe
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 4mm;
              background: #ffffff;
            }
            #dc-print-labels {
              display: grid !important;
              grid-template-columns: 1fr !important;
              gap: 8mm !important;
              width: 100% !important;
            }
            #dc-print-labels * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            /* Print-only scaled sizes to make labels large and visible on paper */
            .barcode-label-container {
              padding: 26px !important;
              border-width: 2px !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
            }
            .brand-logo {
              height: 80px !important;
            }
            .product-name {
              font-size: 20px !important;
              margin: 10px 0 !important;
            }
            .detail-grid {
              font-size: 16px !important;
              line-height: 1.6 !important;
              gap: 10px 24px !important;
            }
            .detail-grid div {
              gap: 6px !important;
            }
            .marketed-by, .manufactured-by {
              font-size: 16px !important;
              line-height: 1.6 !important;
            }
            .bottom-row-text {
              font-size: 14px !important;
              line-height: 1.6 !important;
              gap: 6px !important;
            }
            .horizontal-divider {
              margin: 14px 0 !important;
              border-top-width: 1.5px !important;
            }
            .vertical-divider {
              border-left-width: 1.5px !important;
            }
            .barcode-display-wrapper svg {
              width: 320px !important;
              height: auto !important;
            }
          </style>
        </head>
        <body>
          <div id="dc-print-labels">
            ${printArea.innerHTML}
          </div>
          <script>
            var images = document.querySelectorAll('img');
            var loadedCount = 0;
            function triggerPrint() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            }
            if (images.length === 0) {
              triggerPrint();
            } else {
              images.forEach(function(img) {
                if (img.complete) {
                  loadedCount++;
                  if (loadedCount === images.length) triggerPrint();
                } else {
                  img.addEventListener('load', function() {
                    loadedCount++;
                    if (loadedCount === images.length) triggerPrint();
                  });
                  img.addEventListener('error', function() {
                    loadedCount++;
                    if (loadedCount === images.length) triggerPrint();
                  });
                }
              });
            }
          </script>
        </body>
      </html>
    `);
    doc.close();

    // Remove the iframe after a short delay so browser print is triggered
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 5000);
  }

  if (!isOpen || products.length === 0) return null;

  return (
    <>
      {/* Print labels area — always in DOM while modal open */}
      <div
        id="dc-print-labels"
        ref={printAreaRef}
        style={{
          display: "none",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
          padding: 8,
        }}
      >
        {products.map((p) => (
          <BarcodeLabel key={p._id} product={p} />
        ))}
      </div>

      {/* Preview modal (hidden during print) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Panel */}
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Print Barcode Labels</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {products.length} label{products.length !== 1 ? "s" : ""} selected
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Preview grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-xs text-gray-400 mb-4 text-center">
              Preview — labels will print 2 per row
            </p>
            <div className="grid grid-cols-1 gap-3">
              {products.map((p) => (
                <BarcodeLabel key={p._id} product={p} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePrint}>
              <Printer size={14} /> Print Labels
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
