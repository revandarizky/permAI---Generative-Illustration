export type StyleId = 
  'anime' | 
  'flat_illustration' | 
  '3d_illustration' | 
  'children_book' | 
  'painterly' | 
  'isometric' |
  'corporate_memphis' |
  'realism' |
  'semi_realism' |
  'cartoon' |
  'comic_book' |
  'hand_drawn' |
  'watercolor' |
  'stylized_caricature' |
  'manhwa' |
  'modern_cartoon' |
  'retro_vintage' |
  'pixel_art' |
  'clayture_3d';

export interface StyleOption {
  id: StyleId;
  label: string;
  prompt: string;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export interface GeneratedImage {
  src: string;
  alt: string;
}

export type GenerationModelId = 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image';

export interface GenerationModelOption {
    id: GenerationModelId;
    label: string;
    description: string;
}

export type Mode = 'generate' | 'edit' | 'ideate' | 'gallery';