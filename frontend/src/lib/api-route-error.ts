import { NextResponse } from "next/server";

export function apiRouteError(
  error: unknown,
  fallbackMessage: string = "Internal server error"
) {
  const message = error instanceof Error ? error.message : "";
  const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHORIZED" ? 401 : 500;
  const isDev = process.env.NODE_ENV !== "production";

  if (status === 401) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status });
  }
  if (status === 403) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status });
  }
  return NextResponse.json(
    {
      success: false,
      error: isDev && message ? `${fallbackMessage}: ${message}` : fallbackMessage,
    },
    { status }
  );
}
