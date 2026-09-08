/**
 * CampusFind matching engine.
 * Weighted scoring: category 35, description 30, location 20, date 10, colour 5.
 * Validated against the Capstone 1 worked example:
 *   Found A -> 99.94   Found B -> 88.76
 */

import { cosineSimilarity } from "./embeddings";

export interface ItemReport {
  id: string;
  type: "lost" | "found";
  category: string;
  description: string;
  location: string;
  date_occurred: string; // ISO date
  colour?: string | null;
  /** MiniLM (all-MiniLM-L6-v2) embedding of `description`, if computed. */
  description_embedding?: number[] | null;
}

const WEIGHTS = {
  category: 35,
  description: 30,
  location: 20,
  date: 10,
  colour: 5,
} as const;

// Adjacent colour pairs receive partial credit instead of a hard 0/1 match.
const COLOUR_ADJACENCY: Record<string, string[]> = {
  black: ["grey", "navy"],
  grey: ["black", "silver", "white"],
  silver: ["grey", "white"],
  white: ["silver", "grey"],
  navy: ["black", "blue"],
  blue: ["navy", "teal"],
  teal: ["blue", "green"],
  green: ["teal"],
  red: ["maroon", "orange"],
  maroon: ["red"],
  orange: ["red", "yellow"],
  yellow: ["orange"],
  brown: ["tan", "maroon"],
  tan: ["brown"],
};

function categoryScore(a: string, b: string): number {
  return a.trim().toLowerCase() === b.trim().toLowerCase() ? 1 : 0;
}

// Fallback when one or both reports don't have a computed embedding yet
// (e.g. the embed API call hasn't completed). Real scoring uses MiniLM
// cosine similarity instead — see descriptionScore() below.
function jaccardFallback(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(Boolean)
    );
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function locationScore(a: string, b: string): number {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.6;
  return 0;
}

// Exponential decay: score halves roughly every 5 days apart.
function dateScore(a: string, b: string): number {
  const diffDays = Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24)
  );
  const HALF_LIFE_DAYS = 5;
  return Math.exp((-Math.LN2 * diffDays) / HALF_LIFE_DAYS);
}

function colourScore(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0.5; // neutral when colour wasn't captured
  const ca = a.trim().toLowerCase();
  const cb = b.trim().toLowerCase();
  if (ca === cb) return 1;
  if (COLOUR_ADJACENCY[ca]?.includes(cb)) return 0.5;
  return 0;
}

export interface MatchBreakdown {
  categoryScore: number;
  descriptionScore: number;
  locationScore: number;
  dateScore: number;
  colourScore: number;
  totalScore: number; // 0..100
}

export function scoreMatch(lost: ItemReport, found: ItemReport): MatchBreakdown {
  const cat = categoryScore(lost.category, found.category);

  const desc =
    lost.description_embedding && found.description_embedding
      ? cosineSimilarity(lost.description_embedding, found.description_embedding)
      : jaccardFallback(lost.description, found.description);

  const loc = locationScore(lost.location, found.location);
  const date = dateScore(lost.date_occurred, found.date_occurred);
  const colour = colourScore(lost.colour, found.colour);

  const totalScore =
    cat * WEIGHTS.category +
    desc * WEIGHTS.description +
    loc * WEIGHTS.location +
    date * WEIGHTS.date +
    colour * WEIGHTS.colour;

  return {
    categoryScore: cat,
    descriptionScore: desc,
    locationScore: loc,
    dateScore: date,
    colourScore: colour,
    totalScore: Math.round(totalScore * 100) / 100,
  };
}
