
import { AppSettings, AnalysisResult } from '../types';

const API_BASE_URL = "https://api.aimlapi.com/v1";

const getCleanApiKey = (key: string): string => {
  if (!key) return "";
  let clean = key.trim();
  clean = clean.replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (clean.toLowerCase().startsWith('bearer ')) {
    clean = clean.substring(7).trim();
  }
  return clean;
};

const validateApiKey = (key: string) => {
    // eslint-disable-next-line no-control-regex
    if (/[^\x00-\x7F]/.test(key)) {
        throw new Error("مفتاح API غير صالح: يحتوي على أحرف غير إنجليزية.");
    }
    if (key.length < 5) {
         throw new Error("مفتاح API قصير جداً.");
    }
};

const safeJsonParse = (content: string): any => {
  try {
    return JSON.parse(content);
  } catch (e) {
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      return JSON.parse(cleanContent);
    } catch (e2) {
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        try {
          const subStr = content.substring(firstBrace, lastBrace + 1);
          return JSON.parse(subStr);
        } catch (e3) {
          return null;
        }
      }
      return null;
    }
  }
};

/**
 * Analyzes the image to understand the product.
 */
export const analyzeProduct = async (
  imageBase64: string,
  settings: AppSettings
): Promise<AnalysisResult> => {
  const apiKey = getCleanApiKey(settings.apiKey);
  if (!apiKey) throw new Error("مفتاح API مفقود. الرجاء إضافته في الإعدادات.");
  
  validateApiKey(apiKey);

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  // Updated prompt to allow for lifestyle and human interaction suggestions
  const prompt = `
    Act as a creative art director. Analyze this product image.
    1. Identify the product.
    2. Suggest a creative "Lifestyle" scene description where this product is being USED or HELD.
    
    Examples:
    - If it's a drink: "A summer beach party, a hand holding the cold can in the foreground, blurred ocean background."
    - If it's a watch: "A professional businessman in a suit, wrist visible, city skyline bokeh."
    - If it's a cream: "A woman with glowing skin holding the jar gently, bathroom spa setting."
    
    The description should be suitable for an AI image generator to create a scene where we can overlay this product later.
    
    Return ONLY JSON:
    {
      "productDescription": "Short product name",
      "suggestedScene": "Detailed scene prompt..."
    }
  `;

  const payload = {
    model: settings.analysisModel,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}` } }
        ]
      }
    ],
    max_tokens: 300,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("AUTH_FAILED"); 
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to analyze image");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("Empty response from AI");

    const parsed = safeJsonParse(content);

    return {
      productDescription: parsed?.productDescription || "Product",
      suggestedScene: parsed?.suggestedScene || "A lifestyle photography shot, human hands holding the object, blurred background, high quality."
    };

  } catch (error: any) {
    if (error.message === "AUTH_FAILED") {
      throw new Error("خطأ في المصادقة (401): مفتاح API غير صالح.");
    }
    console.error("Analysis Error:", error);
    return {
      productDescription: "Product",
      suggestedScene: "A high quality professional photography studio background."
    };
  }
};

/**
 * Generates a Scene based on the description.
 */
export const generateScene = async (
  scenePrompt: string,
  settings: AppSettings
): Promise<string> => {
  const apiKey = getCleanApiKey(settings.apiKey);
  if (!apiKey) throw new Error("مفتاح API مفقود.");
  
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  // Enhanced prompt for realism and compositing suitability
  const finalPrompt = `
    ${scenePrompt}
    Photorealistic, 8k resolution, commercial photography, highly detailed.
    Composition: Leave a logical space or focal point for a product to be placed.
    Lighting: Cinematic and natural.
    Style: Advertising, Billboard quality.
  `;

  console.log("Generating scene with model:", settings.generationModel);

  const payload = {
    model: settings.generationModel,
    prompt: finalPrompt,
    n: 1,
    size: "1024x1024"
  };

  try {
    const response = await fetch(`${API_BASE_URL}/images/generations`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to generate scene");
    }

    const data = await response.json();
    
    let imageUrl = "";
    if (data.output && data.output.choices && data.output.choices[0]) {
       imageUrl = data.output.choices[0].image_url || data.output.choices[0].image_base64;
    } else if (data.data && data.data[0]) {
      imageUrl = data.data[0].url;
    } else {
      throw new Error("Invalid response structure from Image API");
    }

    return imageUrl;

  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};
