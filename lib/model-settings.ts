import type { Step } from './types';
export type ModelOption = { id: string; name: string; image: boolean; maxTemperature: number; temperatureSupported: boolean };
export function temperatureSupported(id: string) {
 const version = id.match(/^gemini-(\d+)(?:\.(\d+))?/);
 return !version || Number(version[1]) < 3 || (Number(version[1]) === 3 && Number(version[2] || 0) < 6);
}
export function validateSettings(step: Step) {
 if (step.model !== undefined && (typeof step.model !== 'string' || (step.model !== '' && !/^gemini-[a-z0-9][a-z0-9.-]{0,119}$/.test(step.model)))) throw new Error('Choose a valid Gemini model.');
 if (step.temperature !== undefined && (typeof step.temperature !== 'number' || !Number.isFinite(step.temperature) || step.temperature < 0 || step.temperature > 2)) throw new Error('Temperature must be a number between 0 and 2.');
}
export function generationSettings(step: Step, defaults: { text?: string; image?: string }, models: ModelOption[]) {
 validateSettings(step);
 const model = step.model || (step.kind === 'image' ? defaults.image : defaults.text);
 if (!model) throw new Error('Choose a model or configure the default model for this step type.');
 const info = models.find(m => m.id === model);
 if (!info || info.image !== (step.kind === 'image')) throw new Error(`Model ${model} is unavailable or incompatible with this step type. Choose another model.`);
 if (step.temperature !== undefined && info.temperatureSupported && step.temperature > info.maxTemperature) throw new Error(`Temperature for ${model} must be at most ${info.maxTemperature}.`);
 return { model, generationConfig: { ...(step.kind === 'image' ? { responseModalities: ['TEXT', 'IMAGE'] } : { maxOutputTokens: 4096 }), ...(step.temperature !== undefined && info.temperatureSupported ? { temperature: step.temperature } : {}) } };
}
