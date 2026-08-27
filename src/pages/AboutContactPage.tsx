import React, { useEffect } from 'react';
import { AboutSection } from '../components/AboutSection';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { ContactSection } from '../components/ContactSection';
import { ArrowLeft, Sparkles, MessageSquare, Info, Heart } from 'lucide-react';

interface AboutContactPageProps {
  onGoHome: () => void;
  onOpenConverter: () => void;
  scrollToSection?: 'about' | 'contact';
}

export const AboutContactPage: React.FC<AboutContactPageProps> = ({
  onGoHome,
  onOpenConverter,
  scrollToSection,
}) => {
  useEffect(() => {
    if (scrollToSection === 'contact') {
      const el = document.getElementById('contact-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [scrollToSection]);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#1D231E]">
      
      {/* Top Banner / Breadcrumb Bar */}
      <div className="bg-[#1D231E] text-white py-12 px-6 lg:px-12 border-b border-[#2D382E] relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <button
              onClick={onGoHome}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#93A28F] hover:text-white mb-3 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
            
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>About Us & Contact Studio</span>
              <Sparkles className="w-6 h-6 text-[#E06C38]" />
            </h1>
            <p className="text-sm text-[#A2B0A0] mt-1 max-w-xl">
              Discover the story behind StitchedMemories and connect directly with our San Francisco embroidery artisans.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('about-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 rounded-full bg-[#2B342C] hover:bg-[#3A4538] text-xs font-bold text-white border border-[#3D4B3E] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5 text-[#E06C38]" />
              <span>Our Story</span>
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('contact-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 rounded-full bg-[#E06C38] hover:bg-[#d05c28] text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Send Message</span>
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 w-96 h-96 bg-[#E06C38]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* About Us Section */}
      <AboutSection />

      {/* Community Testimonials Section */}
      <TestimonialsSection />

      {/* Contact Us Section */}
      <ContactSection />

      {/* Bottom CTA Banner */}
      <div className="py-16 bg-[#E8EFE5] border-t border-[#D0DCD0] text-center">
        <div className="max-w-2xl mx-auto px-6">
          <Heart className="w-10 h-10 text-[#E06C38] mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-[#1D231E] mb-2">
            Ready to turn your photograph into needlework?
          </h3>
          <p className="text-xs text-[#556653] mb-6">
            Test our instant DMC thread photo converter tool with any portrait or pet photo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenConverter}
              className="px-6 py-3 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Stitchly</span>
            </button>

            <button
              onClick={onGoHome}
              className="px-6 py-3 bg-white hover:bg-[#F2EFE8] text-[#1D231E] text-xs font-bold rounded-full border border-[#D5CDBC] transition-all cursor-pointer"
            >
              Return to Home Page
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
