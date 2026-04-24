import { generateEmbedding } from '@/lib/ai/embedding';
import { AiStorage } from '@/lib/ai/storage';
import { cosineSimilarity } from '@/lib/ai/similarity';
import { FileMeta } from '@/types/ai';
import { getGroqChatCompletion, type GroqResponse } from '@/lib/ai/groq';

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
   * Returns both the summary and the cost for logging.
   */
  static async genterateSummary(query: string, results: any[]): Promise<{summary: string, cost: number}> {
    const fileList = results.length > 0 
      ? results.map(r => {
          const contentSnippet = r.content ? `\n   CONTENT PREVIEW: ${r.content.slice(0, 1000)}...` : '';
          return `- ${r.name} (${r.path}) [relevance: ${Math.round(r.score * 100)}%]${contentSnippet}`;
        }).join('\n')
      : 'No files found';

    const prompt = results.length > 0
      ? `The user searched for: "${query}". 
I found these matching files:
${fileList}

Provide a brief, helpful summary of these results (1-2 sentences). 
CRITICAL: Only mention files that are highly relevant to the search query. If a file seems unrelated despite the similarity score, ignore it or mention it only as a possible but unlikely match.
If there is one clear "exact" match, focus primarily on that.
Be concise and professional.`
      : `The user searched for: "${query}". No matching files were found. Provide a helpful response suggesting they try different keywords or check if files are uploaded. Keep it to 1-2 sentences.`;

    try {
      if (this.isGreeting(query)) {
        console.log('[Search] Detected greeting, calling Groq anyway for proper response');
        const greetingPrompt = `The user said: "${query}". Respond as a friendly AI file explorer assistant. Keep it brief (1-2 sentences).`;
        const response: GroqResponse = await getGroqChatCompletion(greetingPrompt, "You are a helpful File Explorer AI Assistant powered by Groq.");
        return {
          summary: response.content,
          cost: response.cost
        };
      }
      
      console.log('[Search] Calling Groq API with prompt length:', prompt.length);
      const response: GroqResponse = await getGroqChatCompletion(prompt, "You are a helpful File Explorer AI Assistant powered by Groq.");
      console.log('[Search] Groq response - tokens:', response.tokens, 'cost:', response.cost);
      
      return {
        summary: response.content,
        cost: response.cost
      };
    } catch (e) {
      console.error('[Search] Error in genterateSummary:', e);
      return {
        summary: results.length > 0 
          ? `Found ${results.length} files matching your search.`
          : `Couldn't find files matching "${query}". Try different keywords.`,
        cost: 0
      };
    }
  }
}
