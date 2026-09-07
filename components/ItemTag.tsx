type Item = {
  id: string;
  type: "lost" | "found";
  category: string;
  description: string;
  location: string;
  date_occurred: string;
  colour?: string | null;
  status?: string;
};

export default function ItemTag({ item }: { item: Item }) {
  const isLost = item.type === "lost";
  return (
    <div className="ticket ml-4 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-soft tracking-wide">
          {isLost ? "LOST" : "FOUND"} · CF-{item.id.slice(0, 5).toUpperCase()}
        </p>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-tag ${
            isLost ? "bg-lost-soft text-lost" : "bg-found-soft text-found"
          }`}
        >
          {item.category}
        </span>
      </div>
      <div className="ticket-perforation my-3" />
      <p className="text-ink">{item.description}</p>
      <p className="text-sm text-ink-soft mt-2">
        {item.location} · {new Date(item.date_occurred).toLocaleDateString()}
        {item.colour ? ` · ${item.colour}` : ""}
      </p>
    </div>
  );
}
