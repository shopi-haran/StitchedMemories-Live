import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Lock, Eye, Database, FileCheck, CheckCircle2, Mail, Scissors, Server, RotateCcw } from 'lucide-react';

interface PrivacyPageProps {
  onGoHome: () => void;
  onNavigateToSection: (sectionId: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onGoHome, onNavigateToSection }) => {
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2B342C] border border-[#3D4B3E] text-xs font-semibold text-[#93A28F] mb-2">
                <Shield className="w-3.5 h-3.5 text-[#E06C38]" />
                <span>Security & Trust</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                Privacy Policy
              </h1>
              <p className="text-sm text-[#A2B0A0] mt-1">
                Last updated: {lastUpdatedDate} • How we protect and respect your data
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigateToSection('terms')}
                className="px-3.5 py-2 rounded-full bg-[#2B342C] hover:bg-[#3A4538] text-xs font-bold text-white border border-[#3D4B3E] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileCheck className="w-3.5 h-3.5 text-[#E06C38]" />
                <span>Terms</span>
              </button>
              <button
                onClick={() => onNavigateToSection('returns')}
                className="px-3.5 py-2 rounded-full bg-[#2B342C] hover:bg-[#3A4538] text-xs font-bold text-white border border-[#3D4B3E] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#93A28F]" />
                <span>Returns</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout with Sidebar */}
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Table of Contents Sticky Sidebar */}
          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-24 bg-white rounded-2xl p-5 border border-[#E8E1D2] shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7869] flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#E06C38]" /> Privacy Topics
              </h3>
              <nav className="space-y-1 text-xs text-[#5A6659]">
                <button onClick={() => scrollToAnchor('info-collect')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  1. Information We Collect
                </button>
                <button onClick={() => scrollToAnchor('how-we-use')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  2. How We Use Your Information
                </button>
                <button onClick={() => scrollToAnchor('how-we-share')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  3. How We Share Your Information
                </button>
                <button onClick={() => scrollToAnchor('data-retention')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  4. Data Retention
                </button>
                <button onClick={() => scrollToAnchor('data-security')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  5. Data Security
                </button>
                <button onClick={() => scrollToAnchor('your-rights')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  6. Your Rights
                </button>
                <button onClick={() => scrollToAnchor('cookies')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  7. Cookies
                </button>
                <button onClick={() => scrollToAnchor('children-privacy')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  8. Children's Privacy
                </button>
                <button onClick={() => scrollToAnchor('policy-changes')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  9. Changes to This Policy
                </button>
                <button onClick={() => scrollToAnchor('contact')} className="block w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-[#FAF6EE] hover:text-[#1D231E] transition-colors font-medium">
                  10. Contact Us
                </button>
              </nav>

              <div className="pt-3 border-t border-[#E8E1D2] text-[11px] text-[#8A9588]">
                Questions regarding data privacy?
                <button
                  onClick={() => onNavigateToSection('contact-page')}
                  className="mt-1 block font-bold text-[#E06C38] hover:underline cursor-pointer"
                >
                  Contact Data Officer →
                </button>
              </div>
            </div>
          </aside>

          {/* Privacy Document Content */}
          <div className="lg:col-span-8 space-y-8 text-sm leading-relaxed text-[#3D473C]">
            
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8E1D2] shadow-xs text-sm text-[#4D5A4C]">
              <p>
                <strong>Stitched Memories</strong> ("we", "us", "our") operates stitchedmemories.com and its related mobile/web applications. This Privacy Policy explains what personal information we collect, how we use it, and your rights regarding that information.
              </p>
            </div>

            {/* 1. Information We Collect */}
            <section id="info-collect" className="space-y-4 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">1</span>
                Information We Collect
              </h2>
              
              <div className="space-y-3 text-[#4D5A4C]">
                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-1">
                  <strong className="text-[#1D231E] block text-xs uppercase tracking-wider font-bold">Account Information</strong>
                  <p className="text-sm">When you create an account, we collect your email address, display name, and (if you sign in with Google) basic profile information such as your name and profile picture.</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-1.5">
                  <strong className="text-[#1D231E] block text-xs uppercase tracking-wider font-bold">Order & Photo Information</strong>
                  <p className="text-sm">When you use Stitchly - our photo-to-pattern converter or place a custom order, we collect:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>The photos you upload</li>
                    <li>Size, color, and product preferences you select</li>
                    <li>Delivery address, phone number, and any notes you provide</li>
                    <li>Generated patterns and stitch progress data associated with your orders</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-1">
                  <strong className="text-[#1D231E] block text-xs uppercase tracking-wider font-bold">Payment Information</strong>
                  <p className="text-sm">Payments are processed by <strong>PayHere</strong>, our third-party payment gateway. We do not store your card details, bank information, or other sensitive payment data on our servers. PayHere may retain a tokenized reference to your saved payment method to enable recurring subscription billing and faster checkout, in accordance with their own privacy and security practices.</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-1">
                  <strong className="text-[#1D231E] block text-xs uppercase tracking-wider font-bold">Usage Information</strong>
                  <p className="text-sm">We may automatically collect basic technical information such as your browser type, device type, and general usage patterns to help us improve the site.</p>
                </div>
              </div>
            </section>

            {/* 2. How We Use Your Information */}
            <section id="how-we-use" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">2</span>
                How We Use Your Information
              </h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#4D5A4C]">
                <li>Create and manage your account</li>
                <li>Process your custom orders, kit orders, and subscription payments</li>
                <li>Generate cross-stitch patterns from your uploaded photos</li>
                <li>Communicate with you about your orders, quotes, and account (including order status updates and quote notifications)</li>
                <li>Provide customer support</li>
                <li>Improve our products and services</li>
                <li>Send you service-related emails (order confirmations, password resets, subscription confirmations). We do not send marketing emails without your consent.</li>
              </ul>
            </section>

            {/* 3. How We Share Your Information */}
            <section id="how-we-share" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">3</span>
                How We Share Your Information
              </h2>
              <p>We do not sell your personal information. We share information only with:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#4D5A4C]">
                <li><strong>PayHere</strong>, to process payments and subscriptions</li>
                <li><strong>Service providers</strong> who help us operate the site (e.g. hosting, database, and email delivery providers), who are contractually required to protect your data and use it only to provide services to us</li>
                <li><strong>Legal authorities</strong>, if required by law or to protect our legal rights</li>
              </ul>
              <p className="text-xs text-[#5A6659] pt-1">
                If your custom stitched product order involves a freelance stitcher fulfilling the work, we may share the necessary order details (photo, specifications, delivery address) with that individual solely for the purpose of completing your order.
              </p>
            </section>

            {/* 4. Data Retention */}
            <section id="data-retention" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">4</span>
                Data Retention
              </h2>
              <p>
                We retain your account and order information for as long as your account is active, or as needed to provide you services, comply with legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your account and associated data at any time (see Section 6).
              </p>
            </section>

            {/* 5. Data Security */}
            <section id="data-security" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">5</span>
                Data Security
              </h2>
              <p>
                We take reasonable technical and organizational measures to protect your personal information, including encrypted storage, access controls, and secure payment processing through PayHere. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            {/* 6. Your Rights */}
            <section id="your-rights" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">6</span>
                Your Rights
              </h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 text-[#4D5A4C]">
                <li>Access the personal information we hold about you</li>
                <li>Correct inaccurate information (via your account profile settings)</li>
                <li>Request deletion of your account and associated data</li>
                <li>Withdraw consent for optional communications at any time</li>
              </ul>
              <p className="text-xs text-[#5A6659] pt-1">
                To exercise these rights, contact us at <a href="mailto:stitchedmemoriies@gmail.com" className="font-bold text-[#E06C38] underline">stitchedmemoriies@gmail.com</a>.
              </p>
            </section>

            {/* 7. Cookies */}
            <section id="cookies" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">7</span>
                Cookies
              </h2>
              <p>
                We use essential cookies/local storage required for the site to function (such as keeping you logged in). We do not currently use third-party advertising or tracking cookies.
              </p>
            </section>

            {/* 8. Children's Privacy */}
            <section id="children-privacy" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">8</span>
                Children's Privacy
              </h2>
              <p>
                Our services are not directed to children under 13, and we do not knowingly collect personal information from children under 13.
              </p>
            </section>

            {/* 9. Changes to This Policy */}
            <section id="policy-changes" className="space-y-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-xs">
              <h2 className="text-xl font-bold text-[#1D231E] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#FAF6EE] text-[#E06C38] flex items-center justify-center text-xs font-black border border-[#E8E1D2]">9</span>
                Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will post the updated version on this page with a revised "Last updated" date.
              </p>
            </section>

            {/* 10. Contact Us */}
            <section id="contact" className="space-y-3 bg-[#FAF6EE] p-6 sm:p-8 rounded-3xl border border-[#D5CDBC]">
              <h2 className="text-lg font-bold text-[#1D231E] flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#E06C38]" /> 10. Contact Us
              </h2>
              <p className="text-xs text-[#5A6659]">
                If you have questions about this Privacy Policy, contact us at:
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
