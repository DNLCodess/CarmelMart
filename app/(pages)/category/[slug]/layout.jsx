import { createAdminClient } from "@/lib/supabase/admin";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const admin = createAdminClient();
    const { data: category } = await admin
      .from("categories")
      .select("name, description, image")
      .eq("slug", slug)
      .single();

    if (!category) return { title: "Category | CarmelMart" };

    const description =
      category.description?.slice(0, 155) ??
      `Browse ${category.name} products on CarmelMart. Quality items from verified Nigerian vendors.`;

    return {
      title: `${category.name} — CarmelMart`,
      description,
      openGraph: {
        title: `${category.name} — CarmelMart`,
        description,
        images: category.image ? [{ url: category.image }] : [],
      },
    };
  } catch {
    return { title: "Category | CarmelMart" };
  }
}

export default function CategoryLayout({ children }) {
  return children;
}
