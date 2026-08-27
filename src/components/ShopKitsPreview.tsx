import React from 'react';
import { ShoppingBag, Sparkles, Package, ArrowRight } from 'lucide-react';

interface ShopKitsPreviewProps {
  onNavigateToShopPage?: () => void;
}

export const ShopKitsPreview: React.FC<ShopKitsPreviewProps> = ({ onNavigateToShopPage }) => {
  return (
    <section id="shop-section" className="py-20 bg-[#FAF6EE] border-t border-[#E8E1D2]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#70806E] bg-[#E8EFE5] px-3 py-1 rounded-full mb-3 border border-[#D0DCD0]">
              <Package className="w-3.5 h-3.5 text-[#556653]" />
              <span>Custom Stitch Studio</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1D231E]">
              Custom Order Marketplace
            </h2>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 mt-3 md:mt-0">
            <p className="text-sm text-[#5A6659] max-w-md text-left md:text-right">
              Request bespoke cross-stitch kits or commission our master artisans to stitch and frame an heirloom piece for you.
            </p>
            {onNavigateToShopPage && (
              <button
                onClick={onNavigateToShopPage}
                className="text-xs font-bold text-[#E06C38] hover:underline flex items-center gap-1 cursor-pointer mt-1"
              >
                <span>Open Marketplace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Order Preview Callout */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8E1D2] shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E06C38]/10 text-[#E06C38] text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quote-Based Ordering</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#1D231E] mb-3">
              Custom Kits & Finished Hand-Stitched Keepsakes
            </h3>
            <p className="text-sm text-[#5A6659] leading-relaxed mb-6">
              Turn your photo into a tailored stitching kit delivered to your door, or have our team stitch and museum-frame your heirloom piece for you.
            </p>
            {onNavigateToShopPage && (
              <button
                onClick={onNavigateToShopPage}
                className="px-6 py-3 rounded-full bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <ShoppingBag className="w-4 h-4 text-[#93A28F]" />
                <span>Explore Marketplace</span>
              </button>
            )}
          </div>

          <div className="w-full md:w-80 bg-[#FAF6EE] rounded-2xl p-6 border border-[#E8E1D2] flex flex-col gap-3 text-xs text-[#4A544A]">
            <div className="font-bold text-sm text-[#1D231E] pb-2 border-b border-[#E8E1D2]">
              Marketplace Offerings:
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E06C38]" />
              <span><strong>Custom Kits:</strong> DIY kit delivered with DMC floss</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3D5239]" />
              <span><strong>Custom Stitched:</strong> We stitch and frame it for you</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5A6659]" />
              <span><strong>Assisted Requests:</strong> Full studio support</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

