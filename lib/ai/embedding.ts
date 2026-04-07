import { pipeline } from '@xenova/transformers';

let extractor: any = null;

/**
 * Initializes the embedding pipeline if not already loaded.
 */
async function getExtractor() {
  if (!extractor) {
    // Using a small, efficient model suitable for local browser/node environments
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

/**
 * Generates an embedding for a given text using a local transformer model.
 * 
 * @param text - The text to embed
 * @returns A numeric vector representing the text's semantic meaning
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text.trim()) {
    throw new Error('Text cannot be empty for embedding generation');
  }

  try {
    const extract = await getExtractor();
    const output = await extract(text, { pooling: 'mean', normalize: true });
    
    // Convert Float32Array to standard number array
    return Array.from(output.data);
  } catch (error: any) {
    console.error('Local Embedding Error:', error?.message || error);
    throw new Error(`Failed to generate local embedding: ${error.message}`);
  }
}
