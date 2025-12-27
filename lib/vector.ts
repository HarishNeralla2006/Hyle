import { pipeline } from '@xenova/transformers';

// Singleton to hold the model pipeline
let embedder: any = null;

const getEmbedder = async () => {
    if (!embedder) {
        // Use a tiny, quantized model for speed (approx 20MB)
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedder;
};

// Generate embedding for a text string
export const generateEmbedding = async (text: string): Promise<number[]> => {
    const pipe = await getEmbedder();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
};

// Calculate Cosine Similarity between two vectors
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
};
