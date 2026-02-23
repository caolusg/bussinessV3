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
