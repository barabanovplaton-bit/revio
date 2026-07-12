import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Возвращает инициал из имени (или email, если имени нет). */
export function getInitial(name?: string | null, email?: string | null): string {
  if (name && name.trim().length > 0) {
    return name.trim()[0]!.toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email.trim()[0]!.toUpperCase();
  }
  return "U";
}
