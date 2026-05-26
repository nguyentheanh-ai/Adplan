import { NextRequest, NextResponse } from "next/server";

const MAX_HTML_BYTES = 512_000;

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 0;
}

function validatePreviewUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Chi ho tro link http/https.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "::1" || isPrivateIpv4(hostname)) {
    throw new Error("Khong ho tro link noi bo.");
  }
  return url;
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function metaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${escapedKey}["'][^>]+content\\s*=\\s*["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content\\s*=\\s*["']([^"']+)["'][^>]+(?:property|name)\\s*=\\s*["']${escapedKey}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return "";
}

function pageTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtml(match[1].replace(/\s+/g, " ")) : "";
}

function absolutizeUrl(value: string, baseUrl: URL) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  try {
    const rawUrl = request.nextUrl.searchParams.get("url") || "";
    if (!rawUrl) return NextResponse.json({ error: "Thieu URL." }, { status: 400 });
    const url = validatePreviewUrl(rawUrl);
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "facebookexternalhit/1.1 (+https://adplan.theanhmarketing.com)",
      },
    });
    if (!response.ok) return NextResponse.json({ error: "Khong doc duoc link." }, { status: 502 });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return NextResponse.json({ error: "Link khong phai HTML." }, { status: 415 });

    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const finalUrl = new URL(response.url || url.toString());
    const image = absolutizeUrl(metaContent(html, "og:image") || metaContent(html, "twitter:image"), finalUrl);
    const title = metaContent(html, "og:title") || metaContent(html, "twitter:title") || pageTitle(html);
    const description = metaContent(html, "og:description") || metaContent(html, "description");

    return NextResponse.json({
      data: {
        title,
        description,
        image,
        domain: finalUrl.hostname.replace(/^www\./, ""),
        url: finalUrl.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Khong lay duoc preview." }, { status: 400 });
  }
}
