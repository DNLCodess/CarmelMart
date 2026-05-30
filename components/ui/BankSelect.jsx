// @portal: vendor
// @surface: searchable bank combobox — vendor registration business details step

"use client";
import { useState, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import { NIGERIAN_BANKS } from "@/lib/nigerian-banks";

export default function BankSelect({ value, onChange, error }) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const inputRef          = useRef(null);

  const selectedBank = NIGERIAN_BANKS.find((b) => b.code === value) ?? null;
  const filtered     = query.trim()
    ? NIGERIAN_BANKS.filter((b) =>
        b.name.toLowerCase().includes(query.toLowerCase().trim())
      )
    : NIGERIAN_BANKS;

  const handleSelect = (bank) => {
    onChange(bank.code, bank.name);
    setQuery("");
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("", "");
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        Bank <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder="Search for your bank…"
          value={open ? query : (selectedBank?.name ?? "")}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); setQuery(""); }
          }}
          className={`w-full px-4 py-3 pr-16 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all bg-white ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/15"
              : "border-gray-200 focus:border-primary focus:ring-primary/15"
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {selectedBank && !open && (
            <button
              type="button"
              onMouseDown={handleClear}
              className="pointer-events-auto text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>

        {open && (
          <div
            role="listbox"
            className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">
                No banks found for &quot;{query}&quot;
              </p>
            ) : (
              filtered.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  role="option"
                  aria-selected={bank.code === value}
                  onMouseDown={() => handleSelect(bank)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    bank.code === value
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {bank.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
