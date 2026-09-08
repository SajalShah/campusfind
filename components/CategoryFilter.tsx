"use client";

import { useRouter } from "next/navigation";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "wallet", label: "Wallet" },
  { value: "bag", label: "Bag" },
  { value: "phone", label: "Phone" },
  { value: "laptop_tablet", label: "Laptop / Tablet" },
  { value: "keys", label: "Keys" },
  { value: "student_id_card", label: "Student ID card" },
  { value: "headphones", label: "Headphones" },
  { value: "charger", label: "Charger" },
  { value: "usb_drive", label: "USB drive" },
  { value: "book", label: "Book" },
  { value: "other", label: "Other" },
];

export default function CategoryFilter({
  tab,
  currentCategory,
}: {
  tab: string;
  currentCategory: string;
}) {
  const router = useRouter();

  return (
    <select
      value={currentCategory}
      onChange={(e) => {
        const params = new URLSearchParams({ type: tab });
        if (e.target.value) params.set("category", e.target.value);
        router.push(`/browse?${params.toString()}`);
      }}
      className="border border-line rounded-tag px-3 py-1.5 text-sm text-ink bg-white focus-ring"
    >
      {CATEGORIES.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
