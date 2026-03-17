export async function apiFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);

  if (res.ok) {
    return (await res.json()) as T;
  }

  let message = `请求失败: ${res.status}`;

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data: unknown = await res.json().catch(() => null);
    if (data && typeof data === "object" && "error" in data) {
      const err = (data as { error?: unknown }).error;
      if (typeof err === "string" && err.trim()) {
        message = err;
      }
    }
  } else {
    const text = await res.text().catch(() => "");
    if (text.trim()) {
      message = text;
    }
  }

  const error = new Error(message) as Error & { status?: number };
  error.status = res.status;
  throw error;
}
