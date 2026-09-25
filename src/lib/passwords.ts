import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { UserError } from "./errors";
let active = 0;

// OWASP's scrypt N=2^15, r=8, p=3 profile: 32 MiB per derivation.
function derive(password: string, salt: string): Promise<Buffer> {
  if (active >= 2) return Promise.reject(new UserError("Sign-in is busy. Please try again in a moment."));
  active++;
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (err, key) => {
      active--;
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  const parts = encoded?.split("$");
  const valid =
    parts?.length === 3 &&
    parts[0] === "scrypt" &&
    /^[a-f0-9]{32}$/.test(parts[1]) &&
    /^[a-f0-9]{128}$/.test(parts[2]);
  // Derive even for a missing account, to avoid a cheap account-existence oracle.
  const candidate = await derive(password, valid ? parts[1] : "0".repeat(32));
  return !!valid && timingSafeEqual(candidate, Buffer.from(parts[2], "hex"));
}

export function validPassword(password: string): boolean {
  return password.length >= 15 && password.length <= 128;
}
