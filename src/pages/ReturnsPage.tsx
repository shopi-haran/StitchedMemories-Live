import React, { useEffect } from 'react';
import { ArrowLeft, RotateCcw, FileText, CheckCircle2, AlertCircle, Truck, CreditCard, Sparkles, Mail, Scissors, Package, Shield, RefreshCw } from 'lucide-react';

interface ReturnsPageProps {
  onGoHome: () => void;
  onNavigateToSection: (sectionId: string) => void;
}

export const ReturnsPage: React.FC<ReturnsPageProps> = ({ onGoHome, onNavigateToSection }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const lastUpdatedDate = '01st September 2026';

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#1D231E]">
      
      {/* Top Banner Header */}
      <div className="bg-[#1D231E] text-white py-12 px-6 lg:px-12 border-b border-[#2D382E] relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#93A28F] hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2B342C] border border-[#3D4B3E] text-xs font-semibold text-[#E06C38] mb-2">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Store Policies</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                Return & Refund Policy
              </h1>
              <p className="text-sm text-[#A2B0A0] mt-1">
                Last updated: {lastUpdatedDate} • Stitched Memories Return, Refund, and Cancellation Terms
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigateToSection('terms')}
                className="px-3.5 py-2 rounded-full bg-[#2B342C] hover:bg-[#3A4538] text-xs font-bold text-white border border-[#3D4B3E] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#E06C38]" />
                <span>Terms</span>
              </button>
              <button
                onClick={() => onNavigateToSection('privacy')}
                className="px-3.5 py-2 rounded-full bg-[#2B342C] hover:bg-[#3A4538] text-xs font-bold text-white border border-[#3D4B3E] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-[#93A28F]" />
                <span>Privacy</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout with Sidebar Navigation */}
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Table of Contents Sticky Sidebar */}
          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-24 bg-white rounded-2xl p-5 border border-[#E8E1D2] shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7869] flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5 text-[#E06C38]" /> Policy Sections
              </h3>
              <nav className="space-y-1 text-xs text-[#5A6659]">
                <button onClick={() => scrollToAnchor('digital-patterns')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  1. Digital Patterns
                </button>
                <button onClick={() => scrollToAnchor('custom-kits')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  2. Custom Kits (Materials + Pattern)
                </button>
                <button onClick={() => scrollToAnchor('custom-stitched')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  3. Custom Stitched Products
                </button>
                <button onClick={() => scrollToAnchor('store-items')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  4. Store Items (Ready-Made)
                </button>
                <button onClick={() => scrollToAnchor('damaged-items')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  5. Damaged, Defective, or Incorrect
                </button>
                <button onClick={() => scrollToAnchor('subscriptions')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  6. Subscription Refunds
                </button>
                <button onClick={() => scrollToAnchor('how-to-request')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  7. How to Request a Return
                </button>
                <button onClick={() => scrollToAnchor('contact')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  8. Contact Us
                </button>
              </nav>

              <div className="pt-3 border-t border-[#E8E1D2] text-[11px] text-[#8A9588]">
                Need immediate help with an active order?
                <button
                  onClick={() => onNavigateToSection('contact-page')}
                  className="mt-1 block font-bold text-[#E06C38] hover:underline cursor-pointer"
                >
                  Contact Artisan Studio →
                </button>
              </div>
            </div>
          </aside>

          {/* Legal Document Body */}
          <div className="lg:col-span-8 space-y-8 text-sm leading-relaxed text-[#3D473C]">
            
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8E1D2] shadow-xs text-sm text-[#4D5A4C]">
              <p>
                This policy explains our return, refund, and cancellation terms for the different types of products and services offered by <strong>Stitched Memories</strong>.
              </p>
            </div>

            {/* 1. Digital Patterns */}
            <section id="digital-patterns" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">1</span>
                Digital Patterns
              </h2>
              <p>
                Digital pattern purchases (PDF stitch charts) are delivered instantly upon completion. Because these are digital goods delivered immediately, <strong>all digital pattern sales are final and non-refundable</strong>, except where the pattern is materially defective or fails to generate correctly, in which case contact us for a resolution or refund.
              </p>
            </section>

            {/* 2. Custom Kits (Materials + Pattern) */}
            <section id="custom-kits" className="space-y-4 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">2</span>
                Custom Kits (Materials + Pattern)
              </h2>
              
              <div className="space-y-3 text-[#4D5A4C]">
                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-1">
                  <strong className="text-[#1D231E] block text-xs uppercase tracking-wider font-bold">Before a quote is confirmed:</strong>
                  <p className="text-sm">You may cancel a custom kit request at any time before confirming payment, at no charge.</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-1">
                  <strong className="text-[#1D231E] block text-xs uppercase tracking-wider font-bold">Quote revisions:</strong>
                  <p className="text-sm">You may request up to <strong>two revisions</strong> to a submitted quote if you're not satisfied with the pricing or details. If you're still not satisfied after two revisions, you may cancel the order at no charge (provided production has not yet started).</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-2">
                  <strong className="text-[#1D231E] block text-xs uppercase tracking-wider font-bold">After payment/confirmation:</strong>
                  <p className="text-sm">Once you confirm an order and payment is made, we begin sourcing and preparing materials for your kit. Because kits are prepared specifically for your order:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm">
                    <li>Cancellations requested <strong>before your kit ships</strong> may be eligible for a partial refund, minus the cost of materials already purchased on your behalf, at our discretion.</li>
                    <li>Once a kit has <strong>shipped</strong>, it is not eligible for cancellation or refund, except in cases of damage or defect (see Section 5).</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 3. Custom Stitched Products */}
            <section id="custom-stitched" className="space-y-4 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">3</span>
                Custom Stitched Products
              </h2>
              <p>
                Custom stitched products are handmade to order and require significant time and labor (typically <strong>2–3 months</strong> depending on size, color count, and stitch complexity).
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#4D5A4C]">
                <li>You may cancel or request revisions to your quote under the same terms as custom kits (up to two revisions, free cancellation before confirmation).</li>
                <li>Once your order is <strong>confirmed and production has started</strong>, cancellation is only possible before significant stitching work has begun, and may be subject to a cancellation fee covering materials and labor already invested. Contact us as soon as possible if you need to cancel.</li>
                <li>Once a custom stitched piece is <strong>completed and shipped</strong>, it is not eligible for return or refund except in cases of damage or defect (see Section 5), since it is a bespoke, one-of-a-kind item made specifically for you.</li>
              </ul>
            </section>

            {/* 4. Store Items */}
            <section id="store-items" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">4</span>
                Store Items (Ready-Made Products)
              </h2>
              <p>For any pre-made/in-stock items purchased through our store:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#4D5A4C]">
                <li>You may request a return within <strong>7 days of delivery</strong>, provided the item is unused and in its original condition/packaging.</li>
                <li>Return shipping costs are the responsibility of the customer unless the item was damaged, defective, or incorrect.</li>
                <li>Refunds are processed within 7 business days of us receiving the returned item.</li>
              </ul>
            </section>

            {/* 5. Damaged, Defective, or Incorrect Items */}
            <section id="damaged-items" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">5</span>
                Damaged, Defective, or Incorrect Items
              </h2>
              <p>
                If any item you receive — kit, custom stitched product, or store item — arrives damaged, defective, or different from what you ordered, contact us within <strong>7 days of delivery</strong> with photos of the issue. We will offer a replacement, repair, or full refund at our discretion, at no cost to you.
              </p>
            </section>

            {/* 6. Subscription Refunds */}
            <section id="subscriptions" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">6</span>
                Subscription Refunds
              </h2>
              <p>
                Subscription payments (Pro/Studio plans) are billed in advance for the selected period (monthly or annual).
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#4D5A4C]">
                <li>You may cancel your subscription at any time; your plan will remain active until the end of the current billing period, after which it will not renew.</li>
                <li>We do not offer partial refunds for unused time within a billing period, except where required by law.</li>
              </ul>
            </section>

            {/* 7. How to Request a Return, Refund, or Cancellation */}
            <section id="how-to-request" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">7</span>
                How to Request a Return, Refund, or Cancellation
              </h2>
              <p>
                Contact us at <a href="mailto:stitchedmemoriies@gmail.com" className="font-bold text-[#E06C38] underline">stitchedmemoriies@gmail.com</a> with your order details and the reason for your request. We aim to respond within <strong>24 – 48 hours</strong>.
              </p>
            </section>

            {/* 8. Contact Us */}
            <section id="contact" className="space-y-3 bg-[#FAF6EE] p-6 sm:p-8 rounded-3xl border border-[#D5CDBC]">
              <h2 className="text-lg font-bold text-[#1D231E] flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#E06C38]" /> 8. Contact Us
              </h2>
              <div className="text-sm text-[#1D231E] space-y-1.5">
                <p><strong>Email:</strong> <a href="mailto:stitchedmemoriies@gmail.com" className="text-[#E06C38] hover:underline">stitchedmemoriies@gmail.com</a></p>
                <p><strong>Phone:</strong> <a href="tel:+940769965252" className="text-[#1D231E] hover:underline">+94 076 996 5252</a></p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};
