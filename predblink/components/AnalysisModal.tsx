import React, { useState } from 'react';
import { BrutalistButton } from './BrutalistButton';
import { analyzeVirality } from '../services/geminiService';
import { AnalysisResult } from '../types';
import { X, BrainCircuit, Sparkles, AlertTriangle } from 'lucide-react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose }) => {
  const [tweetText, setTweetText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!tweetText.trim()) return;
    setLoading(true);
    setResult(null);
    
    const data = await analyzeVirality(tweetText);
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative bg-white w-full max-w-lg border-4 border-black shadow-hard p-6 md:p-8">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 hover:rotate-90 transition-transform"
        >
          <X size={32} className="text-black" />
        </button>

        <h2 className="font-display text-3xl md:text-4xl mb-6 uppercase bg-banger-yellow inline-block px-2 border-2 border-black transform -rotate-1">
          AI Vibe Check
        </h2>

        <div className="space-y-4">
          <div>
            <label className="font-mono font-bold text-sm block mb-2 uppercase">Paste Tweet / Concept</label>
            <textarea
              value={tweetText}
              onChange={(e) => setTweetText(e.target.value)}
              placeholder="e.g. 'Just invented a new color. It's called Blellow.'"
              className="w-full h-32 border-4 border-black p-4 font-mono text-sm focus:outline-none focus:ring-4 focus:ring-banger-cyan resize-none"
            />
          </div>

          <BrutalistButton 
            onClick={handleAnalyze} 
            disabled={loading || !tweetText}
            className="w-full flex justify-center items-center gap-2"
            variant="secondary"
          >
            {loading ? (
              <span className="animate-pulse">CRUNCHING NUMBERS...</span>
            ) : (
              <>
                <BrainCircuit /> ANALYZE WITH GEMINI
              </>
            )}
          </BrutalistButton>

          {result && (
            <div className="mt-6 border-4 border-black bg-gray-50 p-4 animate-[bounce_0.5s_ease-out]">
              <div className="flex justify-between items-start mb-4 border-b-4 border-black pb-2">
                <div className="font-mono font-bold">VERDICT:</div>
                <div className={`font-display text-2xl ${
                  result.verdict === 'BANG' ? 'text-green-600' : 
                  result.verdict === 'FLOP' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {result.verdict}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                 <div className="col-span-1 border-2 border-black bg-black text-white p-2 text-center">
                    <div className="text-xs font-mono text-gray-400">SCORE</div>
                    <div className="font-display text-3xl text-banger-yellow">{result.hypeScore}</div>
                 </div>
                 <div className="col-span-2 border-2 border-black bg-white p-2 flex items-center">
                    <div className="text-sm font-mono leading-tight">
                       {result.hypeScore > 80 ? "ABSOLUTE BANGER" : result.hypeScore < 30 ? "COMPLETE TRASH" : "MID TIER"}
                    </div>
                 </div>
              </div>

              <div className="font-mono text-sm bg-banger-pink/10 p-2 border-l-4 border-banger-pink">
                <span className="font-bold text-banger-pink mr-2">AI SAYS:</span>
                {result.reasoning}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
