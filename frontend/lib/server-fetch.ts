import { cookies } from "next/headers";

const API_BASE =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

function buildCookieHeader(): string {
  try {
    const cookieStore = cookies();
    const cookiePairs: string[] = [];
    cookieStore.getAll().forEach((cookie) => {
      cookiePairs.push(`${cookie.name}=${cookie.value}`);
    });
    return cookiePairs.join("; ");
  } catch {
    // If cookies() fails (e.g., outside request context), return empty
    return "";
  }
}

export async function fetchWithAuth<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const cookieHeader = buildCookieHeader();
  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    let message = `API error: ${response.status}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed.message) message = parsed.message;
      else if (parsed.error) message = parsed.error;
      else if (parsed.statusCode) message = `${message} — ${body}`;
    } catch {
      if (body) message = `${message} — ${body}`;
    }
    throw new Error(message);
  }

  return response.json();
}
