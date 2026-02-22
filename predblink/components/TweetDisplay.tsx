import React from 'react';
import { MessageSquare, Repeat, Heart, Share } from 'lucide-react';

interface Tweet {
  authorName: string;
  authorHandle: string;
  avatarUrl: string;
  content: string;
  timestamp?: string;
  imageUrl?: string;
  quotedTweet?: Tweet;
}

interface TweetDisplayProps {
  tweet: Tweet;
  compact?: boolean;
  isQuote?: boolean;
  hideMetrics?: boolean;
}

export const TweetDisplay: React.FC<TweetDisplayProps> = ({ tweet, compact = false, isQuote = false, hideMetrics = false }) => {
  return (
    <div className={`flex flex-col gap-2.5 ${isQuote ? 'mt-2 rounded-lg border border-[#2a2a30] p-3 bg-[#0c0c0f]' : ''}`}>
      <div className="flex items-center gap-2.5">
        <img
          src={tweet.avatarUrl}
          alt={tweet.authorHandle}
          className={`rounded-full object-cover bg-nitro-surface border border-[#2a2a30] ${compact || isQuote ? 'w-7 h-7' : 'w-9 h-9'}`}
        />
        <div className="flex flex-col leading-none gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-white text-xs">{tweet.authorName}</span>
            {tweet.authorName.toLowerCase().includes('elon') && (
              <span className="text-[8px] bg-blue-500 text-white px-1 rounded-sm font-bold">✔</span>
            )}
          </div>
          <span className="text-nitro-muted font-mono text-[10px]">@{tweet.authorHandle} · {tweet.timestamp}</span>
        </div>
      </div>

      <div className={`text-nitro-text/80 whitespace-pre-wrap font-mono leading-relaxed ${compact ? 'text-xs line-clamp-3' : 'text-xs'}`}>
        {tweet.content}
      </div>

      {tweet.imageUrl && (
        <div className="relative rounded-lg overflow-hidden border border-[#2a2a30]">
          <img src={tweet.imageUrl} alt="Tweet attachment" className="w-full object-cover max-h-[250px]" />
        </div>
      )}

      {tweet.quotedTweet && (
        <TweetDisplay tweet={tweet.quotedTweet} compact={true} isQuote={true} />
      )}

      {!isQuote && !compact && !hideMetrics && (
        <div className="flex justify-between items-center text-nitro-muted font-mono text-[10px] pt-2 border-t border-[#2a2a30] mt-1">
          <div className="flex items-center gap-1 hover:text-nitro-accent cursor-pointer transition-colors"><MessageSquare size={12} /> 420</div>
          <div className="flex items-center gap-1 hover:text-emerald-400 cursor-pointer transition-colors"><Repeat size={12} /> 69</div>
          <div className="flex items-center gap-1 hover:text-rose-400 cursor-pointer transition-colors"><Heart size={12} /> 1.2k</div>
          <div className="flex items-center gap-1 hover:text-blue-400 cursor-pointer transition-colors"><Share size={12} /></div>
        </div>
      )}
    </div>
  );
};
