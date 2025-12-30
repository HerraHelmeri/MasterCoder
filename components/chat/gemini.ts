import { buildContextBundle } from './context';

export const requestGeminiReply = async ({
  prompt,
  fileIndex,
  selectedFilePaths,
  getFileContent,
  history
}: {
  prompt: string;
  fileIndex: string[];
  selectedFilePaths: string[];
  getFileContent: (path: string) => Promise<string>;
  history: { role: 'user' | 'assistant'; content: string }[];
}) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return 'Missing Gemini API key. Add GEMINI_API_KEY to `.env.local` and restart the app.';
  }

  const bundle = await buildContextBundle({
    prompt,
    fileIndex,
    selectedFilePaths,
    getFileContent
  });
  if (bundle.context.startsWith('Project file index is still loading')) {
    return bundle.context;
  }

  const systemPrompt = [
    'Your name is pussy slayer.',
    'You are an AI coding assistant embedded in an editor.',
    'Use the provided context to answer coding questions precisely.',
    'Give short explanation for your decisions.',
    'Return Markdown only.',
    'If you include code, wrap it in fenced code blocks with a language tag.',
    'Do NOT use diff/patch formats (no @@, ---/+++, or leading +/-) unless explicitly asked.',
    'Prefer full file outputs when proposing changes.',
    'Avoid unnecessary markup or commentary.'
  ].join(' ');

  const userPrompt = [
    `User question: ${prompt}`,
    '',
    'Context:',
    bundle.context,
    '',
    'Answer:'
  ].join('\n');

  const recentHistory = history
    .slice(-6)
    .map(message => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }]
    }));

  const callGemini = async (contents: any[]) => {
    const payload = {
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        text: `Gemini request failed (${response.status}). ${errorText}`,
        finishReason: 'error'
      };
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.map((part: any) => part.text).join('') ?? '';
    return {
      text: text || 'Gemini returned an empty response.',
      finishReason: candidate?.finishReason
    };
  };

  const baseContents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    ...recentHistory,
    { role: 'user', parts: [{ text: userPrompt }] }
  ];

  const first = await callGemini(baseContents);
  let fullText = first.text;
  let finishReason = first.finishReason;

  for (let i = 0; i < 2; i += 1) {
    if (!finishReason || finishReason === 'STOP') break;
    if (!String(finishReason).toLowerCase().includes('max')) break;

    const continuationPrompt = [
      'Continue from where you left off.',
      'Do not repeat previous text.',
      'If you were inside a code block, continue without reopening it.'
    ].join(' ');

    const continuation = await callGemini([
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...recentHistory,
      { role: 'model', parts: [{ text: fullText }] },
      { role: 'user', parts: [{ text: continuationPrompt }] }
    ]);

    if (continuation.text) {
      fullText = `${fullText}\n${continuation.text}`;
    }
    finishReason = continuation.finishReason;
  }

  return fullText;
};
