/**
 * Encryption utilities for storing sensitive credentials (cookies, API keys).
 *
 * Uses AES-256-GCM with a machine-specific key derived from Electron's safeStorage.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { safeStorage } from "electron";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT = "applykit-credential-salt-v1";

/**
 * Derive an encryption key from a password using scrypt.
 * Falls back to a static key if safeStorage is unavailable.
 */
function deriveKey(password: string): Buffer {
  return scryptSync(password, SALT, KEY_LENGTH);
}

/**
 * Get the machine-specific encryption key.
 */
function getMachineKey(): Buffer {
  // Use Electron's safeStorage to get a machine-specific secret
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString("applykit-master-key");
    return deriveKey(encrypted.toString("base64"));
  }

  // Fallback: use a deterministic key (less secure, but functional)
  return deriveKey("applykit-fallback-key-" + process.platform);
}

/**
 * Encrypt a string value.
 * Returns a base64-encoded string containing IV + tag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getMachineKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine: IV (12) + Tag (16) + Ciphertext
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypt a string value.
 * Expects a base64-encoded string containing IV + tag + ciphertext.
 */
export function decrypt(encryptedBase64: string): string {
  const key = getMachineKey();
  const combined = Buffer.from(encryptedBase64, "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Test if a string is an encrypted value (base64 with correct prefix length).
 */
export function isEncrypted(value: string): boolean {
  try {
    const decoded = Buffer.from(value, "base64");
    return decoded.length > IV_LENGTH + TAG_LENGTH;
  } catch {
    return false;
  }
}
