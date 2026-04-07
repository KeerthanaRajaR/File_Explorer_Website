import { generateEmbedding } from '@/lib/ai/embedding';
import { AiStorage } from '@/lib/ai/storage';
import { cosineSimilarity } from '@/lib/ai/similarity';
import { FileMeta } from '@/types/ai';
import { getGroqChatCompletion } from '@/lib/ai/groq';

export class AiSearchService {
  private static greetings = ['hi', 'hello', 'hey', 'greetings', 'sup', 'good morning', 'good afternoon', 'good evening', 'hola'];

  /**
   * Detects if the query is a simple greeting.
   */
  static isGreeting(query: string): boolean {
    const clean = query.toLowerCase().replace(/[^\w\s]/g, '').trim();
    return this.greetings.includes(clean);
  }

  /**
   * Search for files by semantic meaning of the query.
   * 
   * @param query - Natural language search query
   * @returns Array of file metadata with similarity scores
   */
  private static cleanQuery(query: string): string {
    const actionWords = ['summarize', 'find', 'search', 'show', 'tell', 'about', 'file', 'me', 'the', 'a', 'an'];
    return query.toLowerCase()
      .split(/\s+/)
      .filter(word => !actionWords.includes(word.replace(/[^\w]/g, '')))
      .join(' ')
      .trim();
  }

  static async search(query: string) {
    const cleaned = this.cleanQuery(query) || query;
    // 1. Generate local embedding for query
    const queryEmbedding = await generateEmbedding(cleaned);

    // 2. Fetch all stored file metadata
    const allFiles = await AiStorage.getAll();

    if (allFiles.length === 0) {
      return [];
    }

    // 3. Rank by similarity
    const allResults = allFiles
      .map(file => {
        try {
          const semanticScore = cosineSimilarity(queryEmbedding, file.embedding);
          
          // Keyword Boost: If fileName or tags exactly match some words in the query
          const queryWords = query.toLowerCase().split(/\s+/);
          const nameMatch = queryWords.some(word => 
            file.name.toLowerCase().includes(word) || 
            file.tags.some(tag => tag.toLowerCase() === word)
          );
          
          const boost = nameMatch ? 0.15 : 0;
          
          return {
            path: file.path,
            name: file.name,
            score: semanticScore + boost,
            content: file.content || ''
          };
        } catch (e) {
          return { path: file.path, name: file.name, score: 0 };
        }
      })
      .filter(res => res.score > 0.20) // Slightly lower threshold combined with boost
      .sort((a, b) => b.score - a.score);

    if (allResults.length === 0) return [];

    // 4. Dynamic Filtering: If the top result is very strong, be more exclusive
    const topScore = allResults[0].score;
    let finalResults = allResults;

    if (topScore > 0.7) {
      // If we have a very strong match, only include results that are within 20% of the top score
      finalResults = allResults.filter(res => res.score > topScore * 0.8);
    } else if (topScore > 0.5) {
      // Medium strength top match, be a bit more lenient
      finalResults = allResults.filter(res => res.score > topScore * 0.6);
    }

    return finalResults.slice(0, 5);
  }

  /**
   * Generates a conversational summary of search results using Groq.
   */
  static async genterateSummary(query: string, results: any[]) {
    if (results.length === 0) {
      return `I couldn't find any documents matching your search for "${query}". Try different keywords or check if the files are uploaded.`;
    }

    const fileList = results.map(r => {
      const contentSnippet = r.content ? `\n   CONTENT PREVIEW: ${r.content.slice(0, 1000)}...` : '';
      return `- ${r.name} (${r.path}) [relevance: ${Math.round(r.score * 100)}%]${contentSnippet}`;
    }).join('\n');
    const prompt = `The user searched for: "${query}". 
I found these matching files:
${fileList}

Provide a brief, helpful summary of these results (1-2 sentences). 
CRITICAL: Only mention files that are highly relevant to the search query. If a file seems unrelated despite the similarity score, ignore it or mention it only as a possible but unlikely match.
If there is one clear "exact" match, focus primarily on that.
Be concise and professional.`;

    try {
      if (this.isGreeting(query)) {
        return "Hello! 👋 I'm your AI Assistant. I can help you find files using semantic search. How can I help you today?";
      }
      return await getGroqChatCompletion(prompt, "You are a helpful File Explorer AI Assistant powered by Groq.");
    } catch (e) {
      return `Found ${results.length} files matching your search.`;
    }
  }
}
