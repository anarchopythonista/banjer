export function createDocumentId(): string {
  const browserCrypto = globalThis.crypto;

  if (typeof browserCrypto?.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  const timestamp = Date.now().toString(36);
  const randomPart = getRandomHex(16);
  return `tab-${timestamp}-${randomPart}`;
}

function getRandomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);

  const browserCrypto = globalThis.crypto;

  if (typeof browserCrypto?.getRandomValues === "function") {
    browserCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
