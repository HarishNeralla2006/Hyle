
export const ROOT_DOMAINS = [
    "Science",
    "Technology",
    "Engineering",
    "Arts",
    "Mathematics",
    "Philosophy",
    "History",
    "Nature",
    "Social Sciences",
    "Business",
    "Literature",
    "Health",
    "Environment",
    "Education",
    "Law",

];

const getFallbackData = (topic: string): string[] => [
    `Concepts in ${topic}`,
    `History of ${topic}`,
    `Modern ${topic}`,
    `Applications of ${topic}`,
    `Research in ${topic}`,
    `Future of ${topic}`,
    `Ethics in ${topic}`,
    `Tools for ${topic}`,
    `${topic} Case Studies`,
    `${topic} Theory`
];

// Helper to clean up the raw text response from the model
const cleanTextResponse = (text: string, parentDomain: string): string[] => {
    if (!text) return [];

    let clean = text.trim();

    // Remove markdown code blocks
    clean = clean.replace(/```json/g, '').replace(/```/g, '').trim();

    // Try JSON parse first
    // Look for array bracket pattern
    const arrayMatch = clean.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        try {
            const parsed = JSON.parse(arrayMatch[0]);
            if (Array.isArray(parsed)) {
                return parsed.map(s => String(s).trim()).filter(s => s.length > 0 && s.toLowerCase() !== parentDomain.toLowerCase());
            }
        } catch (e) {
            // ignore JSON parse error, fall through to line parsing
        }
    }

    // Fallback: Line-based parsing
    let items = clean.split('\n');

    // Handle comma-separated lists if it's just one line and looks like a list
    if (items.length === 1 && clean.includes(',')) {
        items = clean.split(',');
    }

    return items
        .map(line => {
            // Remove common list bullets, numbering, and markdown syntax
            return line
                .replace(/^[\d\-\*\•\>]+[\.\)]?\s*/, '')
                .replace(/[\[\]"]/g, '')
                .replace(/\*\*/g, '') // remove bold markdown
                .replace(/^\#+\s*/, '') // remove headings
                .trim();
        })
        .filter(line => {
            const lower = line.toLowerCase();
            const parentLower = parentDomain.toLowerCase();

            if (line.length < 2 || line.length > 100) return false;
            if (lower.includes('here is')) return false;
            if (lower.includes('sure,')) return false;
            if (lower === parentLower) return false;
            return true;
        })
        .slice(0, 10);
};

const POLLINATIONS_API_KEY = process.env.NEXT_PUBLIC_POLLINATIONS_API_KEY || 'sk_TyClYPBfkPtYjCp0jvYQdF9llmBgwCp2';
const BASE_URL = 'https://gen.pollinations.ai';

// Pollinations.AI Text Generation
// Uses OpenAI-compatible chat completions endpoint (POST /v1/chat/completions) with fallback to GET /text/{prompt}
const fetchPollinations = async (prompt: string, system: string, seed?: number): Promise<string> => {
    try {
        const messages = [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
        ];

        const body: Record<string, any> = {
            model: 'openai',
            messages,
        };

        if (seed !== undefined) {
            body.seed = seed;
        }

        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${POLLINATIONS_API_KEY}`,
            },
            body: JSON.stringify(body),
        });

        if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
                return content;
            }
        }
    } catch (e) {
        console.warn('Pollinations chat completions request failed, falling back to GET /text:', e);
    }

    // Fallback: GET /text/{prompt}
    const encodedPrompt = encodeURIComponent(prompt);
    const encodedSystem = encodeURIComponent(system);
    let url = `${BASE_URL}/text/${encodedPrompt}?model=openai&system=${encodedSystem}`;

    if (seed !== undefined) {
        url += `&seed=${seed}`;
    }

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${POLLINATIONS_API_KEY}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Pollinations API Error: ${response.status} ${response.statusText}`);
    }

    return await response.text();
};

export const generateDomains = async (parentDomain: string, contextPath: string[], variant: number = 0): Promise<string[]> => {
    const pathString = contextPath.join(' > ');

    // Create a deterministic seed based on input to ensure consistent results for the same view,
    // but different results for 'load more' (variant).
    // Using a simple hash of the parentDomain + variant
    let seed = variant * 1000;
    for (let i = 0; i < parentDomain.length; i++) {
        seed += parentDomain.charCodeAt(i);
    }

    const systemPrompt = `You are a taxonomy expert. List 8 distinct subfields or specific topics related to "${parentDomain}". Return ONLY a JSON array of strings. Do not include any explanation.`;
    const userPrompt = `Context: ${pathString}. List sub-topics.`;

    try {
        const text = await fetchPollinations(userPrompt, systemPrompt, seed);
        const domains = cleanTextResponse(text, parentDomain);
        if (domains.length > 0) return domains;
    } catch (error) {
        console.warn(`AI attempt failed for ${parentDomain}:`, error);
    }

    console.warn("Using fallback data for", parentDomain);
    return getFallbackData(parentDomain);
};

const descriptionCache: Record<string, string> = {};

export const generateDomainDescription = async (domain: string, path: string[]): Promise<string> => {
    if (descriptionCache[domain]) return descriptionCache[domain];

    const pathString = path.join(' > ');
    const systemPrompt = "You are an encyclopedia. Provide a single, concise definition sentence for the term. Return only the plain text definition.";
    const userPrompt = `Define "${domain}" (Context: ${pathString}).`;

    // No seed for descriptions, let it be random/fresh or default
    try {
        const text = await fetchPollinations(userPrompt, systemPrompt);
        const cleanText = text.replace(/["']/g, '').trim();

        if (cleanText) {
            descriptionCache[domain] = cleanText;
            return cleanText;
        }
    } catch (error) {
        console.warn("Description generation failed", error);
    }

    return `${domain} is a significant topic within ${path[path.length - 2] || 'this field'}.`;
};
