// Singleton to hold the model pipeline
let embedder: any = null;

const getEmbedder = async () => {
    // Safety check: specific to Next.js/Browser environment
    // If we are on the client, skip loading the heavy model entirely to prevent crashes.
    if (typeof window !== 'undefined') {
        throw new Error("Semantic embedding is server-side only.");
    }

    if (!embedder) {
        try {
            // Dynamic import to prevent build-time/load-time errors on client
            const { pipeline } = await import('@xenova/transformers');

            // Use a tiny, quantized model for speed (approx 20MB)
            embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        } catch (e) {
            console.error("Failed to load transformers:", e);
            throw e;
        }
    }
    return embedder;
};

// Generate embedding for a text string
export const generateEmbedding = async (text: string): Promise<number[]> => {
    try {
        const pipe = await getEmbedder();
        const output = await pipe(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    } catch (e) {
        console.warn("Embedding generation failed (skipping):", e);
        return []; // Return empty vector allows flow to continue without semantic check
    }
};

// Calculate Cosine Similarity between two vectors
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
};
