import React from 'react';
import { Heart, Scissors, Sparkles, Award, Users, ShieldCheck } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about-section" className="py-20 bg-[#FAF6EE] border-t border-[#E8E1D2]/80 relative overflow-hidden text-[#1D231E]">
      {/* Decorative subtle background elements */}
      <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-96 h-96 bg-[#93A28F]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 top-10 w-80 h-80 bg-[#E06C38]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5EDE2] text-[#3D5239] text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#E06C38]" />
            <span>Our Story & Craft Passion</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1D231E] leading-tight mb-4 font-sans">
            Preserving Life's Warmest Moments, <br className="hidden sm:inline" />
            <span className="font-['Segoe_Script','Bradley_Hand','Comic_Sans_MS',cursive] text-[#E06C38] font-normal">One Stitch at a Time</span>
          </h2>

          <p className="text-base sm:text-lg text-[#4A544A] leading-relaxed">
            Stitchly was born out of a simple love for handcrafts and storytelling. We bridge the gap between digital photography and timeless physical needlework.
          </p>
        </div>

        {/* 2-Column Story Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          
          {/* Left Column: Visual Card / Quote */}
          <div className="lg:col-span-5 bg-white border border-[#E8E1D2] rounded-3xl p-8 sm:p-10 shadow-lg relative">
            <div className="w-12 h-12 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center mb-6">
              <Scissors className="w-6 h-6 -rotate-45" />
            </div>

            <blockquote className="text-lg font-serif italic text-[#2C352B] leading-relaxed mb-6">
              "Every cross-stitch pattern is more than a grid of numbers — it is a tactile memory. Whether it is a beloved rescue pet or a wedding vows moment, holding needle and thread brings those memories to life."
            </blockquote>

            <div className="flex items-center gap-3 pt-4 border-t border-[#E8E1D2]">
              <div className="w-10 h-10 rounded-full bg-[#93A28F] text-white font-bold flex items-center justify-center text-sm">
                SM
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1D231E]">Team Stitched Memories</h4>
              </div>
            </div>
          </div>

          {/* Right Column: Mission & Core Values */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-[#1D231E]">Our Mission</h3>
              <p className="text-sm text-[#4A544A] leading-relaxed">
                We empower crafters of all skill levels to create stunning, museum-quality cross-stitch heirlooms. Using our smart algorithm, photos are accurately translated into DMC and Anchor thread palettes without losing subtle fur details, soft lighting, or facial expressions.
              </p>
            </div>

            {/* 3 Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="bg-[#E5EDE2]/60 border border-[#D0DCD0] rounded-2xl p-5">
                <Award className="w-6 h-6 text-[#E06C38] mb-2" />
                <h4 className="text-xs font-bold text-[#1D231E] uppercase tracking-wider mb-1">
                  Precision Palette
                </h4>
                <p className="text-xs text-[#4A544A] leading-normal">
                  Color-matched across 450+ DMC and Anchor stranded cotton threads.
                </p>
              </div>

              <div className="bg-[#E5EDE2]/60 border border-[#D0DCD0] rounded-2xl p-5">
                <Users className="w-6 h-6 text-[#3D5239] mb-2" />
                <h4 className="text-xs font-bold text-[#1D231E] uppercase tracking-wider mb-1">
                  Made for All
                </h4>
                <p className="text-xs text-[#4A544A] leading-normal">
                  Intuitive PDF charts built for absolute beginners to expert artisans.
                </p>
              </div>

              <div className="bg-[#E5EDE2]/60 border border-[#D0DCD0] rounded-2xl p-5">
                <ShieldCheck className="w-6 h-6 text-[#E06C38] mb-2" />
                <h4 className="text-xs font-bold text-[#1D231E] uppercase tracking-wider mb-1">
                  Quality Guaranteed
                </h4>
                <p className="text-xs text-[#4A544A] leading-normal">
                  Crisp symbols, high-contrast grids, and complete DMC floss usage keys.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
