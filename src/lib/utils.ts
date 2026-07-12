import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  // Simple class merger without tailwind-merge (install if needed)
  return inputs
    .flat()
    .filter(Boolean)
    .join(" ");
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function formatWeight(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams} g`;
}

export function generateInvoiceNumber(): string {
  const prefix = "DC";
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}${year}${random}`;
}

export function formatDateDMY(date: Date | string): string {
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
