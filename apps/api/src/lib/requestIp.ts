import type { Request } from 'express';

const firstHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

export const normalizeIpAddress = (value: string | undefined | null) => {
  if (!value) return null;
  const first = value.split(',')[0]?.trim();
  if (!first) return null;
  if (first.startsWith('::ffff:')) return first.slice('::ffff:'.length);
  if (first === '::1') return '127.0.0.1';
  return first;
};

export const getClientIp = (req: Request) =>
  normalizeIpAddress(
    firstHeaderValue(req.headers['x-forwarded-for']) ||
    firstHeaderValue(req.headers['x-real-ip']) ||
    req.ip ||
    req.socket.remoteAddress
  );
