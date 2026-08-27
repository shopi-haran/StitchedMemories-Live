import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const BackToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      // Do not display Back to Top inside the Photo Converter Studio App modal
      const converterModal = document.getElementById('photo-converter-modal');
      if (converterModal) {
        setIsVisible(false);
        return;
      }

      // Check main window scroll
      if (window.scrollY > 200) {
        setIsVisible(true);
        return;
      }

      // Check other scrollable containers (e.g. ArticleModal or other page containers)
      const scrollableElements = document.querySelectorAll('.overflow-y-auto, .overflow-auto, [class*="overflow-y"]');
      for (let i = 0; i < scrollableElements.length; i++) {
        const el = scrollableElements[i];
        if (el.scrollTop > 150) {
          setIsVisible(true);
          return;
        }
      }

      setIsVisible(false);
    };

    // Capture scroll events anywhere in the document
    document.addEventListener('scroll', checkScroll, { capture: true, passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    // Initial check
    checkScroll();

    return () => {
      document.removeEventListener('scroll', checkScroll, { capture: true });
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scrollToTop = () => {
    // Scroll main window to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

    // Also scroll other modal/div scroll containers to top (excluding converter modal)
    const converterModal = document.getElementById('photo-converter-modal');
    const scrollableElements = document.querySelectorAll('.overflow-y-auto, .overflow-auto, [class*="overflow-y"]');
    scrollableElements.forEach((el) => {
      if (converterModal && converterModal.contains(el)) return;
      if (el.scrollTop > 0) {
        el.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    });
  };

  return (
    <button
      id="back-to-top-btn"
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={`fixed bottom-6 right-6 z-[9999] p-3.5 rounded-full bg-[#E06C38] text-white shadow-2xl shadow-[#E06C38]/40 hover:bg-[#C85928] hover:scale-110 active:scale-95 transition-all duration-300 ease-in-out flex items-center justify-center cursor-pointer border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:ring-offset-2 ${
        isVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-5 h-5 stroke-[2.5]" />
    </button>
  );
};
