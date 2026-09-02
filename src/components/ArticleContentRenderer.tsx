import React from 'react';
import { BlogPost } from '../types';
import { Sparkles, Heart, HelpCircle, CheckCircle2, Image as ImageIcon, ShoppingBag, ArrowRight } from 'lucide-react';

interface ArticleContentRendererProps {
  post: BlogPost;
  onOpenConverter?: () => void;
  onOpenShop?: () => void;
  interactive?: boolean;
}

export const renderFormattedText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-[#1D231E]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

export const ArticleContentRenderer: React.FC<ArticleContentRendererProps> = ({
  post,
  onOpenConverter,
  onOpenShop,
  interactive = true,
}) => {
  const authorInitials = (post.author?.name || 'SGR')
    .split(' ')
    .map((n) => n[0])
    .join('') || 'A';

  return (
    <article className="text-[#1D231E]">
      {/* Category Pill */}
      {post.category && (
        <span className="text-xs font-bold uppercase tracking-widest text-[#E06C38] bg-[#E06C38]/10 px-3.5 py-1 rounded-full inline-block mb-3">
          {post.category}
        </span>
      )}

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1D231E] mb-4 leading-tight">
        {post.title || 'Untitled Post'}
      </h1>

      {/* Author & Meta */}
      <div className="flex items-center gap-3 text-xs text-[#6B7869] mb-6 pb-4 border-b border-[#E8E1D2]">
        {post.author?.avatarUrl ? (
          <img
            src={post.author.avatarUrl}
            alt={post.author.name}
            className="w-9 h-9 rounded-full object-cover border border-[#E8E1D2]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#E06C38] text-white flex items-center justify-center font-bold text-xs">
            {authorInitials}
          </div>
        )}
        <div>
          <span className="font-bold text-[#1D231E] text-sm block">
            {post.author?.name || 'Editorial Team'}
          </span>
          <span>
            {post.date || 'Today'} • {post.readTime || '5 min read'}
          </span>
        </div>
      </div>

      {/* Main Cover Image */}
      <div className="aspect-[16/9] max-h-[420px] rounded-2xl bg-[#E8E1D2]/50 border border-[#D5CDBC] flex flex-col items-center justify-center text-center text-[#7A8877] mb-8 overflow-hidden shadow-xs">
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover rounded-2xl"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="p-6">
            <ImageIcon className="w-10 h-10 mb-2 mx-auto text-[#93A28F]" />
            <span className="text-xs font-bold text-[#5A6659] block">Cover Image</span>
            <span className="text-[11px] text-[#7A8877] block">Upload a photo to see the hero cover</span>
          </div>
        )}
      </div>

      {/* Excerpt Lead Paragraph */}
      {post.excerpt && (
        <p className="text-base sm:text-lg font-medium text-[#1D231E] leading-relaxed mb-6 p-4 rounded-2xl bg-[#F0EBE0]/60 border-l-4 border-[#E06C38]">
          {post.excerpt}
        </p>
      )}

      {/* Render Rich Sections */}
      {post.contentSections && post.contentSections.length > 0 ? (
        <div className="space-y-4 text-[#3A4538]">
          {post.contentSections.map((section, idx) => {
            switch (section.type) {
              case 'paragraph':
                return (
                  <p key={idx} className="text-sm sm:text-base leading-relaxed text-[#3A4538]">
                    {renderFormattedText(section.content || section.text || '')}
                  </p>
                );

              case 'heading2':
                return (
                  <h2
                    key={idx}
                    className="text-xl sm:text-2xl font-bold text-[#1D231E] mt-8 mb-4 pt-6 border-t border-[#E8E1D2] flex items-center gap-2"
                  >
                    <span>{section.title}</span>
                  </h2>
                );

              case 'heading3':
                return (
                  <h3
                    key={idx}
                    className="text-lg font-bold text-[#1D231E] mt-6 mb-2 flex items-center gap-2 text-[#E06C38]"
                  >
                    <Sparkles className="w-4 h-4 text-[#E06C38] shrink-0" />
                    <span>{section.title}</span>
                  </h3>
                );

              case 'list':
              case 'bulletList':
                return (
                  <ul key={idx} className="space-y-2.5 my-4 pl-1">
                    {section.items?.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-2.5 text-sm text-[#3A4538]">
                        <CheckCircle2 className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                        <span>{renderFormattedText(item)}</span>
                      </li>
                    ))}
                  </ul>
                );

              case 'image':
                return (
                  <figure key={idx} className="my-6">
                    <div className="aspect-[16/9] max-h-[380px] rounded-2xl bg-[#E8E1D2]/50 border border-[#D5CDBC] flex flex-col items-center justify-center text-center text-[#7A8877] overflow-hidden shadow-xs">
                      {section.imageUrl ? (
                        <img
                          src={section.imageUrl}
                          alt={section.imageCaption || 'Article image slot'}
                          className="w-full h-full object-cover rounded-2xl"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="p-6">
                          <ImageIcon className="w-8 h-8 mb-2 mx-auto text-[#93A28F]" />
                          <span className="text-xs font-bold text-[#5A6659] block">Article Image</span>
                          {section.imageCaption && (
                            <span className="text-[11px] text-[#7A8877] mt-1 block">{section.imageCaption}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {section.imageCaption && (
                      <figcaption className="text-center text-xs text-[#7A8877] mt-2.5 font-medium italic">
                        {section.imageCaption}
                      </figcaption>
                    )}
                  </figure>
                );

              case 'callout':
                return (
                  <div
                    key={idx}
                    className="my-6 p-5 rounded-2xl bg-[#E5EDE2] border border-[#C5D7C2] text-[#2C382B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-[#1D231E] flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-[#E06C38] fill-[#E06C38]" />
                        {section.title || 'Studio Note'}
                      </h4>
                      <p className="text-xs text-[#3A4538] leading-relaxed">{section.content}</p>
                    </div>
                    {section.ctaText && interactive && (
                      <button
                        type="button"
                        onClick={() => {
                          if (section.ctaAction === 'shop' && onOpenShop) {
                            onOpenShop();
                          } else if (onOpenConverter) {
                            onOpenConverter();
                          }
                        }}
                        className="px-4 py-2.5 bg-[#E06C38] hover:bg-[#c95b28] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{section.ctaText}</span>
                      </button>
                    )}
                  </div>
                );

              case 'faq':
                return (
                  <div key={idx} className="my-6 space-y-3">
                    {section.faqs?.map((faq, faqIdx) => (
                      <div
                        key={faqIdx}
                        className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E8E1D2] shadow-xs"
                      >
                        <h4 className="font-bold text-sm text-[#1D231E] mb-1.5 flex items-start gap-2">
                          <HelpCircle className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                          <span>{faq.question}</span>
                        </h4>
                        <p className="text-xs text-[#4A5749] leading-relaxed pl-6">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                );

              case 'cta':
                return (
                  <div
                    key={idx}
                    className="my-8 p-6 sm:p-8 rounded-3xl bg-[#1D231E] text-white text-center space-y-4 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#E06C38]/20 rounded-full blur-2xl pointer-events-none" />
                    <h3 className="text-xl sm:text-2xl font-bold text-white relative z-10">
                      {section.title || 'Start Crafting'}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#A2B0A0] max-w-md mx-auto relative z-10 leading-relaxed">
                      {section.content}
                    </p>
                    {interactive && (
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenConverter) onOpenConverter();
                          }}
                          className="w-full sm:w-auto px-6 py-3 bg-[#E06C38] hover:bg-[#c95b28] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>{section.ctaText || 'Launch Stitchara'}</span>
                        </button>
                        {onOpenShop && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenShop();
                            }}
                            className="w-full sm:w-auto px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>Browse Kits & Supplies</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );

              default:
                return (
                  <div key={idx} className="text-sm text-[#3A4538]">
                    {section.content || section.text || ''}
                  </div>
                );
            }
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-[#7A8877] bg-white/50 rounded-2xl border border-dashed border-[#D5CDBC] my-6">
          Start typing in the editor on the left to see your formatted paragraphs, headings, lists, and embedded blocks live!
        </div>
      )}
    </article>
  );
};
