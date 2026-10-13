import { requireSupabase } from "./supabase.js";

export async function getPublished(table, columns = "*") {
  const client = requireSupabase();
  const { data, error } = await client.from(table).select(columns).eq("status", "published").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProducts(ids = null) {
  const client = requireSupabase();
  const extended = "id,title,slug,description,price,currency,cover_path,availability,status,created_at,listing_type,unit,minimum_quantity,color,fabric_composition,fabric_width_cm,pattern,size_options";
  const core = "id,title,slug,description,price,currency,cover_path,availability,status,created_at";
  const { data: marker, error: markerError } = await client.from("site_settings").select("value").eq("key", "catalog_schema").maybeSingle();
  if (markerError) throw markerError;
  const query = (columns) => {
    let request = client.from("products").select(columns).eq("status", "published").order("created_at", { ascending: false });
    if (ids) request = request.in("id", ids);
    return request;
  };
  const result = await query(marker?.value === "fabric-v1" ? extended : core);
  if (result.error) throw result.error;
  return (result.data ?? []).map(normalizeProduct);
}

export function normalizeProduct(product) {
  return { ...product, listing_type: product.listing_type ?? "fabric", unit: product.unit ?? "metre", minimum_quantity: product.minimum_quantity ?? 1 };
}

export async function getSettings() {
  const client = requireSupabase();
  const { data, error } = await client.from("site_settings").select("key,value");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map(({ key, value }) => [key, value]));
}

export async function mediaUrl(path, bucket = "public-media") {
  if (!path) return "";
  const { data, error } = await requireSupabase().storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
