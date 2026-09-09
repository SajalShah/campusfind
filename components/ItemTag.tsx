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
  reporterName?: string | null;
  claimedFrom?: string | null;
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
      <div className="relative w-28 sm:w-32 shrink-0 bg-line/20">
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
              sizes="128px"
            />
          </a>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-soft">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="M21 15l-5-5-9 9" />
            </svg>
            <span className="text-[10px]">No image</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-ink-soft tracking-wide">
            {isLost ? "LOST" : "FOUND"} · CF-{item.id.slice(0, 5).toUpperCase()}
          </p>
          {item.status && item.status !== "submitted" && (
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-tag bg-found-soft text-found capitalize shrink-0">
              {item.status.replace(/_/g, " ")}
            </span>
          )}
        </div>

        <h3 className="font-serif text-lg text-ink mt-1 leading-tight">
          {formatLabel(item.category)}
        </h3>

        <dl className="mt-2 space-y-1 text-sm">
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
              {new Date(item.date_occurred).toLocaleDateString("en-AU")}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft w-20 shrink-0">Colour</dt>
            <dd className="text-ink">{item.colour}</dd>
          </div>
        </dl>

        {item.reporterName && (
          <p className="text-xs text-ink-soft mt-2 border-t border-line pt-2">
            Reported by <span className="text-ink font-medium">{item.reporterName}</span>
          </p>
        )}
        {item.claimedFrom && (
          <p className="text-xs text-found mt-1">
            Claimed from <span className="font-medium">{item.claimedFrom}</span>
          </p>
        )}
      </div>
    </div>
  );
}
