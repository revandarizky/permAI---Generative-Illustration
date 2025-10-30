import { StyleOption, AspectRatio, GenerationModelOption } from './types';

export const STYLE_OPTIONS: StyleOption[] = [
  { id: 'anime', label: 'Anime', prompt: 'anime style, flat cel-shade, bold lineart, clean palette, soft glow minimal' },
  { id: 'flat_illustration', label: 'Flat Illustration', prompt: 'flat illustration, vector-like, clean shapes, pastel colors, no textures' },
  { id: '3d_illustration', label: '3D Illustration', prompt: '3d illustration, soft PBR, sub-surface feel, gentle rim-light, studio lighting' },
  { id: 'clayture_3d', label: 'Clayture 3D', prompt: '3d claymation style, plasticine models, soft clay texture, subtle fingerprints, stop-motion aesthetic, vibrant colors, soft diffused lighting' },
  { id: 'children_book', label: 'Children\'s Book', prompt: 'children\'s book illustration, pastel brushes, paper texture, warm colors, soft outlines' },
  { id: 'painterly', label: 'Painterly', prompt: 'painterly style, oil/acrylic brush strokes, canvas texture, dramatic lighting' },
  { id: 'isometric', label: 'Isometric', prompt: 'isometric style, 3/4 perspective, neat grid, soft shadows' },
  { id: 'corporate_memphis', label: 'Corporate Memphis', prompt: 'corporate memphis art style, flat minimalist vector characters, oversized limbs, simple geometric shapes, bright color palette, alegria style' },
  { id: 'realism', label: 'Realism', prompt: 'photorealistic, hyperrealistic, high detail, dramatic lighting, 8k' },
  { id: 'semi_realism', label: 'Semi-Realism', prompt: 'semi-realistic, digital painting, detailed but stylized features, soft lighting, concept art' },
  { id: 'cartoon', label: 'Cartoon', prompt: 'classic cartoon style, bold outlines, vibrant solid colors, expressive and simple shapes, 2D animation look' },
  { id: 'comic_book', label: 'Comic Book', prompt: 'american comic book style, bold inks, cross-hatching shadows, dynamic poses, halftone dots, graphic novel art' },
  { id: 'hand_drawn', label: 'Hand-Drawn', prompt: 'hand-drawn sketch, pencil or ink lines, visible strokes, sketchbook style, organic texture' },
  { id: 'watercolor', label: 'Watercolor', prompt: 'watercolor painting, soft washes, wet-on-wet technique, paper texture, bleeding colors, delicate and translucent' },
  { id: 'stylized_caricature', label: 'Caricature', prompt: 'stylized caricature, exaggerated features for expressive effect, playful and humorous, simple background' },
  { id: 'manhwa', label: 'Manhwa', prompt: 'manhwa webtoon style, clean sharp lines, gradient coloring, dramatic cell shading, vertical format feel, expressive characters' },
  { id: 'modern_cartoon', label: 'Modern Cartoon', prompt: 'modern cartoon style, calarts style, bean-shaped heads, simple rounded forms, clean digital look, bright and friendly' },
  { id: 'retro_vintage', label: 'Retro/Vintage', prompt: 'retro vintage illustration, 1950s poster art, aged paper texture, limited color palette, screen print aesthetic, nostalgic feel' },
  { id: 'pixel_art', label: 'Pixel Art', prompt: 'pixel art, 16-bit or 32-bit style, crisp pixelated grid, limited color palette, dithering, isometric or side-scroller view' },
];

export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];

export const GENERATION_MODELS: GenerationModelOption[] = [
  { id: 'imagen-4.0-generate-001', label: 'Imagen 4', description: 'Highest quality text-to-image generation.' },
  { id: 'gemini-2.5-flash-image', label: 'Gemini Flash Image', description: 'Fast generation, supports image references.' },
];