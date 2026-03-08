import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ items: [] });

  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8${apiKey ? `&key=${apiKey}` : ""}`;
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json({ items: [], error: `API returned ${res.status}` });
    }

    const data = await res.json();

    const items = (data.items || []).map(
      (item: { id: string; volumeInfo: Record<string, unknown> }) => ({
        id: item.id,
        volumeInfo: {
          title: item.volumeInfo?.title || "Unknown",
          authors: item.volumeInfo?.authors || [],
          pageCount: item.volumeInfo?.pageCount || null,
          imageLinks: item.volumeInfo?.imageLinks || null,
          description:
            typeof item.volumeInfo?.description === "string"
              ? (item.volumeInfo.description as string).slice(0, 300)
              : null,
        },
      })
    );

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({
      items: [],
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
