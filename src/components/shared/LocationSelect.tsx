"use client";

/**
 * Shared State + City input pair backed by src/data/indiaLocations.ts.
 *
 * Replaces the pattern of every form hand-rolling its own state dropdown
 * (and duplicating the state name list — previously done independently in
 * register/page.tsx and admin/vendors/page.tsx) plus a free-text city
 * input with zero relationship to the selected state.
 *
 * City uses a <datalist> instead of a plain <select> so users can still
 * type a city/town we haven't curated in india-states-cities.json (the
 * dataset is a curated subset, not exhaustive) while still getting
 * autocomplete suggestions for the state they picked.
 */
import { useMemo } from "react";
import { STATE_NAMES, getCitiesForState } from "@/data/indiaLocations";

interface StateSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  name?: string;
  required?: boolean;
  placeholder?: string;
}

export function StateSelect({
  value,
  onChange,
  className,
  name = "state",
  required,
}: StateSelectProps) {
  return (
    <select
      name={name}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">Select state…</option>
      {STATE_NAMES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

interface CitySelectProps {
  value: string;
  onChange: (value: string) => void;
  state?: string;
  className?: string;
  name?: string;
  placeholder?: string;
}

export function CitySelect({
  value,
  onChange,
  state,
  className,
  name = "city",
  placeholder,
}: CitySelectProps) {
  const cities = useMemo(() => getCitiesForState(state), [state]);
  const listId = `city-list-${name}`;

  return (
    <>
      <input
        list={listId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || (state ? "Type or pick a city" : "Select a state first")}
        className={className}
        autoComplete="off"
      />
      <datalist id={listId}>
        {cities.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}
