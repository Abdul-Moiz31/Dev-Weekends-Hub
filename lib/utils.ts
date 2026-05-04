import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string) {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string) {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

/** Expects HTML time input shape (HH:mm or HH:mm:ss) or ISO time portion */
export function formatTimeDisplay(value: string) {
  try {
    const d = new Date(`1970-01-01T${value.includes('T') ? value.split('T')[1] : value}`);
    if (Number.isNaN(d.getTime())) return value;
    return format(d, 'h:mm a');
  } catch {
    return value;
  }
}

export function getInitials(name: string | null | undefined, email: string) {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email[0].toUpperCase();
}

export function truncateUrl(url: string, maxLength = 40) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > maxLength ? display.slice(0, maxLength) + '…' : display;
  } catch {
    return url.length > maxLength ? url.slice(0, maxLength) + '…' : url;
  }
}
