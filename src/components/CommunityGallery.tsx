import React from 'react';
import { Instagram, Camera, Sparkles, Heart, ExternalLink, Scissors } from 'lucide-react';

export interface CommunityPost {
  id: string;
  authorName: string;
  handle?: string;
  imageUrl: string;
  caption?: string;
  projectDetails?: string;
  instagramUrl?: string;
}

interface CommunityGalleryProps {
  posts?: CommunityPost[];
  className?: string;
}

export const CommunityGallery: React.FC<CommunityGalleryProps> = ({
  posts = [],
  className = '',
}) => {
  const hasPosts = posts.length > 0;

  // Placeholder slots to display when no real submissions exist yet
  const placeholderSlots = [
    { id: 'slot-1', title: 'Wedding & Anniversary Keepsake', count: '18-Count Aida' },
    { id: 'slot-2', title: 'Pet Portrait Needlework', count: '14-Count Aida' },
    { id: 'slot-3', title: 'Landscape & Travel Memory', count: '28-Count Linen' },
    { id: 'slot-4', title: 'Vintage Family Heirloom', count: '16-Count Aida' },
  ];

  return (
    <section id="community-gallery" className={`py-20 bg-white border-t border-[#E8E1D2] ${className}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#70806E] bg-[#E8EFE5] px-3.5 py-1.5 rounded-full mb-3 border border-[#D0DCD0]">
            <Heart className="w-3.5 h-3.5 text-[#E06C38] fill-[#E06C38]" />
            <span>Community Gallery</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1D231E] tracking-tight">
            Crafted by Stitchers Worldwide
          </h2>
          <p className="text-sm text-[#5A6659] mt-3 leading-relaxed">
            See how makers and artisans bring photo patterns to life with needle, thread, and fabric.
          </p>
        </div>

        {/* Invitation Banner */}
        <div className="mb-12 bg-gradient-to-r from-[#FAF6EE] via-[#F4EFE6] to-[#E8EFE5] border border-[#E8E1D2] rounded-3xl p-8 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E06C38]/10 text-[#E06C38] text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Get Featured in Our Studio Showcase</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1D231E] tracking-tight mb-2">
                Be one of our first featured stitchers!
              </h3>
              <p className="text-sm text-[#5A6659] leading-relaxed">
                Share your finished cross-stitch piece using <span className="font-bold text-[#1D231E] font-mono">#StitcharaCrafts</span> on Instagram and we'll feature it right here.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-full bg-[#1D231E] hover:bg-[#2B342C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Instagram className="w-4 h-4 text-[#E06C38]" />
                <span>Tag #StitcharaCrafts on Instagram</span>
                <ExternalLink className="w-3 h-3 text-[#93A28F]" />
              </a>
            </div>
          </div>

          {/* Subtle Decorative Backdrop Elements */}
          <div className="absolute right-[-40px] top-[-40px] w-48 h-48 bg-[#E06C38]/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Community Grid */}
        {hasPosts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-[#FAF6EE] border border-[#E8E1D2] rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col"
              >
                <div className="aspect-square relative overflow-hidden bg-[#EAE3D4]">
                  <img
                    src={post.imageUrl}
                    alt={post.caption || 'Community cross stitch project'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {post.projectDetails && (
                    <span className="absolute bottom-3 left-3 bg-[#1D231E]/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                      {post.projectDetails}
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    <h4 className="text-sm font-bold text-[#1D231E]">{post.authorName}</h4>
                    {post.handle && (
                      <p className="text-xs text-[#70806E] font-medium">{post.handle}</p>
                    )}
                    {post.caption && (
                      <p className="text-xs text-[#5A6659] mt-2 line-clamp-2">{post.caption}</p>
                    )}
                  </div>
                  {post.instagramUrl && (
                    <a
                      href={post.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#E06C38] hover:underline mt-4"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                      <span>View on Instagram</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Placeholder Grid: 4 stylish dashed slots demonstrating where photos appear */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {placeholderSlots.map((slot, index) => (
              <div
                key={slot.id}
                className="bg-[#FAF6EE]/50 border-2 border-dashed border-[#D5CDBC] rounded-3xl p-6 flex flex-col items-center justify-center text-center min-h-[300px] transition-all hover:border-[#93A28F] hover:bg-[#FAF6EE] group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8E1D2] flex items-center justify-center text-[#93A28F] mb-4 shadow-xs group-hover:scale-110 group-hover:text-[#E06C38] transition-all">
                  {index % 2 === 0 ? (
                    <Camera className="w-6 h-6" />
                  ) : (
                    <Scissors className="w-6 h-6 -rotate-45" />
                  )}
                </div>

                <span className="text-[10px] font-bold uppercase tracking-widest text-[#93A28F] bg-[#E8EFE5] px-2.5 py-0.5 rounded-full border border-[#D0DCD0] mb-2">
                  Featured Slot #{index + 1}
                </span>

                <h4 className="text-sm font-bold text-[#1D231E] mb-1">
                  {slot.title}
                </h4>

                <p className="text-xs text-[#70806E] mb-4">
                  {slot.count}
                </p>

                <div className="mt-auto pt-3 border-t border-[#E8E1D2]/80 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8A9A88]">
                  <Sparkles className="w-3.5 h-3.5 text-[#E06C38]" />
                  <span>Coming soon • Share yours!</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
