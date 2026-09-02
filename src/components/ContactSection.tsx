import React, { useState } from 'react';
import { Mail, MapPin, Clock, Send, MessageSquare, CheckCircle2, Sparkles, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { submitContactMessage } from '../lib/supabase';

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inquiryType: 'Custom Pattern Help',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setSubmitError('Please fill in all required fields (Name, Email, and Message).');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await submitContactMessage({
        name: formData.name,
        email: formData.email,
        inquiry_type: formData.inquiryType,
        subject: formData.subject,
        message: formData.message,
      });

      if (res.success) {
        setIsSubmitted(true);
      } else {
        console.error('Contact submission error:', res.error);
        setSubmitError(
          res.error?.message || 
          'We were unable to save your message right now. Please verify your connection or try again.'
        );
      }
    } catch (err: any) {
      console.error('Unexpected contact submission error:', err);
      setSubmitError('An unexpected network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact-section" className="py-20 bg-[#F4F0E6] border-t border-[#E8E1D2] relative overflow-hidden text-[#1D231E]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E06C38]/10 text-[#E06C38] text-xs font-semibold uppercase tracking-wider mb-4">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Get in Touch</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1D231E] leading-tight mb-4 font-sans">
            We'd Love to Hear From You
          </h2>

          <p className="text-base sm:text-lg text-[#4A544A] leading-relaxed">
            Have questions about converting your photo, customizing a pattern, or our upcoming physical kits? Reach out to our friendly stitching team.
          </p>
        </div>

        {/* 2-Column Grid: Contact Info + Contact Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Contact Details Cards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Email Contact Card */}
            <div className="bg-white border border-[#E8E1D2] rounded-2xl p-6 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
              <div className="w-12 h-12 rounded-xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1D231E] mb-1">Email Us Directly</h3>
                <p className="text-xs text-[#5B675A] mb-2">For general inquiries, pattern assistance, or order updates.</p>
                <a 
                  href="mailto:stitchedmemoriies@gmail.com" 
                  className="text-xs font-bold text-[#E06C38] hover:underline inline-flex items-center gap-1"
                >
                  stitchedmemoriies@gmail.com
                </a>
              </div>
            </div>

            {/* Phone Contact Card */}
            <div className="bg-white border border-[#E8E1D2] rounded-2xl p-6 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
              <div className="w-12 h-12 rounded-xl bg-[#93A28F]/20 text-[#3D5239] flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1D231E] mb-1">Phone & WhatsApp</h3>
                <p className="text-xs text-[#5B675A] mb-2">Speak directly with our crafting and support team.</p>
                <a 
                  href="tel:+940769965252" 
                  className="text-xs font-bold text-[#1D231E] hover:underline inline-flex items-center gap-1"
                >
                  +94 076 996 5252
                </a>
              </div>
            </div>

            {/* Hours & Response Guarantee Card */}
            <div className="bg-white border border-[#E8E1D2] rounded-2xl p-6 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
              <div className="w-12 h-12 rounded-xl bg-[#93A28F]/20 text-[#3D5239] flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1D231E] mb-1">Support Hours</h3>
                <p className="text-xs text-[#5B675A] leading-relaxed mb-2">
                  Monday – Friday: 9:00 AM – 6:00 PM
                </p>
                <span className="inline-block px-2.5 py-1 rounded-full bg-[#E5EDE2] text-[#3D5239] text-[11px] font-semibold">
                  ⚡ 24-Hour Reply Guarantee
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 bg-white border border-[#E8E1D2] rounded-3xl p-8 sm:p-10 shadow-lg">
            {isSubmitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#E5EDE2] text-[#2E7D32] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-[#1D231E]">Message Received!</h3>
                <p className="text-sm text-[#5B675A] max-w-md mx-auto leading-relaxed">
                  Thank you for reaching out, <span className="font-semibold text-[#1D231E]">{formData.name}</span>. A member of our stitching team will review your message and reply to <span className="font-semibold text-[#1D231E]">{formData.email}</span> within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({ name: '', email: '', inquiryType: 'Custom Pattern Help', subject: '', message: '' });
                  }}
                  className="mt-4 px-6 py-2.5 bg-[#1D231E] text-white text-xs font-semibold rounded-full hover:bg-[#323D34] transition-all cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-[#E06C38]" />
                  <h3 className="text-lg font-bold text-[#1D231E]">Send Us a Message</h3>
                </div>

                {submitError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 text-xs leading-relaxed animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 mb-0.5">Could not send message</p>
                      <p>{submitError}</p>
                      <button
                        type="button"
                        onClick={() => setSubmitError(null)}
                        className="mt-2 text-[11px] font-bold text-red-700 underline hover:text-red-900 cursor-pointer"
                      >
                        Dismiss & Retry
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3A4538] mb-1.5">
                      Your Name <span className="text-[#E06C38]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isSubmitting}
                      placeholder="e.g. Eleanor Vance"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-sm text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3A4538] mb-1.5">
                      Email Address <span className="text-[#E06C38]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      disabled={isSubmitting}
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-sm text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3A4538] mb-1.5">
                      Inquiry Topic
                    </label>
                    <select
                      disabled={isSubmitting}
                      value={formData.inquiryType}
                      onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-sm text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 disabled:opacity-60"
                    >
                      <option value="Custom Pattern Help">Custom Pattern Help</option>
                      <option value="DMC Palette Question">DMC Palette Question</option>
                      <option value="Shop Kit Pre-order">Shop Kit Pre-order</option>
                      <option value="General Question">General Question</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3A4538] mb-1.5">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      disabled={isSubmitting}
                      placeholder="e.g. Help with pet photo resolution"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-sm text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3A4538] mb-1.5">
                    Your Message <span className="text-[#E06C38]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    disabled={isSubmitting}
                    placeholder="Tell us how we can help with your cross-stitch project..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-sm text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 resize-none disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#E06C38] hover:bg-[#d05c28] text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message to The Team</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
