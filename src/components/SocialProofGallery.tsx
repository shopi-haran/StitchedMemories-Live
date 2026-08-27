import React, { useState } from 'react';
import { GALLERY_ITEMS } from '../data/mockData';
import { Sparkles, Heart, Clock, Layers, Eye } from 'lucide-react';

export const SocialProofGallery: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string>(GALLERY_ITEMS[0].id);

  return (
    <section className="py-20 bg-[#FAF6EE] border-t border-[#E8E1D2]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#93A28F] bg-[#93A28F]/15 px-3 py-1 rounded-full inline-block mb-3">
              Community Gallery & Social Proof
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1D231E]">
              From Family Photos to Hand-Stitched Heirlooms
            </h2>
          </div>
          <p className="text-sm text-[#5A6659] max-w-md mt-3 md:mt-0">
            Over 14,000 memories converted into DMC cross-stitch patterns by our growing community of embroiderers worldwide.
          </p>
        </div>

        {/* Gallery Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {GALLERY_ITEMS.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`bg-white rounded-3xl overflow-hidden border-2 transition-all duration-300 shadow-sm hover:shadow-lg cursor-pointer ${
                activeItem === item.id ? 'border-[#E06C38] ring-2 ring-[#E06C38]/20' : 'border-[#E8E1D2]'
              }`}
            >
              {/* Image Comparison Container */}
              <div className="relative aspect-[4/3] bg-[#F5EFE4] overflow-hidden group">
                {/* Stitched Output Image */}
                <img
                  src={item.stitchedImage}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />

                {/* Original Photo Inset Overlay */}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-white/80 shadow-md flex items-center gap-2">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#DCD2C0]">
                    <img src={item.originalImage} alt="Original photo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="pr-2">
                    <span className="text-[10px] font-bold text-[#1D231E] block">Original Photo</span>
                    <span className="text-[9px] text-[#6B7869] block">Source file</span>
                  </div>
                </div>

                <div className="absolute top-3 right-3 bg-[#1D231E]/80 text-white text-[10px] font-medium px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Interactive Result</span>
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#1D231E] truncate">{item.title}</h3>
                  <span className="text-xs font-semibold text-[#E06C38]">{item.author}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#F0EBE1] text-center text-[11px] text-[#4A544A]">
                  <div className="bg-[#FAF6EE] p-2 rounded-xl">
                    <span className="block font-bold text-[#1D231E]">{item.stitchesCount}</span>
                    <span className="text-[9px] text-[#7A8877]">Grid Size</span>
                  </div>
                  <div className="bg-[#FAF6EE] p-2 rounded-xl">
                    <span className="block font-bold text-[#1D231E]">{item.colorsCount} DMC</span>
                    <span className="text-[9px] text-[#7A8877]">Colors</span>
                  </div>
                  <div className="bg-[#FAF6EE] p-2 rounded-xl">
                    <span className="block font-bold text-[#1D231E]">{item.timeSpent}</span>
                    <span className="text-[9px] text-[#7A8877]">Craft Time</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
