import clsx, { ClassValue } from "clsx";
/** Join class names, skipping falsy values. */
export function cn(...parts: ClassValue[]): string {
  return clsx(parts);
}
