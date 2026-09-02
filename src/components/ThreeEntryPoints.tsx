import React from 'react';
import { Sparkles, BookOpen, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ThreeEntryPointsProps {
  onOpenConverter: () => void;
  onNavigateToBlog: () => void;
  onNavigateToShop: () => void;
}

export const ThreeEntryPoints: React.FC<ThreeEntryPointsProps> = ({ 
  onOpenConverter, 
  onNavigateToBlog,
  onNavigateToShop
}) => {
  return (
    <section id="entry-points" className="py-20 bg-[#F5EFE4] relative border-t border-[#E8E1D2]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-[#E06C38] bg-[#E06C38]/10 px-3 py-1 rounded-full inline-block mb-3">
            Experience the Platform
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1D231E]">
            Explore the Ways to Begin Your Cross-Stiching Journy
          </h2>
          <p className="text-[#5A6659] text-base mt-3">
            Whether you want to transform a personal photo, learn cross-stitch techniques, or collect curated kits, we have you covered.
          </p>
        </div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Entry Point 1: The Converter */}
          <div className="bg-white/70 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E06C38]/5 rounded-bl-full pointer-events-none" />
            
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#E06C38] text-white flex items-center justify-center shadow-lg shadow-[#E06C38]/20 mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-[#E06C38]">Stitchara</span>
              <h3 className="text-2xl font-bold text-[#1D231E] mt-1 mb-3">
                The Converter
              </h3>

              <p className="text-sm text-[#5A6659] leading-relaxed mb-6">
                Turn any photograph into a custom DMC/Anchor cross-stitch pattern. Choose your cloth count, color limits, and download a printable PDF pattern chart instantly.
              </p>

              <ul className="space-y-2.5 text-xs text-[#3A4538] mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F]" />
                  <span>Exact DMC/Anchor floss color matching</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F]" />
                  <span>High-resolution PDF chart export</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F]" />
                  <span>Free instant live preview</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenConverter}
              className="w-full py-3.5 px-6 rounded-full bg-[#1D231E] hover:bg-[#323D34] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Try for Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Entry Point 2: Browse Blog */}
          <div className="bg-white/70 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#93A28F]/10 rounded-bl-full pointer-events-none" />
            
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#93A28F] text-white flex items-center justify-center shadow-lg shadow-[#93A28F]/20 mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-[#93A28F]">Learning Hub</span>
              <h3 className="text-2xl font-bold text-[#1D231E] mt-1 mb-3">
                Browse Blog
              </h3>

              <p className="text-sm text-[#5A6659] leading-relaxed mb-6">
                In-depth articles, fabric selection guides, bobbin storage tips, and tutorials written by experienced embroiderers to elevate your stitches.
              </p>

              <ul className="space-y-2.5 text-xs text-[#3A4538] mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F]" />
                  <span>Aida cloth & linen comparison guides</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F]" />
                  <span>Thread organization techniques</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F]" />
                  <span>Framing & finishing tutorials</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onNavigateToBlog}
              className="w-full py-3.5 px-6 rounded-full bg-[#FAF6EE] hover:bg-[#EFE7D8] text-[#1D231E] font-medium text-sm flex items-center justify-center gap-2 border border-[#DCD2C0] transition-colors cursor-pointer"
            >
              <span>Explore Articles</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Entry Point 3: Marketplace */}
          <div className="bg-white/70 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3D5239]/10 rounded-bl-full pointer-events-none" />
            <div className="absolute top-4 right-4 px-3 py-1 bg-[#E8EFE5] text-[#3D5239] text-[11px] font-bold rounded-full border border-[#C5D3C2] shadow-xs">
              Custom Orders
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#3D5239] text-white flex items-center justify-center shadow-lg shadow-[#3D5239]/20 mb-6 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-7 h-7" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-[#3D5239]">Marketplace</span>
              <h3 className="text-2xl font-bold text-[#1D231E] mt-1 mb-3">
                Custom Orders & Kits
              </h3>

              <p className="text-sm text-[#5A6659] leading-relaxed mb-6">
                Turn your personal photograph into an authentic physical stitching kit delivered to your doorstep, or commission a finished heirloom piece handcrafted by our artisan team.
              </p>

              <ul className="space-y-2.5 text-xs text-[#3A4538] mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F]" />
                  <span>Custom DIY kits with DMC floss & Zweigart Aida</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F]" />
                  <span>Assisted kit requests with full studio support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F]" />
                  <span>Fully finished, framed hand-stitched keepsakes</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onNavigateToShop}
              className="w-full py-3.5 px-6 rounded-full bg-[#1D231E] hover:bg-[#323D34] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
