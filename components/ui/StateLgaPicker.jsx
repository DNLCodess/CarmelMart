"use client";

/**
 * StateLgaPicker
 * Reusable Nigerian state + LGA dropdowns backed by naija-state-local-government.
 *
 * Props:
 *   stateValue   — current selected state string
 *   lgaValue     — current selected LGA string
 *   onStateChange(stateName) — called when state changes
 *   onLgaChange(lgaName)    — called when LGA changes
 *   stateError   — error message for state field
 *   lgaError     — error message for LGA field
 *   className    — wrapper className
 *   required     — whether both fields are required (default true)
 */

import { useMemo } from "react";
import NaijaStates from "naija-state-local-government";

const ALL_STATES = NaijaStates.all().map((s) => s.state).sort();

function getLgas(stateName) {
  if (!stateName) return [];
  try {
    return NaijaStates.lgas(stateName).lgas ?? [];
  } catch {
    return [];
  }
}

const selectCls =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/50 outline-none text-sm bg-white appearance-none";
const errorCls =
  "border-red-300 focus:border-red-500 focus:ring-red-500/40";

export default function StateLgaPicker({
  stateValue = "",
  lgaValue   = "",
  onStateChange,
  onLgaChange,
  stateError,
  lgaError,
  className  = "",
  required   = true,
}) {
  const lgas = useMemo(() => getLgas(stateValue), [stateValue]);

  const handleStateChange = (e) => {
    onStateChange?.(e.target.value);
    onLgaChange?.(""); // reset LGA when state changes
  };

  return (
    <div className={`grid sm:grid-cols-2 gap-4 ${className}`}>
      {/* State */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          State {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={stateValue}
          onChange={handleStateChange}
          className={`${selectCls} ${stateError ? errorCls : ""}`}
        >
          <option value="">Select state</option>
          {ALL_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {stateError && (
          <p className="text-xs text-red-500 mt-1">{stateError}</p>
        )}
      </div>

      {/* LGA */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          LGA {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={lgaValue}
          onChange={(e) => onLgaChange?.(e.target.value)}
          disabled={!stateValue}
          className={`${selectCls} ${lgaError ? errorCls : ""} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="">{stateValue ? "Select LGA" : "Select state first"}</option>
          {lgas.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        {lgaError && (
          <p className="text-xs text-red-500 mt-1">{lgaError}</p>
        )}
      </div>
    </div>
  );
}
