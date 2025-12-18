import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const BACKUP_KEYS = [
  "AIzaSyCN-83JbkP-7rWkZ6u0Rd5sgZ2mf0pUYiw",
  "AIzaSyBrvtoRVlkaG7H2yOsYSJX1rg1JC6sBmY8",
  "AIzaSyDSd5w6pZt6lVnffwuRNHIWH1BKurfKbeA",
  "AIzaSyBpqzSiatzXuImfN2kTWcB7IOH6ewAOMj8",
  "AIzaSyB_1xBmMt5dXdxoWJgv4porTsQB0uTNZPg"
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function executeWithKeyRotation<T>(
  userApiKey: string | undefined,
  operation: (ai: GoogleGenAI) => Promise<T>
): Promise<T> {
  const keys: string[] = [];
  if (userApiKey) keys.push(userApiKey);
  if (process.env.API_KEY && process.env.API_KEY !== userApiKey) keys.push(process.env.API_KEY);
  keys.push(...BACKUP_KEYS);
  
  // Deduplicate keys
  const uniqueKeys = Array.from(new Set(keys)).filter(k => !!k);

  if (uniqueKeys.length === 0) {
      throw new Error("No API Key available.");
  }

  let lastError: any;

  for (const key of uniqueKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      // Race the function against a 60s timeout
      return await Promise.race([
        operation(ai),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out (60s)")), 60000))
      ]);
    } catch (error: any) {
      lastError = error;
      const errString = JSON.stringify(error);
      const isQuota = 
        error?.status === 429 || 
        error?.code === 429 || 
        errString.includes('429') || 
        errString.includes('RESOURCE_EXHAUSTED') || 
        errString.includes('quota') ||
        error?.message?.toLowerCase().includes('quota');

      if (isQuota) {
        console.warn(`Quota exhausted for key ...${key.slice(-4)}. Rotating to next key.`);
        continue; // Try next key
      }
      
      // Also rotate on internal server errors
      if (error?.status >= 500) {
         console.warn(`Server error ${error.status} for key ...${key.slice(-4)}. Rotating.`);
         continue;
      }
      
      // Client errors (400-499 excluding 429) should probably not be retried with a different key
      // as they usually indicate invalid input, but for robustness in this specific app context,
      // we will throw them immediately.
      throw error;
    }
  }
  
  throw lastError || new Error("All API keys exhausted.");
}

// Helper to determine the closest supported aspect ratio
const getClosestAspectRatio = (width: number, height: number): string => {
  const ratio = width / height;
  const targets = [
      { name: "1:1", value: 1.0 },
      { name: "3:4", value: 0.75 },
      { name: "4:3", value: 1.333 },
      { name: "9:16", value: 0.5625 },
      { name: "16:9", value: 1.777 }
  ];
  
  const best = targets.reduce((prev, curr) => 
      Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev
  );
  
  return best.name;
};

// Optimization: Resize and compress image before sending to Gemini
const optimizeImage = async (blob: Blob): Promise<{ data: string, width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Max dimension logic
      const MAX_SIZE = 1024; 
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      // White background for transparency safety
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({
        data: dataUrl.split(',')[1],
        width,
        height
      });
    };

    img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
    };

    img.src = url;
  });
};

const prepareImageForGemini = async (input: string): Promise<{ data: string, width: number, height: number }> => {
  if (!input) throw new Error("Input image is empty");

  try {
    let blob: Blob;

    if (input.startsWith('data:')) {
       const res = await fetch(input);
       blob = await res.blob();
    } else if (input.startsWith('http')) {
      const response = await fetch(input, { mode: 'cors' });
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      blob = await response.blob();
    } else {
      throw new Error("Unknown image format");
    }

    return await optimizeImage(blob);

  } catch (e) {
    console.error("Failed to process image:", e);
    throw new Error("Could not process source image. Please ensure it is a valid image file.");
  }
};

const analyzeReferenceImage = async (base64Image: string, intent: string, apiKey?: string): Promise<string> => {
  try {
    const analysisPrompt = intent === 'swap-clothing' 
        ? "Analyze this image as a fashion reference. Return a JSON object with keys: 'garments' (list of specific items), 'materials' (fabric types), 'colors' (palette), 'fit' (description), 'details' (distinctive features like zippers, patterns)."
        : "Analyze this image as a style reference. Return a JSON object with keys: 'art_style' (e.g., oil painting, cyberpunk), 'lighting_type', 'color_palette', 'mood', 'brushwork_or_texture'.";

    const response = await executeWithKeyRotation(apiKey, async (ai) => {
        return await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                { text: analysisPrompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
                ]
            },
            config: {
                responseMimeType: 'application/json'
            }
        });
    });

    return response.text || "{}";
  } catch (e) {
    console.warn("Analysis step failed, continuing without detailed analysis.", e);
    return "{}";
  }
}

const generateRandomPoseDescription = async (apiKey?: string): Promise<string> => {
  try {
    const response = await executeWithKeyRotation(apiKey, async (ai) => {
        return await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [{ text: "Generate a single, short, vivid description of a unique, high-fashion avant-garde pose. Focus on limb placement, energy, and angle. Do not describe clothing or background, only the pose. Example output: 'Crouching low with one leg extended to the side, looking up at the camera with chin tilted down, arms wrapped defensively around the torso.'" }]
            },
            config: {
                temperature: 1.2
            }
        });
    });
    return response.text?.trim() || "A dynamic, random fashion pose.";
  } catch (e) {
    console.warn("Pose generation failed", e);
    return "A dynamic, random fashion pose.";
  }
}

const enhancePrompt = async (userInstruction: string, apiKey?: string): Promise<string> => {
    try {
        const response = await executeWithKeyRotation(apiKey, async (ai) => {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [{ 
                        text: `You are an expert Art Director. The user is editing an image and has provided this instruction: "${userInstruction}".
                        
                        Your task: Expand this instruction into a concise but detailed prompt for an image generator.
                        
                        CRITICAL INSTRUCTIONS FOR CONSISTENCY:
                        1. If the instruction is about camera angle (e.g. "close up", "wide shot") or pose, explicitly state to PRESERVE the subject's identity, facial features, and clothing details from the input image.
                        2. If the instruction is about environment (e.g. "on mars"), explicitly state to PRESERVE the subject and clothing.
                        3. Output ONLY the prompt. No intro/outro.` 
                    }]
                }
            });
        });
        return response.text?.trim() || userInstruction;
    } catch (e) {
        console.warn("Prompt enhancement failed, using original.", e);
        return userInstruction;
    }
}

export const generateVariation = async (
  parentImageSource: string,
  intent: string,
  customPrompt: string,
  referenceImageSource?: string,
  rootImageSource?: string,
  historyContext: string = "",
  apiKey?: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image'; 

    let finalPrompt = "";
    
    // Process input image
    const parentImageObj = await prepareImageForGemini(parentImageSource);
    const parentImageBase64 = parentImageObj.data;
    const bestAspectRatio = getClosestAspectRatio(parentImageObj.width, parentImageObj.height);
    
    console.log(`Input Dimensions: ${parentImageObj.width}x${parentImageObj.height}. Using Aspect Ratio: ${bestAspectRatio}`);

    const parts: any[] = [];

    // Common Context Logic
    const historyBlock = historyContext ? `
    TIMELINE MEMORY (Sequence of events leading to this frame):
    ${historyContext}
    
    CRITICAL: Understand the modifications made in previous steps (e.g., if clothing was changed in step 2, it must remain that way unless changed again).
    ` : "";

    if (referenceImageSource) {
        // Multi-image prompting logic
        const referenceImageObj = await prepareImageForGemini(referenceImageSource);
        const referenceImageBase64 = referenceImageObj.data;
        
        let analysisJson = "{}";
        if (intent === 'swap-clothing' || intent === 'style-transfer') {
            analysisJson = await analyzeReferenceImage(referenceImageBase64, intent, apiKey);
            await delay(500); 
        }

        if (intent === 'swap-clothing') {
            finalPrompt = `
                ${historyBlock}
                You are an expert Fashion Director.
                IMAGE 1 (First image) is the TARGET MODEL (Current State).
                IMAGE 2 (Second image) is the CLOTHING REFERENCE.
                ASSET ANALYSIS (JSON): ${analysisJson}
                TASK: Generate a new image of the model from IMAGE 1 wearing the outfit shown in IMAGE 2.
                RULES:
                1. PRESERVE: Face, hair, pose, lighting, and background of IMAGE 1 exactly.
                2. REPLACE: The clothing of IMAGE 1 with the garments in IMAGE 2.
                3. QUALITY: Photorealistic, 8k.
            `;
        } else if (intent === 'style-transfer') {
            finalPrompt = `
                ${historyBlock}
                You are an expert Visual Artist.
                IMAGE 1: Content Source.
                IMAGE 2: Style Reference.
                STYLE DATA: ${analysisJson}
                TASK: Re-imagine IMAGE 1 by applying the visual style of IMAGE 2.
            `;
        } else {
             let enhancedInstruction = customPrompt;
             if (customPrompt.length < 50) {
                 enhancedInstruction = await enhancePrompt(customPrompt, apiKey);
                 await delay(500);
             }
             finalPrompt = `
             ${historyBlock}
             TASK: Combine the concepts of these two images based on this detailed instruction: ${enhancedInstruction}.
             `;
        }

        parts.push({ text: finalPrompt });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: parentImageBase64 } });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: referenceImageBase64 } });

    } else {
        // Standard Variation Logic
        let contextImageBase64: string | null = null;
        if (rootImageSource && rootImageSource !== parentImageSource) {
            try {
                const rootObj = await prepareImageForGemini(rootImageSource);
                contextImageBase64 = rootObj.data;
            } catch (e) {
                console.warn("Could not load root context image, proceeding without it.");
            }
        }

        if (intent === 'random pose') {
             const dynamicPose = await generateRandomPoseDescription(apiKey);
             await delay(1000);
             finalPrompt = `
                ${historyBlock}
                You are an expert Fashion Photographer.
                IMAGE 1 is the CURRENT FRAME (The result of the timeline above).
                ${contextImageBase64 ? 'IMAGE 2 is the ROOT SEED (Identity/Details Ground Truth).' : ''}
                
                TASK: Generate a new image of THIS SAME CHARACTER in a completely new pose: "${dynamicPose}".
                
                CONSISTENCY RULES:
                - PRESERVE the character's facial features and identity perfectly. ${contextImageBase64 ? 'Use IMAGE 2 as the source of truth for facial details.' : ''}
                - PRESERVE the exact outfit and fabric textures described in the Timeline Memory.
                - PRESERVE the lighting and environment style.
            `;
        } else if (intent === 'camera-view') {
             finalPrompt = `
                ${historyBlock}
                You are an expert Image Restorer and Detailer.
                IMAGE 1: INPUT CROP (This is the strict composition).
                ${contextImageBase64 ? 'IMAGE 2: REFERENCE CONTEXT (For texture/style/identity truth only).' : ''}
                
                TASK: High-fidelity upscaling and refinement of IMAGE 1.
                
                STRICT GUIDELINES:
                1. COMPOSITION: The output must match the framing of IMAGE 1 exactly. Do not zoom out. Do not extend borders.
                2. DETAIL: Hallucinate high-frequency details (skin texture, fabric weave, light reflections) that would be visible at this zoom level.
                3. CONSISTENCY: Ensure textures match the Identity/Style established in IMAGE 2 (if provided).
                4. NO TRANSFORMATION: Do not change the pose, expression, or content. Just enhance fidelity.
            `;
        } else if (intent === 'custom' || customPrompt) {
             let detailedInstruction = customPrompt;
             if (detailedInstruction.length < 100) {
                 detailedInstruction = await enhancePrompt(detailedInstruction, apiKey);
                 await delay(500); 
             }

             finalPrompt = `
                ${historyBlock}
                You are an expert Art Director.
                IMAGE 1: INPUT IMAGE (Current composition).
                ${contextImageBase64 ? 'IMAGE 2: ROOT SEED (Identity/Clothing Ground Truth).' : ''}
                
                TASK: Transform the input image based on this directive: "${detailedInstruction}".
                
                STRICT GUIDELINES FOR CONSISTENCY:
                1. IDENTITY: Maintain the subject's face, hair, and body shape exactly. ${contextImageBase64 ? 'Look at Image 2 for facial structure and details.' : ''}
                2. ATTIRE: Maintain the exact clothing details established in the Timeline Memory unless the directive involves changing clothes.
                3. QUALITY: Photorealistic, high fidelity.
             `;
        } else {
             finalPrompt = `
                ${historyBlock}
                You are an expert Art Director.
                IMAGE 1: INPUT IMAGE.
                ${contextImageBase64 ? 'IMAGE 2: REFERENCE CONTEXT.' : ''}
                TASK: Generate a variation of this image with this focus: ${intent}.
                RULES:
                - Keep the subject's identity and clothing consistent with the Timeline Memory.
                - Only change the aspect requested (e.g. if 'angle', change camera angle but keep subject same).
            `;
        }

        parts.push({ text: finalPrompt });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: parentImageBase64 } });
        
        if (contextImageBase64) {
             parts.push({ inlineData: { mimeType: 'image/jpeg', data: contextImageBase64 } });
        }
    }

    const response = await executeWithKeyRotation(apiKey, async (ai) => {
        return await ai.models.generateContent({
          model: model,
          contents: { parts },
          config: {
            imageConfig: { aspectRatio: bestAspectRatio }
          }
        });
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/jpeg;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data returned from model.");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const generateSeed = async (prompt: string, apiKey?: string): Promise<string> => {
  try {
    let finalPrompt = prompt;
    if (prompt.length < 80) {
         finalPrompt = await enhancePrompt(prompt, apiKey);
         await delay(500);
    }

    const response = await executeWithKeyRotation(apiKey, async (ai) => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: finalPrompt }]
          },
          config: {
            imageConfig: { aspectRatio: "1:1" }
          }
        });
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/jpeg;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Seed Generation Error:", error);
    throw error;
  }
};