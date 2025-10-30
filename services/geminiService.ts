import { GoogleGenAI, Modality, Type } from "@google/genai";
import { StyleOption, StyleId, AspectRatio } from "../types";
import { GenerationModelId } from "../types";
import { STYLE_OPTIONS, ASPECT_RATIOS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const getBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const handleApiError = (error: unknown, context: string): never => {
    console.error(`Error ${context}:`, error);
    if (error instanceof Error) {
        throw new Error(`Failed to ${context}: ${error.message}`);
    }
    throw new Error(`Failed to ${context} due to an unknown error.`);
};

export const generateImages = async (
  prompt: string,
  style: StyleOption,
  imageFile: File | undefined,
  numberOfImages: number,
  aspectRatio: AspectRatio,
  model: GenerationModelId,
  isFaceless: boolean,
): Promise<string[]> => {
  try {
    const facelessPrompt = isFaceless ? 'faceless illustration, abstract facial features, no distinct identity' : '';
    const qualityPrompt = 'award-winning, professional illustration, ultra detailed, stunning, masterpiece, high quality';
    const baseNegativePrompt = 'ugly, blurry, poor quality, text, watermark, signature, artist name, deformed, disfigured, bad anatomy, extra limbs, fused fingers, poorly drawn hands, weird eyes, boring, generic, wrong aspect ratio, stretched, distorted, incorrect proportions';
    const facelessNegativePrompt = isFaceless ? 'detailed face, eyes, nose, mouth, identifiable person,' : '';
    
    const negativePrompt = `negative prompt: ${facelessNegativePrompt} ${baseNegativePrompt}`;

    if (model === 'imagen-4.0-generate-001') {
      const aspectRatioDescription: Record<AspectRatio, string> = {
        '1:1': 'a square 1:1 aspect ratio',
        '3:4': 'a portrait 3:4 aspect ratio',
        '4:3': 'a landscape 4:3 aspect ratio',
        '9:16': 'a tall portrait 9:16 aspect ratio',
        '16:9': 'a widescreen landscape 16:9 aspect ratio'
      };
      const aspectRatioText = `in ${aspectRatioDescription[aspectRatio]}`;
      const fullPrompt = [
        prompt,
        style.prompt,
        facelessPrompt,
        qualityPrompt,
        aspectRatioText,
        negativePrompt
      ].filter(Boolean).join(', ');

      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
          numberOfImages: numberOfImages,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
        },
      });
      return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
    } else { // gemini-2.5-flash-image
      const dimensionMap: Record<AspectRatio, string> = {
        '1:1': '1024x1024px square',
        '3:4': '768x1024px portrait',
        '4:3': '1024x768px landscape',
        '9:16': '1080x1920px portrait',
        '16:9': '1920x1080px landscape',
      };

      const aspectRatioPrompt = `CRITICAL INSTRUCTION: Generate a high-resolution image with a strict aspect ratio of ${aspectRatio} (e.g., ${dimensionMap[aspectRatio]}). This requirement is non-negotiable.`;
      
      const fullPrompt = [
        'reference photo of ' + prompt,
        style.prompt,
        facelessPrompt,
        aspectRatioPrompt,
        qualityPrompt,
        negativePrompt
      ].filter(Boolean).join(', ');
      
      const parts: any[] = [{ text: fullPrompt }];

      if (imageFile) {
        const base64Data = await getBase64(imageFile);
        parts.unshift({ inlineData: { data: base64Data, mimeType: imageFile.type } });
      }

      const generateSingleImage = async (): Promise<string | null> => {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: parts },
          config: { responseModalities: [Modality.IMAGE] },
        });
        
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.mimeType.startsWith('image/')) {
              return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }
        return null;
      }

      const imageUrls: (string | null)[] = [];
      for (let i = 0; i < numberOfImages; i++) {
        const imageUrl = await generateSingleImage();
        imageUrls.push(imageUrl);
      }
      const validImageUrls = imageUrls.filter((url): url is string => url !== null);

      if (validImageUrls.length === 0) {
          throw new Error("No image was generated. The response may have been blocked or contain no image data.");
      }
      return validImageUrls;
    }
  } catch (error) {
    handleApiError(error, 'generate image');
  }
};

export const editImage = async (
  prompt: string,
  imageFile: File,
  isFaceless: boolean,
): Promise<string> => {
  try {
    const base64Data = await getBase64(imageFile);
    const editPrompt = isFaceless
        ? `${prompt}. IMPORTANT: Maintain the faceless illustration style. Ensure all characters in the image have abstract or hidden facial features, without any detailed eyes, nose, or mouth.`
        : prompt;

    const parts = [
      { inlineData: { data: base64Data, mimeType: imageFile.type } },
      { text: editPrompt },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
      config: { responseModalities: [Modality.IMAGE] },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.mimeType.startsWith('image/')) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No edited image was returned. The response may have been blocked.");

  } catch (error) {
    handleApiError(error, 'edit image');
  }
};

export const generatePromptSuggestions = async (
  description: string,
  imageFile?: File
): Promise<string[]> => {
  try {
    let systemInstruction: string;
    let userText: string;

    if (imageFile) {
        systemInstruction = `You are a world-class prompt engineer for advanced generative AI image models. Your task is to analyze a user's reference image and text idea to generate 3 distinct, visually rich prompts in ENGLISH for creating stunning FACELESS illustrations. In faceless illustrations, characters have abstracted, obscured, or no facial features.

Your response MUST be a JSON object with a single key 'suggestions' which is an array of 3 strings. The prompts should be structured as follows:

1.  **First Prompt (Descriptive):** Create a detailed, descriptive prompt that meticulously captures the subject, composition, color palette, lighting, and mood of the provided reference image. This prompt should aim to regenerate a very similar image.
2.  **Second & Third Prompts (Creative Variations):** Generate two highly creative and distinct prompts inspired by the reference image and user's idea. These can explore different scenarios, styles, or concepts while retaining the core theme.

Ensure all prompts integrate the 'faceless' concept and are written in ENGLISH. Do not add any other text or markdown formatting outside the JSON structure.`;
        
        userText = description
            ? `User's idea to consider for the creative variations: "${description}"`
            : `Analyze the provided reference image and generate prompts according to the system instructions.`;
            
    } else {
        systemInstruction = `You are a world-class prompt engineer for advanced generative AI image models. Your task is to transform a user's simple idea into 3 distinct, highly creative, and visually rich prompts in ENGLISH for generating stunning FACELESS illustrations. In faceless illustrations, characters have abstracted, obscured, or no facial features (e.g., viewed from behind, features hidden by objects/shadows, or artistically undefined). Your prompts must creatively integrate this core 'faceless' concept. For each prompt, describe a masterpiece, including vivid details about the subject, environment, composition, lighting, color palette, and mood. Ensure all generated prompts are in ENGLISH. Return the response as a JSON object with a single key 'suggestions' which is an array of 3 strings. Do not include any other text or markdown formatting.`;
        
        userText = description
            ? `Use the following idea to generate the prompts: "${description}"`
            : `Generate 3 completely random, distinct, and creative prompts. Each prompt should be visually rich and suitable for generating a stunning faceless illustration.`;
    }

    const parts: any[] = [{ text: userText }];

    if (imageFile) {
      const base64Data = await getBase64(imageFile);
      parts.unshift({ inlineData: { data: base64Data, mimeType: imageFile.type } });
    }
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    if (result.suggestions && Array.isArray(result.suggestions)) {
      return result.suggestions;
    }

    throw new Error("Invalid response format from API.");

  } catch (error) {
    handleApiError(error, 'generate prompt suggestions');
  }
};

export const inferStyleFromPrompt = async (prompt: string): Promise<StyleId | null> => {
    try {
        const styleList = STYLE_OPTIONS.map(s => ({ id: s.id, label: s.label, description: s.prompt }));

        const systemInstruction = `You are an AI expert in categorizing image generation prompts. Your task is to analyze the user's prompt and determine which of the provided styles it most closely aligns with. Respond ONLY with the JSON object containing the 'id' of the best-matching style. Do not add any other commentary or markdown.`;

        const userContent = `Prompt to analyze: "${prompt}"\n\nAvailable styles:\n${JSON.stringify(styleList)}\n\nWhich style 'id' from the list above best matches the prompt?`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userContent,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        styleId: {
                            type: Type.STRING,
                            description: "The 'id' of the single best matching style from the provided list.",
                        }
                    },
                    required: ['styleId']
                }
            }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (result.styleId && STYLE_OPTIONS.some(s => s.id === result.styleId)) {
            return result.styleId as StyleId;
        }

        return null;
    } catch (error) {
        console.error("Error inferring style from prompt:", error);
        // Fail gracefully so the app can continue with a default style
        return null; 
    }
};