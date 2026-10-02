const BASE_PATH = "/kubiverse/api/shares";
const CLIENT_HEADERS = { "X-Kubiverse-Client": "portal" };

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_CHARS = 10_000;
export const MIN_PASSWORD_CHARS = 8;
export const MAX_PASSWORD_CHARS = 128;
export const MAX_PASSWORD_ATTEMPTS = 5;

export type ShareType = "TEXT" | "FILE";
export type ShareField = "content" | "text" | "file" | "expiresIn" | "maxDownloads" | "password";

export const EXPIRY_OPTIONS = [
  { value: "1h", label: "1 Stunde" },
  { value: "24h", label: "24 Stunden" },
  { value: "3d", label: "3 Tage" },
  { value: "7d", label: "7 Tage" },
] as const;
export const DEFAULT_EXPIRY = "24h";

export const MAX_DOWNLOAD_OPTIONS = [
  { value: "1", label: "1 Abruf (burn after read)" },
  { value: "2", label: "2 Abrufe" },
  { value: "3", label: "3 Abrufe" },
  { value: "5", label: "5 Abrufe" },
  { value: "10", label: "10 Abrufe" },
  { value: "25", label: "25 Abrufe" },
  { value: "50", label: "50 Abrufe" },
  { value: "100", label: "100 Abrufe" },
  { value: "unlimited", label: "Unbegrenzt (bis zum Ablauf)" },
] as const;
export const DEFAULT_MAX_DOWNLOADS = "1";

export interface CreatedShare {
  token: string;
  expiresAt: string;
  maxDownloads: number | null;
}

export interface ShareMetadata {
  type: ShareType;
  passwordRequired: boolean;
  expiresAt: string;
  remainingDownloads: number | null;
}

export type RetrievedShare =
  | { type: "TEXT"; text: string }
  | { type: "FILE"; blob: Blob; filename: string };

export interface CreateShareInput {
  text?: string;
  file?: File;
  expiresIn: string;
  maxDownloads: string;
  password?: string;
}

const FIELD_MESSAGES: Record<ShareField, string> = {
  content: "Bitte entweder einen Text oder eine Datei angeben.",
  text: `Der Text darf nicht leer sein und höchstens ${MAX_TEXT_CHARS.toLocaleString("de-DE")} Zeichen enthalten.`,
  file: "Die Datei darf nicht leer sein.",
  expiresIn: "Bitte eine gültige Ablaufzeit wählen (1 Stunde, 24 Stunden, 3 Tage oder 7 Tage).",
  maxDownloads: "Die Anzahl der Abrufe muss zwischen 1 und 100 liegen oder unbegrenzt sein.",
  password: `Das Passwort muss zwischen ${MIN_PASSWORD_CHARS} und ${MAX_PASSWORD_CHARS} Zeichen lang sein.`,
};

export class SecureShareError extends Error {
  /** HTTP status, or `null` if the backend could not be reached. */
  readonly status: number | null;
  readonly fields: ShareField[];

  constructor(status: number | null, message: string, fields: ShareField[] = []) {
    super(message);
    this.name = "SecureShareError";
    this.status = status;
    this.fields = fields;
  }
}

export function fieldMessage(field: ShareField): string {
  return FIELD_MESSAGES[field];
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} Sekunden`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "einer Minute" : `${minutes} Minuten`;
}

async function toError(response: Response): Promise<SecureShareError> {
  let details: string | undefined;
  try {
    const body = await response.json();
    details = typeof body?.details === "string" ? body.details : undefined;
  } catch {
    // Responses without JSON (e.g. from the reverse proxy) are mapped by status only.
  }

  switch (response.status) {
    case 400: {
      const fields = (Object.keys(FIELD_MESSAGES) as ShareField[]).filter((field) =>
        details?.includes(`${field}:`),
      );
      const message = fields.length
        ? fields.map((field) => FIELD_MESSAGES[field]).join(" ")
        : "Die Anfrage ist ungültig. Bitte prüfen Sie Ihre Eingaben.";
      return new SecureShareError(400, message, fields);
    }
    case 403:
      return new SecureShareError(403, "Das Passwort ist falsch oder fehlt.");
    case 404:
      return new SecureShareError(404, "Dieser Share existiert nicht oder ist nicht mehr verfügbar.");
    case 413:
      return new SecureShareError(413, "Die Datei ist zu groß. Die maximale Dateigröße beträgt 10 MB.", ["file"]);
    case 429: {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const wait = retryAfter > 0 ? `in ${formatWait(retryAfter)}` : "später";
      return new SecureShareError(429, `Zu viele Anfragen. Bitte versuchen Sie es ${wait} erneut.`);
    }
    case 503:
      return new SecureShareError(
        503,
        "Secure Share ist derzeit nicht verfügbar oder ausgelastet. Bitte versuchen Sie es später erneut.",
      );
    default:
      return new SecureShareError(
        response.status,
        "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut.",
      );
  }
}

async function request(path: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${BASE_PATH}${path}`, {
      ...init,
      headers: { ...CLIENT_HEADERS, ...init.headers },
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new SecureShareError(null, "Secure Share ist derzeit nicht erreichbar. Bitte versuchen Sie es erneut.");
  }
  if (!response.ok) {
    throw await toError(response);
  }
  return response;
}

function postJson(path: string, body: object): Promise<Response> {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function createShare(input: CreateShareInput): Promise<CreatedShare> {
  const form = new FormData();
  if (input.file) {
    form.append("file", input.file);
  } else {
    form.append("text", input.text ?? "");
  }
  form.append("expiresIn", input.expiresIn);
  form.append("maxDownloads", input.maxDownloads);
  if (input.password) {
    form.append("password", input.password);
  }
  const response = await request("", { method: "POST", body: form });
  return response.json();
}

export async function lookupShare(token: string): Promise<ShareMetadata> {
  const response = await postJson("/lookup", { token });
  return response.json();
}

export async function retrieveShare(token: string, password?: string): Promise<RetrievedShare> {
  const response = await postJson("/retrieve", password ? { token, password } : { token });
  if (response.headers.get("Content-Type")?.includes("application/json")) {
    const body = await response.json();
    return { type: "TEXT", text: body.text };
  }
  return {
    type: "FILE",
    blob: await response.blob(),
    filename: parseFilename(response.headers.get("Content-Disposition")),
  };
}

export function parseFilename(header: string | null): string {
  if (header) {
    const extended = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (extended) {
      try {
        return decodeURIComponent(extended[1]);
      } catch {
        // fall through to the ASCII fallback
      }
    }
    const plain = /filename="([^"]*)"/i.exec(header);
    if (plain?.[1]) return plain[1];
  }
  return "download";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function buildShareLink(token: string): string {
  return `${window.location.origin}/#/share/${token}`;
}

/** Returns `false` if the Clipboard API is unavailable (e.g. no secure context). */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard || !window.isSecureContext) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
