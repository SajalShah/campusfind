import { pipeline, env, type FeatureExtractionPipeline } from "@xenova/transformers";

// Vercel's serverless functions have a read-only filesystem except for
// /tmp — without this, transformers.js tries to write its downloaded
// model cache to the project directory and fails in production (works
// fine locally, where the whole filesystem is writable).
env.cacheDir = "/tmp/.transformers-cache";
env.allowLocalModels = false;

// Same model as Capstone 1: sentence-transformers/all-MiniLM-L6-v2 (384-dim).
// This runs entirely locally via ONNX/WASM — no external API calls, no
// Python — but the model (~90MB) downloads on first use and is cached by
// the runtime afterward. First call after a cold start will be slow;
// subsequent calls are fast.
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_NAME) as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
}

/** Returns a normalized 384-dim embedding vector for the given text. */
export async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

/** Cosine similarity between two equal-length vectors, clamped to 0..1. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  // Embeddings are normalized so this is already ~[-1, 1]; clamp to [0, 1]
  // since a negative cosine (near-opposite meaning) should score as 0, not
  // penalize below the "no similarity" floor.
  return Math.max(0, Math.min(1, similarity));
}

/** Formats a JS number array as a Postgres pgvector literal, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
