import { NextResponse } from "next/server";

const ALLOWED_ORIGIN = process.env.CORS_ALLOWED_ORIGIN ?? "*";

const DEFAULT_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function withCors(response: NextResponse) {
  Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function corsPreflight() {
  return withCors(new NextResponse(null, { status: 204 }));
}
