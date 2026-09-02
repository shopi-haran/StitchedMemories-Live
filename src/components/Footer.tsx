import React, { useState } from 'react';
import { Scissors, Heart, Mail, ArrowRight, Instagram, Share2, Sparkles } from 'lucide-react';

interface FooterProps {
  onOpenConverter: () => void;
  onNavigateToSection: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenConverter, onNavigateToSection }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-[#1D231E] text-[#E0E8DF] pt-16 pb-12 border-t border-[#2D382E]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-[#2D382E]">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#93A28F] text-white flex items-center justify-center">
                <Scissors className="w-5 h-5 -rotate-45" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                Stitched<span className="text-[#E06C38]">Memories</span>
              </span>
            </div>

            <p className="text-sm text-[#A2B0A0] leading-relaxed max-w-sm">
              Turn your favorite photos into custom DMC cross-stitch patterns with Stichly, our free AI-powered converter — plus expert stitching guides, custom kits, and handmade keepsakes, all in one place.
            </p>

            {/* Newsletter Subscription Box */}
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C5D3C2] block mb-2">
                Join the Crafting Newsletter
              </span>

              {subscribed ? (
                <div className="p-3 bg-[#2D382E] rounded-xl text-xs text-[#93A28F] font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#E06C38]" />
                  <span>Welcome to our cozy stitchers community!</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[#2B342C] text-white placeholder-[#7A8A78] text-xs px-4 py-3 rounded-full border border-[#3D4B3E] focus:outline-none focus:border-[#E06C38] flex-1"
                  />
                  <button
                    type="submit"
                    className="bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold px-5 py-3 rounded-full transition-colors cursor-pointer shrink-0"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#E06C38]">Navigation</h4>
            <ul className="space-y-2 text-sm text-[#A2B0A0]">
              <li>
                <button onClick={onOpenConverter} className="hover:text-white transition-colors cursor-pointer text-left">
                  Stichly - The Converter
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToSection('pricing-section')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Pricing Plans
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToSection('blog-page')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Learning Hub & Guides
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToSection('shop-page')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Marketplace
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToSection('about-page')} className="hover:text-white transition-colors cursor-pointer text-left">
                  About Us
                </button>
              </li>
              <li className="pt-2 border-t border-[#2D382E] flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8A9A88]">
                <button onClick={() => onNavigateToSection('terms')} className="hover:text-[#E06C38] transition-colors cursor-pointer text-left">
                  Terms & Conditions
                </button>
                <span>•</span>
                <button onClick={() => onNavigateToSection('privacy')} className="hover:text-[#E06C38] transition-colors cursor-pointer text-left">
                  Privacy Policy
                </button>
                <span>•</span>
                <button onClick={() => onNavigateToSection('returns')} className="hover:text-[#E06C38] transition-colors cursor-pointer text-left">
                  Return & Refund Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Community Info */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#E06C38]">Social & Community</h4>
            <p className="text-xs text-[#A2B0A0] leading-relaxed">
              Share your completed cross-stitch works using <span className="text-white font-mono">#StitchlyCrafts</span> on social media to be featured in our user gallery.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="w-9 h-9 rounded-full bg-[#2B342C] hover:bg-[#E06C38] text-white flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-[#2B342C] hover:bg-[#E06C38] text-white flex items-center justify-center transition-colors">
                <Share2 className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-[#2B342C] hover:bg-[#E06C38] text-white flex items-center justify-center transition-colors">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#7A8A78] gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-center sm:text-left">
            <p>© {new Date().getFullYear()} StitchedMemories • Stitched Memories Studio.</p>
            <div className="flex flex-wrap items-center gap-2 text-[#93A28F]">
              <button onClick={() => onNavigateToSection('terms')} className="hover:text-white transition-colors cursor-pointer">
                Terms
              </button>
              <span>•</span>
              <button onClick={() => onNavigateToSection('privacy')} className="hover:text-white transition-colors cursor-pointer">
                Privacy
              </button>
              <span>•</span>
              <button onClick={() => onNavigateToSection('returns')} className="hover:text-white transition-colors cursor-pointer">
                Returns & Refunds
              </button>
            </div>
          </div>
          <p className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-[#E06C38] fill-current" />
            <span>for cross-stitch artisans</span>
          </p>
        </div>

      </div>
    </footer>
  );
};
