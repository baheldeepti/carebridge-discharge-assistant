
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DischargeAnalysis, FileData, MedicationVerification } from "../types";

export const analyzeDischargeDocument = async (file: FileData, preferredLanguage: string): Promise<DischargeAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are a bilingual medical translation and safety expert. 
    TARGET LANGUAGE: ${preferredLanguage}.
    
    TASK: Analyze the hospital discharge document for patient safety and clarity.
    
    MANDATORY LANGUAGE RULE:
    - ALL patient-facing text (summary, explanation, questions, instructions, timeline) MUST be written in ${preferredLanguage}.
    - If the source is in English, translate it accurately to ${preferredLanguage}.
    - Use an empathetic, supportive tone suitable for an 8th-grade reading level.
    
    EXTRACTION RULES:
    - Recovery Timeline: Create a "First 48 Hours" roadmap. Each item needs 'time', 'activity' (in ${preferredLanguage}), and 'category' ('medication', 'rest', 'check', 'nutrition').
    - Medications: Keep names in Latin characters if standard, but translate 'purpose' and 'special_instructions' to ${preferredLanguage}.
    - Home Care: For each instruction, select a category and translate the text to ${preferredLanguage}.
  `;

  // Determine how to send the file content to Gemini
  let contentPart;
  const isTextFile = file.mimeType.startsWith('text/') || file.mimeType === 'application/json' || file.name.endsWith('.md') || file.name.endsWith('.txt');

  if (isTextFile) {
    try {
      // Decode base64 to text for better processing of text files
      const binaryString = atob(file.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const textContent = new TextDecoder().decode(bytes);
      
      contentPart = { text: `CLINICAL DOCUMENT CONTENT:\n\n${textContent}\n\nPlease analyze this content according to the system instructions.` };
    } catch (e) {
      // Fallback if decoding fails
      console.warn("Failed to decode text file, sending as inlineData", e);
      contentPart = { inlineData: { mimeType: file.mimeType || 'text/plain', data: file.base64 } };
    }
  } else {
    // For Images and PDFs, use inlineData
    contentPart = { inlineData: { mimeType: file.mimeType, data: file.base64 } };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{ 
      parts: [
        contentPart,
        { text: isTextFile ? "" : "Extract all clinical information into the provided JSON schema." } // Only add prompt if not already embedded
      ] 
    }],
    config: {
      systemInstruction,
      thinkingConfig: { thinkingBudget: 24000 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          structured_extraction: {
            type: Type.OBJECT,
            properties: {
              patient_summary: { type: Type.STRING },
              medications: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    dose: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    special_instructions: { type: Type.STRING },
                  },
                },
              },
              recovery_timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    activity: { type: Type.STRING },
                    category: { type: Type.STRING }
                  }
                }
              },
              follow_ups: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    provider: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    date_or_timing: { type: Type.STRING },
                    location_or_contact: { type: Type.STRING },
                  },
                },
              },
              red_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
              home_care_instructions: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    category: { type: Type.STRING }
                  },
                  required: ['text', 'category']
                } 
              },
              ambiguities_or_risks: { type: Type.ARRAY, items: { type: Type.STRING } },
              care_team_contact: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                nullable: true,
              },
            },
          },
          plain_language_explanation: { type: Type.STRING },
          teach_back_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  });

  if (!response.text) throw new Error("No response from AI");
  const data = JSON.parse(response.text) as DischargeAnalysis;
  data.detected_language = preferredLanguage;

  const medNames = data.structured_extraction.medications.map(m => m.name).join(', ');
  for (const med of data.structured_extraction.medications) {
    try {
      const safetyResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Explain safety warnings for ${med.name} with ${medNames} in ${preferredLanguage}.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      med.safety_alert = safetyResponse.text;
      med.sources = safetyResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter(c => c.web)
        .map(c => ({ title: c.web!.title, uri: c.web!.uri })) || [];
    } catch (e) {
      console.error("Safety grounding failed", e);
    }
  }

  return data;
};

export const verifyMedicationBottle = async (bottleImage: FileData, expectedMeds: string): Promise<MedicationVerification> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{
      parts: [
        { inlineData: { mimeType: bottleImage.mimeType, data: bottleImage.base64 } },
        { text: `Identify the medicine on this bottle and compare to: ${expectedMeds}.` },
      ]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_match: { type: Type.BOOLEAN },
          mismatch_details: { type: Type.STRING, nullable: true },
          confidence_score: { type: Type.NUMBER },
          detected_med_name: { type: Type.STRING },
          detected_dosage: { type: Type.STRING },
        }
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const generateTTS = async (text: string, language: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Enhanced prompt for a more human, professional persona
  const prompt = `Speak the following medical advice with a warm, empathetic, and professional medical assistant's voice in ${language}. 
  Maintain a supportive tone that makes the patient feel cared for. 
  Text to speak: "${text}"`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { 
        voiceConfig: { 
          prebuiltVoiceConfig: { voiceName: 'Fenrir' } // 'Fenrir' often has a deeper, more authoritative yet warm tone suitable for a doctor
        } 
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
};
