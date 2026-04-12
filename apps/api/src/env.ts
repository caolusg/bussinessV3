const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

const bcryptRoundsRaw = process.env.BCRYPT_ROUNDS ?? '10';
const bcryptRounds = Number(bcryptRoundsRaw);
if (!Number.isFinite(bcryptRounds) || bcryptRounds < 4) {
  throw new Error('BCRYPT_ROUNDS must be a number >= 4');
}

export const JWT_SECRET = jwtSecret;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
export const BCRYPT_ROUNDS = bcryptRounds;
export const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://127.0.0.1:3000';
export const EMAIL_VERIFICATION_REQUIRED = process.env.EMAIL_VERIFICATION_REQUIRED !== 'false';
export const EMAIL_VERIFICATION_EXPIRES_HOURS = Number(
  process.env.EMAIL_VERIFICATION_EXPIRES_HOURS ?? '24'
);
export const PASSWORD_RESET_EXPIRES_MINUTES = Number(
  process.env.PASSWORD_RESET_EXPIRES_MINUTES ?? '60'
);
export const MAIL_MODE = process.env.MAIL_MODE ?? 'preview';
export const SMTP_HOST = process.env.SMTP_HOST ?? '';
export const SMTP_PORT = Number(process.env.SMTP_PORT ?? '587');
export const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
export const SMTP_USER = process.env.SMTP_USER ?? '';
export const SMTP_PASS = process.env.SMTP_PASS ?? '';
export const SMTP_FROM = process.env.SMTP_FROM ?? '';
