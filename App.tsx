import React, { useState, useCallback } from 'react';
import { generateMalayalamSpeech, generatePodcastScript, humorStyles } from './services/geminiService';
import { decode, createWavUrl, generateJinglePCM, addIntroOutro } from './utils/audio';
import { LoadingIcon } from './components/icons/LoadingIcon';
import { MicrophoneIcon } from './components/icons/MicrophoneIcon';

const App: React.FC = () => {
  const [topic, setTopic] = useState<string>('The best places to visit in Kerala');
  const [humorStyle, setHumorStyle] = useState<string>('Random');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<'script' | 'audio' | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePodcast = useCallback(async () => {
    if (!topic.trim() || isLoading) return;

    setIsLoading(true);
    setLoadingStep('script');
    setError(null);
    setAudioUrl(null);
    setGeneratedScript(null);

    try {
      // Step 1: Generate the podcast script with the selected humor style
      const script = await generatePodcastScript(topic, humorStyle);
      setGeneratedScript(script);

      // Step 2: Generate audio from the script
      setLoadingStep('audio');
      const base64Audio = await generateMalayalamSpeech(script);
      if (base64Audio) {
        // Decode base64 audio to raw PCM data
        const pcmData = decode(base64Audio);
        
        // Generate a 2-second jingle with a pleasant tone (e.g., A4 note = 440 Hz)
        const jinglePcm = generateJinglePCM(2, 440, 24000);
        
        // Add the jingle as intro and outro
        const finalPcmData = addIntroOutro(pcmData, jinglePcm);
        
        // Create a .wav file URL from the combined audio data
        const wavUrl = createWavUrl(finalPcmData, 24000, 1);
        setAudioUrl(wavUrl);
      } else {
        throw new Error('API returned empty audio data.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('Error generating podcast:', errorMessage);
      setError(`Failed to generate podcast. ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  }, [topic, isLoading, humorStyle]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 border border-gray-700">
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Malayalam Podcast Generator
          </h1>
          <p className="text-gray-400 mt-2">
            Enter a topic, and we'll generate a 3-minute podcast script and its Malayalam audio.
          </p>
        </header>

        <main>
          <div className="space-y-4">
            <div>
              <label htmlFor="topic-text" className="block text-sm font-medium text-gray-400 mb-2">
                Enter a Topic for the Podcast
              </label>
              <textarea
                id="topic-text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., A debate about coffee vs. tea"
                className="w-full h-28 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none text-lg placeholder-gray-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="humor-style" className="block text-sm font-medium text-gray-400 mb-2">
                  Select a Humor Style
              </label>
              <select
                  id="humor-style"
                  value={humorStyle}
                  onChange={(e) => setHumorStyle(e.target.value)}
                  disabled={isLoading}
                  className="w-full p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-lg placeholder-gray-500 appearance-none"
                  style={{
                    backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="white" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                    backgroundSize: '1.5em',
                  }}
              >
                  <option value="Random">Random</option>
                  {humorStyles.map((style) => (
                      <option key={style} value={style}>
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                      </option>
                  ))}
              </select>
            </div>
            <button
              onClick={handleGeneratePodcast}
              disabled={!topic.trim() || isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
            >
              {isLoading ? (
                <>
                  <LoadingIcon />
                  {loadingStep === 'script' ? 'Generating Script...' : 'Generating Audio...'}
                </>
              ) : (
                <>
                  <MicrophoneIcon />
                  Generate Podcast
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center">
              <p>{error}</p>
            </div>
          )}

          {generatedScript && !isLoading && (
             <div className="mt-6 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">Generated Script</h3>
                <pre className="whitespace-pre-wrap text-gray-300 bg-gray-900 p-3 rounded-md font-mono text-sm">
                  {generatedScript}
                </pre>
             </div>
          )}

          {audioUrl && (
            <div className="mt-6 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">Generated Audio</h3>
              <audio controls src={audioUrl} className="w-full">
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </main>
      </div>
      <footer className="text-center mt-8 text-gray-500 text-sm">
        <p>Powered by Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;