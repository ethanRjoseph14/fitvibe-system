import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * A short, easy-to-read-aloud temporary password for staff to hand a member
 * at the front desk (e.g. "FV-7K4P-QX2M"). Avoids ambiguous characters
 * (0/O, 1/I/l) since this gets read out loud to seniors, not typed by a
 * developer.
 */
const READABLE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function generateTempPassword(): string {
  const group = () =>
    Array.from({ length: 4 }, () => READABLE_CHARS[crypto.randomInt(READABLE_CHARS.length)]).join("");
  return `FV-${group()}-${group()}`;
}
