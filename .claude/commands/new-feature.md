# /new-feature

Scaffold a complete feature for CarmelMart: page + API routes + React Query hooks + Zustand (if needed) + components.

## Instructions

The user will name a feature (e.g., "product listing", "vendor orders", "cart checkout"). Create ALL necessary files for it.

---

## File Structure to Create

```
app/
  (pages)/[feature]/
    page.jsx                    ← Server or client page
    loading.jsx                 ← Loading UI (optional)

app/api/[feature]/
  route.js                      ← Main CRUD route
  [id]/route.js                 ← Single resource route (if needed)

components/shared/[feature]/
  [Feature]List.jsx             ← List/grid view
  [Feature]Card.jsx             ← Individual item card
  [Feature]Form.jsx             ← Create/edit form (if needed)

lib/queries/[feature].js        ← React Query query functions (fetchers)
```

---

## Page Template

```jsx
// app/(pages)/[feature]/page.jsx
"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import FeatureList from "@/components/shared/feature/FeatureList";

export default function FeaturePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Feature Title</h1>
          <p className="text-gray-600 mt-2">Subtitle</p>
        </motion.div>

        <Suspense fallback={<FeatureListSkeleton />}>
          <FeatureList />
        </Suspense>
      </div>
    </div>
  );
}

function FeatureListSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-64" />
      ))}
    </div>
  );
}
```

---

## React Query Hooks File

```js
// lib/queries/feature.js
// These are the fetcher functions used with React Query

export const featureQueries = {
  list: async ({ page = 1, limit = 20, ...filters } = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    const res = await fetch(`/api/feature?${params}`);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  },

  byId: async (id) => {
    const res = await fetch(`/api/feature/${id}`);
    if (!res.ok) throw new Error("Not found");
    return res.json();
  },

  create: async (data) => {
    const res = await fetch("/api/feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create");
    return res.json();
  },

  update: async ({ id, ...data }) => {
    const res = await fetch(`/api/feature/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update");
    return res.json();
  },

  delete: async (id) => {
    const res = await fetch(`/api/feature/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    return res.json();
  },
};
```

---

## Component with React Query

```jsx
// components/shared/feature/FeatureList.jsx
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { featureQueries } from "@/lib/queries/feature";
import FeatureCard from "./FeatureCard";

export default function FeatureList({ filters = {} }) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["feature", filters],
    queryFn: () => featureQueries.list(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const deleteMutation = useMutation({
    mutationFn: featureQueries.delete,
    onSuccess: () => {
      toast.success("Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["feature"] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (error) return <div className="text-red-500 text-center py-8">Failed to load. Try again.</div>;

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-64" />
        ))}
      </div>
    );
  }

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">No items found</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <FeatureCard item={item} onDelete={() => deleteMutation.mutate(item.id)} />
        </motion.div>
      ))}
    </div>
  );
}
```

---

## State Management Rules

| State Type | Tool |
|---|---|
| Server data (products, orders, vendors) | React Query (`useQuery`) |
| Mutations (create/update/delete) | React Query (`useMutation`) |
| Auth session & current user | Zustand `useAuthStore` |
| Cart items (local, optimistic) | Zustand (persisted) |
| UI-only state (modals, tabs, filters on screen) | `useState` |
| URL-driven state (page, category filter) | `useSearchParams` |

**Never store fetched API data in Zustand.** Zustand is for client-only state that doesn't need server sync.

---

## Nigerian E-Commerce Feature Patterns

When building features, incorporate these Nigerian-specific requirements:

### Products
- Show `₦{price.toLocaleString()}` always
- Include `sale_price` with strikethrough original
- Flash sale countdown timer (`<CountdownTimer endsAt={sale_ends_at} />`)
- "Out of stock" / low stock badge

### Orders
- Include Pay on Delivery (POD) option in checkout
- Delivery address must have `landmark` field (critical for Nigerian delivery)
- SMS confirmation via Termii on order placed/shipped/delivered
- Escrow: funds held until customer confirms delivery

### Addresses
- Always include: `street_address`, `landmark`, `area`, `city`, `lga`, `state`
- Use `nigeria-states-lga` package for state/LGA dropdowns
- Include `delivery_instructions` (e.g., "Call on arrival", "Green gate")

### Vendor Payouts
- Use Flutterwave Transfer API to bank accounts
- Hold funds T+7 days after delivery confirmation for new vendors
- Show wallet balance + pending balance separately

Now scaffold the feature: **$ARGUMENTS**
