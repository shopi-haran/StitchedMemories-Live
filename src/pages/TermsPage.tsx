import React, { useEffect } from 'react';
import { ArrowLeft, Shield, FileText, CheckCircle2, AlertCircle, Truck, RotateCcw, CreditCard, Sparkles, Mail, Scissors } from 'lucide-react';

interface TermsPageProps {
  onGoHome: () => void;
  onNavigateToSection: (sectionId: string) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onGoHome, onNavigateToSection }) => {
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
                <FileText className="w-3.5 h-3.5" />
                <span>Legal & Policies</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                Terms & Conditions
              </h1>
              <p className="text-sm text-[#A2B0A0] mt-1">
                Last updated: {lastUpdatedDate} • Stitched Memories User Agreement & Terms
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigateToSection('privacy')}
                className="px-3.5 py-2 rounded-full bg-[#2B342C] hover:bg-[#3A4538] text-xs font-bold text-white border border-[#3D4B3E] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-[#93A28F]" />
                <span>Privacy</span>
              </button>
              <button
                onClick={() => onNavigateToSection('returns')}
                className="px-3.5 py-2 rounded-full bg-[#2B342C] hover:bg-[#3A4538] text-xs font-bold text-white border border-[#3D4B3E] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#E06C38]" />
                <span>Returns</span>
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
                <Scissors className="w-3.5 h-3.5 text-[#E06C38]" /> Table of Contents
              </h3>
              <nav className="space-y-1 text-xs text-[#5A6659]">
                <button onClick={() => scrollToAnchor('about-us')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  1. About Us
                </button>
                <button onClick={() => scrollToAnchor('eligibility')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  2. Eligibility
                </button>
                <button onClick={() => scrollToAnchor('accounts')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  3. Accounts
                </button>
                <button onClick={() => scrollToAnchor('stitchly')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  4. Stichly - The Photo Converter
                </button>
                <button onClick={() => scrollToAnchor('orders-quotes')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  5. Orders & Quotes
                </button>
                <button onClick={() => scrollToAnchor('subscriptions')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  6. Subscriptions
                </button>
                <button onClick={() => scrollToAnchor('payments')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  7. Payments
                </button>
                <button onClick={() => scrollToAnchor('shipping')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  8. Shipping & Delivery
                </button>
                <button onClick={() => scrollToAnchor('ip')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  9. Intellectual Property
                </button>
                <button onClick={() => scrollToAnchor('prohibited')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  10. Prohibited Uses
                </button>
                <button onClick={() => scrollToAnchor('liability')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  11. Limitation of Liability
                </button>
                <button onClick={() => scrollToAnchor('changes')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  12. Changes to Service or Terms
                </button>
                <button onClick={() => scrollToAnchor('governing-law')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  13. Governing Law
                </button>
                <button onClick={() => scrollToAnchor('contact')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  14. Contact Us
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
                Welcome to <strong>Stitched Memories</strong>. These Terms & Conditions ("Terms") govern your use of our website, mobile application, and services (collectively, the "Service"). By creating an account or using our Service, you agree to these Terms.
              </p>
            </div>

            {/* 1. About Us */}
            <section id="about-us" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">1</span>
                About Us
              </h2>
              <p>
                Stitched Memories provides photo-to-cross-stitch-pattern conversion, custom stitching kits, custom handmade stitched products, and related craft supplies, operated from <strong>Sri Lanka</strong>.
              </p>
            </section>

            {/* 2. Eligibility */}
            <section id="eligibility" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">2</span>
                Eligibility
              </h2>
              <p>
                You must be at least 18 years old, or the age of majority in your jurisdiction, to create an account and make purchases. If you are under this age, you may use the Service only with the involvement of a parent or guardian.
              </p>
            </section>

            {/* 3. Accounts */}
            <section id="accounts" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">3</span>
                Accounts
              </h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately if you suspect unauthorized use of your account.
              </p>
            </section>

            {/* 4. Stichly - The Photo Converter */}
            <section id="stitchly" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">4</span>
                Stichly - The Photo Converter
              </h2>
              <p>
                Our converter tool analyzes photos you upload to generate cross-stitch pattern suggestions (color mapping, stitch counts, and grid layouts). You retain ownership of any photos you upload. By uploading a photo, you confirm that you own the rights to it, or have permission to use it, and that it does not infringe any third party's rights.
              </p>
              <p className="text-xs text-[#5A6659]">
                Guest users may use the converter without an account; guest-generated patterns are not saved to our servers and exist only in your browser session.
              </p>
            </section>

            {/* 5. Orders & Quotes */}
            <section id="orders-quotes" className="space-y-4 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">5</span>
                Orders & Quotes
              </h2>
              
              <div className="space-y-3 text-[#4D5A4C]">
                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-1">
                  <strong className="text-[#1D231E] block text-xs uppercase tracking-wider font-bold">Custom Kits & Custom Stitched Products</strong>
                  <p className="text-sm">These are quote-based: you submit a request (photo, size, color preferences, delivery details), and we provide an itemized price quote based on materials, labor, and delivery. You may accept the quote, request up to <strong>two revisions</strong>, or cancel your request at no charge before confirming payment.</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-1">
                  <strong className="text-[#1D231E] block text-xs uppercase tracking-wider font-bold">Pricing</strong>
                  <p className="text-sm">All prices are shown in LKR/USD and are subject to change. Quoted prices for confirmed orders will be honored as quoted.</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-1">
                  <strong className="text-[#1D231E] block text-xs uppercase tracking-wider font-bold">Production Time</strong>
                  <p className="text-sm">Custom stitched products typically take <strong>2–3 months</strong> to complete, depending on size, color count, and stitch complexity. Estimated timeframes are not guaranteed delivery dates.</p>
                </div>
              </div>
            </section>

            {/* 6. Subscriptions */}
            <section id="subscriptions" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">6</span>
                Subscriptions
              </h2>
              <p>
                We offer Free, Pro, and Studio subscription tiers with different feature access and pricing, billed monthly or annually through our payment processor, <strong>PayHere</strong>. Subscriptions renew automatically unless cancelled before the renewal date. See our Return & Refund Policy for cancellation terms.
              </p>
            </section>

            {/* 7. Payments */}
            <section id="payments" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">7</span>
                Payments
              </h2>
              <p>
                All payments are processed securely through <strong>PayHere</strong>. We do not store your full payment card details. By making a payment, you agree to PayHere's applicable terms in addition to ours.
              </p>
            </section>

            {/* 8. Shipping & Delivery */}
            <section id="shipping" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">8</span>
                Shipping & Delivery
              </h2>
              <p>
                Delivery timeframes and charges vary by product type and destination and will be communicated at the time of quote or checkout. Risk of loss for physical products passes to you upon delivery to the shipping carrier, except where required otherwise by applicable law.
              </p>
            </section>

            {/* 9. Intellectual Property */}
            <section id="ip" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">9</span>
                Intellectual Property
              </h2>
              <p>
                The Stitched Memories name, logo, website design, and pattern-generation technology — including Stichly, our proprietary photo-to-cross-stitch pattern converter — are our property or licensed to us and may not be copied, reverse-engineered, or used without our permission. You retain rights to your own uploaded photos and any patterns generated specifically for your personal use through Stichly.
              </p>
            </section>

            {/* 10. Prohibited Uses */}
            <section id="prohibited" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">10</span>
                Prohibited Uses
              </h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#4D5A4C]">
                <li>Upload photos you do not have the rights to use</li>
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to interfere with, hack, or disrupt the Service</li>
                <li>Resell or redistribute generated patterns commercially without our written permission</li>
              </ul>
            </section>

            {/* 11. Limitation of Liability */}
            <section id="liability" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">11</span>
                Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, Stitched Memories is not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability for any claim relating to the Service is limited to the amount you paid for the specific order or subscription giving rise to the claim.
              </p>
            </section>

            {/* 12. Changes to the Service or Terms */}
            <section id="changes" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">12</span>
                Changes to the Service or Terms
              </h2>
              <p>
                We may update these Terms from time to time; continued use of the Service after changes constitutes acceptance of the revised Terms. We may also modify or discontinue features of the Service at any time.
              </p>
            </section>

            {/* 13. Governing Law */}
            <section id="governing-law" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">13</span>
                Governing Law
              </h2>
              <p>
                These Terms are governed by the laws of <strong>Sri Lanka</strong>, without regard to conflict of law principles.
              </p>
            </section>

            {/* 14. Contact Us */}
            <section id="contact" className="space-y-3 bg-[#FAF6EE] p-6 sm:p-8 rounded-3xl border border-[#D5CDBC]">
              <h2 className="text-lg font-bold text-[#1D231E] flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#E06C38]" /> 14. Contact Us
              </h2>
              <p className="text-xs text-[#5A6659]">
                If you have questions about these Terms, contact us at:
              </p>
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
