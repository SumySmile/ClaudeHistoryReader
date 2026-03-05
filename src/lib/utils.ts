import { formatDistanceToNow, format } from 'date-fns';

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm');
  } catch {
    return dateStr;
  }
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function truncate(str: string | null, len: number): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function projectDisplayName(slug: string): string {
  return slug.replace(/--/g, '/').replace(/-/g, ' ');
}
