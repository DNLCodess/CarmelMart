# /new-component

Scaffold a new React component for CarmelMart following the project's exact patterns.

## Instructions

The user will describe the component they want. Create it at the appropriate path under `components/`.

### Path Conventions

- Generic reusable primitives → `components/ui/ComponentName.jsx`
- Feature-specific sections → `components/shared/[feature]/ComponentName.jsx`
- Auth-related → `components/auth/ComponentName.jsx`
- Layout (navbar/footer) → `components/common/ComponentName.jsx`

### Component Template

```jsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { IconName } from "lucide-react";
import toast from "react-hot-toast";

export default function ComponentName({ prop1, prop2 }) {
  const [state, setState] = useState(null);

  return <div className="...">{/* JSX */}</div>;
}
```

### Rules to Follow

1. Always `"use client";` at the top for interactive components; omit for static/display-only
2. JSX files only — no TypeScript
3. Tailwind CSS v4 utility classes — no inline styles
4. Use `framer-motion` for animations; prefer `motion.div` with `initial/animate/whileInView`
5. Use `lucide-react` for all icons
6. Use `react-hot-toast` for user feedback (`toast.success`, `toast.error`, `toast.loading`)
7. All prices displayed as `₦{price.toLocaleString()}` — never raw numbers
8. Nigerian phone format validation: must start with `+234` or `0`, be 11 digits local
9. Use `@/` import alias for all project imports
10. For data fetching inside components, use **React Query** (`useQuery`, `useMutation`) — never fetch in `useEffect` or store server data in Zustand
11. For client-only UI state (modal open, tab selected, form step), use `useState`

### Data Fetching Pattern (React Query)

```jsx
import { useQuery, useMutation } from "@tanstack/react-query";

// Read data
const { data, isLoading, error } = useQuery({
  queryKey: ["resource", id],
  queryFn: () => fetch(`/api/resource/${id}`).then((r) => r.json()),
});

// Write/mutate data
const { mutate, isPending } = useMutation({
  mutationFn: (payload) =>
    fetch("/api/resource", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json()),
  onSuccess: () => {
    toast.success("Done!");
    queryClient.invalidateQueries({ queryKey: ["resource"] });
  },
  onError: (err) => toast.error(err.message),
});
```

### Zustand Usage

Use Zustand **only** for client-side global UI state:

- `useAuthStore` — current user session/auth status
- `useUserStore` — local user preferences, UI state

Do NOT store API response data in Zustand.

### Common UI Patterns

```jsx
// Loading skeleton
{isLoading && (
  <div className="animate-pulse bg-gray-100 rounded-2xl h-48" />
)}

// Empty state
{!isLoading && data?.length === 0 && (
  <div className="text-center py-12 text-gray-500">Nothing here yet</div>
)}

// Card container
<div className="bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 p-6">

// Primary button
<button className="bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-primary-dark transition-colors">

// Nigerian Naira price display
<span className="text-2xl font-bold text-gray-900">₦{price.toLocaleString()}</span>
```

Now create the component based on what the user described: **$ARGUMENTS**
