import {
  DEFAULT_READ_LIMIT,
  MAX_READ_LIMIT,
  MAX_TOTAL_SIZE_BYTES,
  clampReadLimit,
  isAllowedAttachment
} from "../../src/shared.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export { DEFAULT_READ_LIMIT, MAX_READ_LIMIT, MAX_TOTAL_SIZE_BYTES, clampReadLimit };

export function validateDraft(message, files, strings = {}) {
  if (!message.trim() && files.length === 0) {
    return strings.emptyDraft || "至少填写文本或选择一个附件。";
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    return strings.exceedsSize || "附件总大小不能超过 50MB。";
  }

  for (const file of files) {
    if (!isAllowedAttachment(file)) {
      return strings.unsupportedType ? strings.unsupportedType(file.name) : `不支持的附件类型: ${file.name}`;
    }
  }

  return "";
}

export async function encryptPayload(payloadObject, masterKeyBytes, messageId) {
  const payloadKey = await deriveAesKey(masterKeyBytes, messageId, "payload", ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = textEncoder.encode(JSON.stringify(payloadObject));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    payloadKey,
    plaintext
  );

  return {
    iv: base64UrlEncode(iv),
    ciphertext: base64UrlEncode(new Uint8Array(ciphertext))
  };
}

export async function encryptAttachment(file, index, masterKeyBytes, messageId) {
  const attachmentKey = await deriveAesKey(masterKeyBytes, messageId, `file:${index}`, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    attachmentKey,
    plaintext
  );

  return {
    index,
    iv: base64UrlEncode(iv),
    encryptedBlob: new Blob([ciphertext], {
      type: "application/octet-stream"
    }),
    meta: {
      index,
      name: file.name,
      type: file.type || inferMimeType(file.name),
      size: file.size
    }
  };
}

export async function decryptToString(ciphertextBase64Url, ivBase64Url, key) {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64UrlDecode(ivBase64Url)
    },
    key,
    base64UrlDecode(ciphertextBase64Url)
  );

  return textDecoder.decode(decrypted);
}

export async function deriveAesKey(masterKeyBytes, messageId, purpose, usages) {
  const hkdfKey = await crypto.subtle.importKey("raw", masterKeyBytes, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: textEncoder.encode(messageId),
      info: textEncoder.encode(`privmsg:${purpose}:v1`)
    },
    hkdfKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    usages
  );
}

export function generateOpaqueId() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));
}

export function inferMimeType(filename) {
  const extension = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "txt":
      return "text/plain";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

export function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readMessageIdFromPath(pathname = window.location.pathname) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.at(-1) || "";
}

export async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function createPreviewDocument(innerHtml) {
  return `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8">
      <style>
        :root { color-scheme: light; }
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at top left, rgba(176, 72, 117, 0.20), transparent 18rem),
            linear-gradient(180deg, #0e0b12 0%, #151019 100%);
          color: #f3dbe7;
          font: 16px/1.6 "Avenir Next", "Helvetica Neue", sans-serif;
        }
        img, video, iframe {
          width: min(100%, 100vw);
          max-height: 100vh;
          border: 0;
          background: #0f0c13;
        }
        pre {
          margin: 0;
          width: 100%;
          min-height: 100vh;
          padding: 24px;
          white-space: pre-wrap;
          word-break: break-word;
          box-sizing: border-box;
          font: 14px/1.6 "SF Mono", Menlo, monospace;
        }
      </style>
    </head>
    <body>${innerHtml}</body>
  </html>`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function base64UrlEncode(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function base64UrlDecode(value) {
  const padded = `${value}`.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
