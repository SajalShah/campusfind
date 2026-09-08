import Image from "next/image";

type Item = {
  id: string;
  type: "lost" | "found";
  category: string;
  description: string;
  location: string;
  date_occurred: string;
  colour?: string | null;
  status?: string;
  image_path?: string | null;
};

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function ItemTag({ item }: { item: Item }) {
  const isLost = item.type === "lost";
  const imageUrl = item.image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/item-images/${item.image_path}`
    : null;

  return (
    <div className="ticket ml-4 flex overflow-hidden">
      {/* Fixed-size image well on the left — same footprint whether or not
          a photo exists, so cards line up consistently either way. */}
      <div className="relative w-28 sm:w-36 shrink-0 bg-line/20">
        {imageUrl ? (
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0"
            aria-label="View full-size photo"
          >
            <Image
              src={imageUrl}
              alt={item.description}
              fill
              className="object-cover hover:opacity-90 transition-opacity"
              sizes="144px"
            />
          </a>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-soft">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="M21 15l-5-5-9 9" />
            </svg>
            <span className="text-[10px]">No image</span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 min-w-0">
        <p className="text-xs text-ink-soft tracking-wide">
          {isLost ? "LOST" : "FOUND"} · CF-{item.id.slice(0, 5).toUpperCase()}
        </p>
        <div className="ticket-perforation my-3" />
        <h3 className="font-serif text-xl text-ink">{formatLabel(item.category)}</h3>

        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-soft w-20 shrink-0">Description</dt>
            <dd className="text-ink">{item.description}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft w-20 shrink-0">Location</dt>
            <dd className="text-ink">{item.location}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft w-20 shrink-0">Reported</dt>
            <dd className="text-ink">
              {new Date(item.date_occurred).toLocaleDateString()}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft w-20 shrink-0">Colour</dt>
            <dd className="text-ink">{item.colour}</dd>
          </div>
        </dl>

        {item.status && item.status !== "submitted" && (
          <span className="inline-block mt-3 text-xs font-medium px-2 py-0.5 rounded-tag bg-found-soft text-found capitalize">
            {item.status.replace(/_/g, " ")}
          </span>
        )}
      </div>
    </div>
  );
}
