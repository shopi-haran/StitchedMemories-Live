import React from 'react';
import { Star, Quote, Heart, CheckCircle2, Award, Sparkles } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  rating: number;
  project: string;
  comment: string;
  date: string;
  badge: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    role: 'Stitcher of 8 years • Austin, TX',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    rating: 5,
    project: 'Grandparents 50th Anniversary Portrait (18-Count Aida)',
    comment: 'I converted a grainy 1970s wedding photo for my parents’ golden anniversary. The DMC color matching was so shockingly accurate that my grandmother cried when she unwrapped the framed piece. The PDF chart with floss keys made thread sourcing a breeze!',
    date: 'July 2026',
    badge: 'Verified Master Pattern'
  },
  {
    id: '2',
    name: 'David Miller',
    role: 'Hobbyist Embroiderer • Portland, OR',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    rating: 5,
    project: 'Rescue Golden Retriever Portrait (14-Count Aida)',
    comment: 'As a beginner, I was worried about complex confetti stitching. The color palette slider allowed me to limit the pattern to 25 DMC shades without losing fur texture detail. Stitched Memories is hands down the best photo converter I have used.',
    date: 'June 2026',
    badge: 'Verified Pattern Download'
  },
  {
    id: '3',
    name: 'Amara Okafor',
    role: 'Needlework Artist • Chicago, IL',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    rating: 5,
    project: 'Family Vacation in Amalfi Coast (28-Count Linen)',
    comment: 'The contrast enhancement feature before exporting the pattern is genius. It preserved the vibrant ocean blues and terracotta roof tiles perfectly. Every DMC thread code matched the physical skeins in my thread stash.',
    date: 'May 2026',
    badge: 'Verified Pro Member'
  }
];

export const TestimonialsSection: React.FC = () => {
  return (
    <section id="testimonials-section" className="py-20 bg-white border-y border-[#E8E1D2]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#93A28F] bg-[#E8EFE5] px-3.5 py-1.5 rounded-full inline-block mb-3 border border-[#D0DCD0]">
            Community Reviews & Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1D231E] tracking-tight">
            Loved by 14,000+ Cross-Stitchers Worldwide
          </h2>
          <p className="text-sm text-[#5A6659] mt-3 leading-relaxed">
            Read how embroiderers, gift givers, and needlework artists preserve precious memories into hand-stitched heirlooms.
          </p>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14 bg-[#FAF6EE] border border-[#E8E1D2] rounded-3xl p-6 shadow-xs text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#E06C38] flex items-center justify-center gap-1">
              <span>4.95</span>
              <Star className="w-5 h-5 fill-[#E06C38] text-[#E06C38]" />
            </div>
            <span className="text-xs font-semibold text-[#5A6659] mt-1 block">Average Rating</span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1D231E]">14,200+</div>
            <span className="text-xs font-semibold text-[#5A6659] mt-1 block">Patterns Converted</span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1D231E]">99.4%</div>
            <span className="text-xs font-semibold text-[#5A6659] mt-1 block">DMC Color Accuracy</span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#3D5239]">500+</div>
            <span className="text-xs font-semibold text-[#5A6659] mt-1 block">DMC Skein Codes</span>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.id}
              className="bg-[#FAF6EE] rounded-3xl p-8 border border-[#E8E1D2] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group"
            >
              <div>
                {/* Header with Star Rating & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#E06C38] text-[#E06C38]" />
                    ))}
                  </div>

                  <span className="text-[10px] font-bold text-[#3D5239] bg-[#E8EFE5] px-2.5 py-1 rounded-full border border-[#C5D3C2] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#2E7D32]" />
                    <span>{item.badge}</span>
                  </span>
                </div>

                {/* Project Title */}
                <div className="mb-4 pb-3 border-b border-[#E8E1D2]">
                  <span className="text-[11px] font-bold text-[#E06C38] uppercase tracking-wider block mb-0.5">
                    Stitched Project
                  </span>
                  <p className="text-xs font-bold text-[#1D231E]">{item.project}</p>
                </div>

                {/* Comment */}
                <div className="relative mb-6">
                  <Quote className="w-8 h-8 text-[#E06C38]/15 absolute -top-2 -left-2 pointer-events-none" />
                  <p className="text-xs text-[#3A4538] leading-relaxed relative z-10 italic">
                    "{item.comment}"
                  </p>
                </div>
              </div>

              {/* Author Footer */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#E8E1D2]">
                <img
                  src={item.avatarUrl}
                  alt={item.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#D5CDBC]"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-xs font-bold text-[#1D231E]">{item.name}</h4>
                  <p className="text-[11px] text-[#6B7869]">{item.role}</p>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Guarantee Banner */}
        <div className="mt-12 bg-[#1D231E] text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E06C38]/20 text-[#E06C38] flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">100% DMC Thread Match Guarantee</h3>
              <p className="text-xs text-[#A2B0A0] mt-0.5">
                If your pattern floss key doesn’t match physical DMC floss skeins, our studio artisans re-tune your pattern free of charge.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-[#E06C38] flex items-center gap-1.5 bg-white/10 px-4 py-2 rounded-full">
              <Sparkles className="w-4 h-4" />
              <span>Studio Quality Assured</span>
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
