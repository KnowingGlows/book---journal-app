import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ items: [] });

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8&fields=items(id,volumeInfo(title,authors,pageCount,imageLinks,description))`,
    { cache: "no-store" }
  );
  const data = await res.json();
  return NextResponse.json(data);
}
