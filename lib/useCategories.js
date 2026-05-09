"use client";

import { useQuery } from "@tanstack/react-query";

export const CATEGORIES_QUERY_KEY = ["categories"];

async function fetchCategories() {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

/**
 * Shared categories hook — fetches once per session, never refetches unless
 * the ["categories"] query key is explicitly invalidated (e.g. after an admin
 * creates, edits, or deletes a category).
 *
 * Returns:
 *   categories   – all categories (parents + subcategories)
 *   parents      – top-level categories only (parent_id === null)
 *   subsByParent – { [parentId]: [sub, sub, ...] }
 *   isLoading    – true on the first fetch
 */
export function useCategories() {
  const { data, isLoading, error } = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchCategories,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const all = data?.categories ?? [];

  const parents = all.filter((c) => !c.parent_id);

  const subsByParent = all
    .filter((c) => c.parent_id)
    .reduce((acc, c) => {
      (acc[c.parent_id] ??= []).push(c);
      return acc;
    }, {});

  return { categories: all, parents, subsByParent, isLoading, error };
}
