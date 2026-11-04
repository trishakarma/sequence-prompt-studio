import 'server-only';
import { temperatureSupported, type ModelOption } from './model-settings';
export async function listModels(): Promise<ModelOption[]> {
 const key = process.env.GEMINI_API_KEY;
 if (!key) throw new Error('Configure GEMINI_API_KEY to load models.');
 const result: ModelOption[] = [];
 let pageToken = '';
 do {
  const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
  url.searchParams.set('pageSize', '1000');
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  const response = await fetch(url, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load Gemini models (${response.status}). Try refreshing.`);
  const data = await response.json();
  for (const m of data.models || []) {
   const id = String(m.name || '').replace(/^models\//, '');
   if (!id.startsWith('gemini-') || !m.supportedGenerationMethods?.includes('generateContent') || /tts|audio|live|robotics|computer-use/.test(id)) continue;
   result.push({ id, name: m.displayName || id, image: /image/.test(id), maxTemperature: typeof m.maxTemperature === 'number' ? Math.min(2, m.maxTemperature) : 1, temperatureSupported: temperatureSupported(id) });
  }
  pageToken = data.nextPageToken || '';
 } while (pageToken);
 return result.sort((a,b) => a.name.localeCompare(b.name));
}
