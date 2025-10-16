import type { NextRequest } from "next/server";
import { GET as baseGet, HEAD as baseHead } from "../notion/route";

export const runtime = "edge";
export const preferredRegion = ["iad1", "cdg1"];
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, context: unknown) {
  return baseGet(request, context);
}

export async function HEAD(request: NextRequest, context: unknown) {
  return baseHead(request, context);
}
