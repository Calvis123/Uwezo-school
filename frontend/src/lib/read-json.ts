export async function readJson<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json") || contentType.includes("+json");

  if (isJson) {
    return (await res.json()) as T;
  }

  const text = await res.text().catch(() => "");
  throw new Error(
    `Expected JSON but got ${contentType || "unknown"} (status ${res.status}). ${text.slice(0, 200)}`
  );
}

