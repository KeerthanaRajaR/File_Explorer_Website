import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { extractTagsFromFileName, extractContent, createEmbeddingInput } from '../lib/ai/tagging';
import { generateEmbedding } from '../lib/ai/embedding';
import { AiStorage } from '../lib/ai/storage';
import { v4 as uuidv4 } from 'uuid';
import { getBaseRoot, getRelativePath } from '../lib/server/pathUtils';

// This script is intended to be run via ts-node or similar in the project root
async function reindexAll() {
  const root = getBaseRoot();
  console.log(`Starting re-indexing from: ${root}`);

  async function scan(dir: string) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        await scan(fullPath);
      } else {
        const relativePath = getRelativePath(fullPath);
        const existing = await AiStorage.getByPath(relativePath);
        
        if (existing) {
          console.log(`Updating indexed file: ${relativePath}...`);
        } else {
          console.log(`Indexing new file: ${relativePath}...`);
        }

        console.log(`Indexing: ${relativePath}...`);
        try {
          const tags = extractTagsFromFileName(entry.name);
          const content = await extractContent(fullPath);
          const input = createEmbeddingInput(entry.name, tags, content);

          const embedding = await generateEmbedding(input);
          
          await AiStorage.save({
            id: existing ? existing.id : uuidv4(),
            path: relativePath,
            name: entry.name,
            tags: tags,
            content: content,
            embedding: embedding,
            createdAt: new Date(),
          });
          console.log(`Successfully indexed: ${relativePath}`);
        } catch (err: any) {
          console.error(`Failed to index ${relativePath}:`, err?.message || err);
        }
      }
    }
  }

  await scan(root);
  console.log('Re-indexing complete!');
}

// In a real Next.js environment, we'd need to mock or setup the environment variables
// This is a template for the user to run if they have ts-node installed
// Or we can call this from an API route.
reindexAll().catch(console.error);
