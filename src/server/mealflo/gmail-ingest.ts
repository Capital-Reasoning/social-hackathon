import { serverEnv } from "@/lib/config/server-env";
import { createGmailIntake } from "@/server/mealflo/backend";

const ADMIN_GMAIL_SYNC_INTERVAL_MS = 5_000;

let lastAdminGmailSyncAt = 0;
let adminGmailSyncInFlight: Promise<void> | null = null;

type GmailListResponse = {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
};

type GmailMessageResponse = {
  id: string;
  internalDate?: string;
  payload?: GmailPayloadPart;
  snippet?: string;
  threadId?: string;
};

type GmailPayloadPart = {
  body?: {
    data?: string;
  };
  headers?: Array<{
    name: string;
    value: string;
  }>;
  mimeType?: string;
  parts?: GmailPayloadPart[];
};

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));

  return Buffer.from(`${padded}${padding}`, "base64").toString("utf8");
}

function extractHeader(
  message: GmailMessageResponse,
  name: string
): string | undefined {
  return message.payload?.headers?.find(
    (header) => header.name.toLowerCase() === name.toLowerCase()
  )?.value;
}

function parseAddressList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseSender(value: string | undefined) {
  if (!value) {
    return {};
  }

  const emailMatch = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch?.[0];
  const name = value
    .replace(/<[^>]+>/g, "")
    .replace(/"/g, "")
    .trim();

  return {
    fromEmail: email,
    fromName: name && name !== email ? name : undefined,
  };
}

function extractTextPart(part: GmailPayloadPart | undefined): string {
  if (!part) {
    return "";
  }

  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  const childText = part.parts?.map(extractTextPart).find(Boolean);

  if (childText) {
    return childText;
  }

  if (part.body?.data) {
    return decodeBase64Url(part.body.data).replace(/<[^>]*>/g, " ");
  }

  return "";
}

async function getGmailAccessToken() {
  if (!serverEnv.hasGmail) {
    throw new Error(
      "Gmail ingestion is not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN."
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: serverEnv.gmailClientId as string,
      client_secret: serverEnv.gmailClientSecret as string,
      grant_type: "refresh_token",
      refresh_token: serverEnv.gmailRefreshToken as string,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Could not refresh Gmail access token: ${response.status}`);
  }

  const token = (await response.json()) as { access_token?: string };

  if (!token.access_token) {
    throw new Error("Gmail token response did not include an access token.");
  }

  return token.access_token;
}

async function gmailRequest<T>(path: string, accessToken: string) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Gmail API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function toGmailIntake(message: GmailMessageResponse) {
  const sender = parseSender(extractHeader(message, "From"));
  const deliveredTo = parseAddressList(extractHeader(message, "Delivered-To"));
  const to = parseAddressList(extractHeader(message, "To"));
  const subject = extractHeader(message, "Subject") ?? "Gmail intake";
  const internalTimestamp = message.internalDate
    ? Number.parseInt(message.internalDate, 10)
    : null;

  return {
    deliveredTo,
    fromEmail: sender.fromEmail,
    fromName: sender.fromName,
    id: message.id,
    rawBody: extractTextPart(message.payload) || message.snippet || subject,
    receivedAt:
      internalTimestamp && Number.isFinite(internalTimestamp)
        ? new Date(internalTimestamp)
        : undefined,
    subject,
    threadId: message.threadId,
    to,
  };
}

export async function ingestConfiguredGmailMessages() {
  const accessToken = await getGmailAccessToken();
  const list = await gmailRequest<GmailListResponse>(
    `/users/${encodeURIComponent(serverEnv.gmailUserId)}/messages?${new URLSearchParams(
      {
        maxResults: String(serverEnv.gmailIngestMaxResults),
        q: serverEnv.gmailIngestQuery,
      }
    ).toString()}`,
    accessToken
  );
  const messages = await Promise.all(
    (list.messages ?? []).map((message) =>
      gmailRequest<GmailMessageResponse>(
        `/users/${encodeURIComponent(serverEnv.gmailUserId)}/messages/${encodeURIComponent(
          message.id
        )}?format=full`,
        accessToken
      )
    )
  );
  const results = [];

  for (const message of messages) {
    results.push(await createGmailIntake(toGmailIntake(message)));
  }

  return {
    created: results.filter((result) => result.action === "created").length,
    duplicates: results.filter((result) => result.action === "duplicate")
      .length,
    ignored: results.filter((result) => result.action === "ignored").length,
    query: serverEnv.gmailIngestQuery,
    results,
    skipped: results.filter((result) => result.action === "skipped").length,
  };
}

export async function syncConfiguredGmailForAdminInbox({
  force = false,
}: {
  force?: boolean;
} = {}) {
  const now = Date.now();

  if (!force && now - lastAdminGmailSyncAt < ADMIN_GMAIL_SYNC_INTERVAL_MS) {
    return;
  }

  lastAdminGmailSyncAt = now;

  if (!adminGmailSyncInFlight) {
    adminGmailSyncInFlight = ingestConfiguredGmailMessages()
      .then(() => undefined)
      .catch((error) => {
        console.warn("Mealflo Gmail sync skipped.", error);
      })
      .finally(() => {
        adminGmailSyncInFlight = null;
      });
  }

  await adminGmailSyncInFlight;
}
