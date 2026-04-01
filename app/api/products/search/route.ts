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
        `
        id,
        manufacturer,
        product_code_1,
        product_code_2,
        product_name,
        full_name,
        consumer_price,
        installer_price,
        dealer_price,
        color_family,
        image_path
        `
      )
      .eq("is_active", true)
      .or(
        `product_code_1.ilike.${pattern},product_code_2.ilike.${pattern},product_name.ilike.${pattern},full_name.ilike.${pattern}`
      )
      .limit(10);

    if (error) {
      return NextResponse.json(
        { error: error.message, items: [] },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    const items =
      data?.map((item) => {
        const normalizedPath = item.image_path
          ? item.image_path.replace(/^\/+/, "").replace(/^product-samples\//, "")
          : null;

        const image_url = normalizedPath
          ? `${baseUrl}/storage/v1/object/public/product-samples/${normalizedPath}`
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