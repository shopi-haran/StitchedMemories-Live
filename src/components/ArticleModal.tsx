import React from 'react';
import { BlogPost } from '../types';
import { X, ArrowRight } from 'lucide-react';
import { ArticleContentRenderer } from './ArticleContentRenderer';

interface ArticleModalProps {
  post: BlogPost | null;
  onClose: () => void;
  onNextArticle?: () => void;
  onOpenConverter?: () => void;
  onOpenShop?: () => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  post,
  onClose,
  onNextArticle,
  onOpenConverter,
  onOpenShop,
}) => {
  if (!post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF6EE] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 lg:p-10 shadow-2xl border border-[#E8E1D2] relative scrollbar-thin">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-[#E5EDE2] text-[#3D5239] flex items-center justify-center hover:bg-[#D5E2D1] transition-colors cursor-pointer z-10 shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Shared Article Renderer */}
        <ArticleContentRenderer
          post={post}
          onOpenConverter={() => {
            onClose();
            if (onOpenConverter) onOpenConverter();
          }}
          onOpenShop={() => {
            onClose();
            if (onOpenShop) onOpenShop();
          }}
          interactive={true}
        />

        {/* Footer Actions */}
        <div className="mt-10 pt-6 border-t border-[#E8E1D2] flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#E8E1D2] hover:bg-[#DCD4C3] text-[#1D231E] text-xs font-bold transition-colors cursor-pointer"
          >
            Close Article
          </button>

          {onNextArticle && (
            <button
              onClick={onNextArticle}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs group"
            >
              <span>Read Next Article</span>
              <ArrowRight className="w-4 h-4 text-[#E06C38] group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
