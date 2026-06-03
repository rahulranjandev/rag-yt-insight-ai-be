import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

export async function hashPassword(password: string) {
  const salt = randomBytes(32);
  return argon2.hash(password, { salt });
}

export async function comparePassword(
  password: string,
  hashedPassword: string,
) {
  return await argon2.verify(hashedPassword, password);
}
