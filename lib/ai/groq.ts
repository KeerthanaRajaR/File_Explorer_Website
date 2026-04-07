import Groq from 'groq-sdk';

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
	throw new Error('GROQ_API_KEY is not set. Add it to your .env.local file.');
}

const groq = new Groq({
	apiKey: groqApiKey,
});

/**
 * Generates a chat completion using Groq's fast inference engine.
 */
export async function getGroqChatCompletion(message: string, systemPrompt?: string) {
	try {
		const response = await groq.chat.completions.create({
			messages: [
				...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
				{ role: 'user' as const, content: message },
			],
			model: 'llama-3.1-8b-instant',
		});

		return response.choices[0]?.message?.content || '';
	} catch (error) {
		console.error('Groq API Error:', error);
		throw new Error('Failed to get response from Groq');
	}
}
