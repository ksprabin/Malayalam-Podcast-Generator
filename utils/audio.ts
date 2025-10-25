
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function pcmToWav(pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): ArrayBuffer {
  const blockAlign = (numChannels * bitsPerSample) >> 3;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const fileSize = dataSize + 36;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  new Uint8Array(buffer, 44).set(pcmData);

  return buffer;
}


export function createWavUrl(pcmData: Uint8Array, sampleRate: number, numChannels: number): string {
    const BITS_PER_SAMPLE = 16; // Gemini TTS returns 16-bit PCM
    const wavBuffer = pcmToWav(pcmData, sampleRate, numChannels, BITS_PER_SAMPLE);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
}

/**
 * Generates a simple musical jingle as PCM data (a three-note arpeggio).
 * @param durationSeconds The total duration of the jingle.
 * @param frequency The frequency of the base note in Hz.
 * @param sampleRate The sample rate of the audio.
 * @returns A Uint8Array containing the raw PCM data for the jingle.
 */
export function generateJinglePCM(durationSeconds: number, frequency: number, sampleRate: number): Uint8Array {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const buffer = new Int16Array(numSamples);
  const volume = 8000; // Lower volume for background music (max is 32767)

  // A simple major arpeggio for a more musical jingle
  const root = frequency;
  const majorThird = frequency * 1.2599; // ~2^(4/12)
  const perfectFifth = frequency * 1.4983; // ~2^(7/12)

  const note1Duration = Math.floor(numSamples * 0.4);
  const note2Duration = Math.floor(numSamples * 0.4);
  // The rest of the duration is for the third note.

  for (let i = 0; i < numSamples; i++) {
    // Overall fade in/out for the whole jingle to avoid clicks
    const fadeInDuration = sampleRate * 0.2; // 200ms fade-in
    const fadeOutDuration = sampleRate * 0.5; // 500ms fade-out
    const fadeIn = Math.min(1, i / fadeInDuration);
    const fadeOut = Math.min(1, (numSamples - i) / fadeOutDuration);

    const amplitude = volume * fadeIn * fadeOut;

    let currentFreq: number;
    if (i < note1Duration) {
      currentFreq = root;
    } else if (i < note1Duration + note2Duration) {
      currentFreq = majorThird;
    } else {
      currentFreq = perfectFifth;
    }

    buffer[i] = Math.sin(2 * Math.PI * currentFreq * (i / sampleRate)) * amplitude;
  }

  return new Uint8Array(buffer.buffer);
}

/**
 * Combines main audio with an intro and outro jingle.
 * @param mainPcm The PCM data for the main audio content.
 * @param jinglePcm The PCM data for the intro/outro jingle.
 * @returns A new Uint8Array with the combined audio.
 */
export function addIntroOutro(mainPcm: Uint8Array, jinglePcm: Uint8Array): Uint8Array {
    const combinedLength = jinglePcm.length + mainPcm.length + jinglePcm.length;
    const combinedPcm = new Uint8Array(combinedLength);

    combinedPcm.set(jinglePcm, 0);
    combinedPcm.set(mainPcm, jinglePcm.length);
    combinedPcm.set(jinglePcm, jinglePcm.length + mainPcm.length);

    return combinedPcm;
}
