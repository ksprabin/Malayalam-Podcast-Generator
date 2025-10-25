
import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const ttsModel = "gemini-2.5-flash-preview-tts";
const textModel = "gemini-2.5-flash";

export const humorStyles = [
    'political satire',
    'observational humor about daily life in Kerala',
    'slapstick comedy with exaggerated situations',
    'witty wordplay and puns',
    'sarcastic commentary on social trends',
];

export const generatePodcastScript = async (topic: string, selectedStyle: string): Promise<string> => {
  try {
    let finalStyle = selectedStyle;
    if (finalStyle.toLowerCase() === 'random') {
        finalStyle = humorStyles[Math.floor(Math.random() * humorStyles.length)];
    }

    const prompt = `You are a creative scriptwriter specializing in authentic Malayalam humor. Write an engaging podcast script in Malayalam. The script should feature two characters, മോണിക്ക (Monica) and ചാൻഡ്‌ലർ (Chandler), based on the following topic in English: "${topic}".

The style of humor for this script should be **${finalStyle}**. The conversation must feel genuinely Malayalee, poking fun at everyday Keralite life in a way that is natural and relatable to a native speaker.

**Primary Rule:** The conversation **must** begin with one of the speakers (either മോണിക്ക or ചാൻഡ്‌ലർ) setting the scene. They should naturally describe their location, the current situation, what both characters are doing, and then introduce the topic. This scene should then be used as a basis for humorous improvisation throughout the conversation.

**Important Scripting Rules:**
1.  **Natural Scene Setting & Improvisation:** One character starts by painting a picture for the listener. Both characters should then improvise humorously based on this setting.
2.  **Strict Theater of the Mind Rule for Actions:** You **must not** use brackets for non-vocal, physical actions (like sipping tea, looking out a window, opening a book). These actions must be conveyed purely through dialogue. For instance, instead of writing a silent action like \`[ചായ കുടിക്കുന്നു]\` (sips tea), the script **must** use dialogue to imply it. Example: one character could say, "ആഹാ, ഈ ചായക്ക് എന്ത് രുചി!" (Ah, this tea is delicious!), and the other could reply, "നിങ്ങൾ അത് കുടിക്കുന്ന ശബ്ദം കേട്ടാൽ അറിയാം!" (I can tell by the sound of you slurping it!). This creates a vivid picture for the listener through words alone.
3.  **Use Vocal Performance Cues:** You **must** continue to use single-word emotional and action cues that are related to speech, in Malayalam within brackets, like \`[ചിരിക്കുന്നു]\` (laughs), \`[വിഷാദത്തോടെ]\` (sadly), \`[രഹസ്യമായി]\` (whispering), or \`[അത്ഭുതത്തോടെ]\` (surprised). These cues are critical as they will directly influence the vocal performance of the AI.
4.  **Formatting:** The script must strictly follow the format 'മോണിക്ക: [dialogue]' and 'ചാൻഡ്‌ലർ: [dialogue]', with each speaker on a new line.
5.  **Length:** The entire podcast should be extensive enough to last approximately 3 minutes when spoken. Aim for a total word count of around 400-450 words.`;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
    });
    
    const script = response.text.trim();
    if (!script) {
        throw new Error("API returned an empty script.");
    }

    return script;
  } catch (error) {
    console.error("Error calling Gemini API for script generation:", error);
    throw new Error("Failed to generate script from Gemini API.");
  }
};


export const generateMalayalamSpeech = async (text: string, voiceName?: string): Promise<string | null> => {
  try {
    // Strictly filter the script to remove non-dialogue content before generating audio.
    // 1. Remove all content inside square brackets [].
    // 2. Remove any parenthetical content () at the beginning of a line.
    const scriptText = text
      .split('\n')
      .map(line => {
        return line
          .trim()
          .replace(/\[.*?\]/g, '') // Remove all square bracket content
          .replace(/^\(.*?\)\s*/, '') // Remove parentheses content at the start of a line
          .trim(); // Trim again in case the removals left whitespace
      })
      .filter(line => line.length > 0)
      .join('\n');

    const isMultiSpeaker = /^(മോണിക്ക|ചാൻഡ്‌ലർ):/im.test(scriptText);

    let prompt: string;
    let speechConfig: any; 

    if (isMultiSpeaker) {
      // Provide explicit context to the model that this is a conversation script.
      // This is the key to preventing it from reading the speaker names aloud.
      prompt = `TTS the following conversation between മോണിക്ക and ചാൻഡ്‌ലർ in Malayalam:\n\n${scriptText}`;
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: 'മോണിക്ക:', // Monica
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' } // Female voice
              }
            },
            {
              speaker: 'ചാൻഡ്‌ലർ:', // Chandler
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' } // Male voice
              }
            }
          ]
        }
      };
    } else {
      prompt = `Say in Malayalam: ${scriptText}`;
      speechConfig = { voiceConfig: {} };
      if (voiceName && voiceName !== 'Default') {
        speechConfig.voiceConfig.prebuiltVoiceConfig = { voiceName };
      }
    }

    const response = await ai.models.generateContent({
      model: ttsModel,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: speechConfig,
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      console.error("No audio data received from API.");
      return null;
    }

    return base64Audio;
  } catch (error) {
    console.error("Error calling Gemini API for speech generation:", error);
    throw new Error("Failed to generate speech from Gemini API.");
  }
};