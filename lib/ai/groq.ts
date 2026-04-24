import Groq from 'groq-sdk';

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
	throw new Error('GROQ_API_KEY is not set. Add it to your .env.local file.');
}

const groq = new Groq({
	apiKey: groqApiKey,
});

/**
 * Groq pricing per model (as of 2024)
 */
const GROQ_PRICING = {
	'llama-3.1-8b-instant': {
		input: 0.05 / 1_000_000,  // $0.05 per 1M input tokens
		output: 0.08 / 1_000_000, // $0.08 per 1M output tokens
	},
	'llama-3.1-70b-versatile': {
		input: 0.59 / 1_000_000,  // $0.59 per 1M input tokens
		output: 0.79 / 1_000_000, // $0.79 per 1M output tokens
	},
	'mixtral-8x7b-32768': {
		input: 0.27 / 1_000_000,  // $0.27 per 1M input tokens
		output: 0.81 / 1_000_000, // $0.81 per 1M output tokens
	},
} as const;

export type GroqResponse = {
	content: string;
	cost: number;
	tokens: {
		input: number;
		output: number;
		total: number;
	};
};

/**
 * Calculate cost based on Groq token usage
 */
function calculateGroqCost(
	model: string,
	inputTokens: number,
	outputTokens: number
): number {
	const pricing = GROQ_PRICING[model as keyof typeof GROQ_PRICING] || GROQ_PRICING['llama-3.1-8b-instant'];
	const inputCost = inputTokens * pricing.input;
	const outputCost = outputTokens * pricing.output;
	return inputCost + outputCost;
}

/**
 * Generates a chat completion using Groq's fast inference engine.
 * Returns both the content and the cost.
 */
export async function getGroqChatCompletion(message: string, systemPrompt?: string): Promise<GroqResponse> {
	try {
		const model = 'llama-3.1-8b-instant';
		console.log('[Groq] Sending request to Groq API...');
		const response = await groq.chat.completions.create({
			messages: [
				...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
				{ role: 'user' as const, content: message },
			],
			model,
		});

		const inputTokens = response.usage?.prompt_tokens || 0;
		const outputTokens = response.usage?.completion_tokens || 0;
		const cost = calculateGroqCost(model, inputTokens, outputTokens);

		console.log('[Groq] Response received - Input tokens:', inputTokens, 'Output tokens:', outputTokens, 'Cost:', cost);

		return {
			content: response.choices[0]?.message?.content || '',
			cost,
			tokens: {
				input: inputTokens,
				output: outputTokens,
				total: inputTokens + outputTokens,
			},
		};
	} catch (error) {
		console.error('Groq API Error:', error);
		throw new Error('Failed to get response from Groq');
	}
}
