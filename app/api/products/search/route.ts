import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ items: [] });
    }

    const safeQ = q.replace(/[%_]/g, "");
    const pattern = `%${safeQ}%`;

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, manufacturer, product_code, product_name, full_name, unit_price, color_family, color_name, tone, image_path"
      )
      .eq("is_active", true)
      .or(
        `product_code.ilike.${pattern},product_name.ilike.${pattern},full_name.ilike.${pattern}`
      )
      .limit(10);

    if (error) {
      return NextResponse.json(
        { error: error.message, items: [] },
        { status: 500 }
      );
    }

    const items =
      data?.map((item) => {
        const image_url = item.image_path
          ? supabase.storage.from("product-samples").getPublicUrl(item.image_path)
              .data.publicUrl
          : null;

        return {
          ...item,
          image_url,
        };
      }) ?? [];

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: "server error", items: [] },
      { status: 500 }
    );
  }
}