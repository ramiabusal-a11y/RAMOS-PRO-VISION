
export interface AppSettings {
  apiKey: string;
  analysisModel: string;
  generationModel: string;
}

export interface ImageState {
  original: string | null; // Base64 of product
  background: string | null; // URL or Base64 of generated scene
  processed: string | null; // Final composition
}

export interface ProductTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export type GenerationMode = 'manual' | 'auto';

export interface AnalysisResult {
  productDescription: string;
  suggestedScene: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  analysisModel: 'gemini-1.5-flash',
  generationModel: 'flux/schnell', 
};

export const AVAILABLE_EDIT_MODELS = [
  { id: 'flux/schnell', name: 'Flux Schnell (Fast & Cheap)' },
  { id: 'flux/dev', name: 'Flux Dev (High Quality)' },
  { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL 1.0 (Reliable)' },
  { id: 'dall-e-3', name: 'DALL-E 3 (Best Composition)' },
];

export const AVAILABLE_ANALYSIS_MODELS = [
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fastest)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Smartest)' },
  { id: 'gpt-4o', name: 'GPT-4o (Alternative)' },
];
