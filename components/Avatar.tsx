export const AVATAR_COLORS = [
  { name: "Brass", value: "#B5883A" },
  { name: "Rust", value: "#B5482F" },
  { name: "Teal", value: "#2F6B63" },
  { name: "Ink", value: "#1C2531" },
  { name: "Plum", value: "#6B4C6B" },
  { name: "Slate", value: "#4A5568" },
];

function fallbackColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length].value;
}

export default function Avatar({
  name,
  color,
  size = 32,
}: {
  name?: string | null;
  color?: string | null;
  size?: number;
}) {
  const initial = (name?.trim()?.[0] || "?").toUpperCase();
  const bg = color || fallbackColor(name || "?");

  return (
    <div
      className="rounded-full flex items-center justify-center text-paper font-medium shrink-0"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
