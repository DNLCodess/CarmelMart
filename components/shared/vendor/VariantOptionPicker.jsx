"use client";

import { Plus } from "lucide-react";

/**
 * Renders the selectable chips for a single variant dimension (Size, Colour…),
 * augmented with any values the vendor has saved as presets for that dimension.
 *
 * Props:
 *  - dim:            { key, label, options } from the category template
 *  - selectedValues: string[] currently selected for this dimension
 *  - onToggle:       (value) => void
 *  - presets:        full preset list; filtered here by dim.key
 *  - onApplyPreset:  (dimKey, values[]) => void  — merge preset values into selection
 */
export default function VariantOptionPicker({ dim, selectedValues = [], onToggle, presets = [], onApplyPreset }) {
  // Effective options = template options + any selected custom values not in the template
  const effectiveOptions = [
    ...dim.options,
    ...selectedValues.filter((v) => !dim.options.includes(v)),
  ];

  const dimPresets = presets.filter((p) => p.dimension === dim.key);

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {dim.label}
      </label>

      <div className="flex flex-wrap gap-2">
        {effectiveOptions.map((opt) => {
          const checked = selectedValues.includes(opt);
          return (
            <button
              type="button"
              key={opt}
              onClick={() => onToggle(opt)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                checked
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {dimPresets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">Your lists:</span>
          {dimPresets.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => onApplyPreset(dim.key, p.values ?? [])}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/30 rounded-full hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-3 h-3" /> {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
