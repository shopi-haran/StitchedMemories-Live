import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, User as UserIcon, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, fetchUserProfile } from '../lib/supabase';
import { useModalStack } from '../hooks/useModalStack';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  customTitle?: string;
  customSubtitle?: string;
  onLoginSuccess: (user: { id?: string; name: string; email: string; avatar_url?: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
  customTitle,
  customSubtitle,
  onLoginSuccess,
}) => {
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'auth-modal' });
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab);
      setErrorMsg(null);
      setSuccessMsg(null);
      setEmail('');
      setPassword('');
      setName('');
    }
  }, [isOpen, defaultTab]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          setIsLoading(false);
          return;
        }

        if (data.session && data.user) {
          const profile = await fetchUserProfile(data.user.id, data.user.email);
          const userName = profile?.display_name || data.user.user_metadata?.full_name || data.user.user_metadata?.display_name || email.split('@')[0];
          const avatarUrl = profile?.avatar_url || data.user.user_metadata?.avatar_url || '';

          onLoginSuccess({
            id: data.user.id,
            name: userName,
            email: data.user.email || email,
            avatar_url: avatarUrl,
          });
          onClose();
        }
      } else {
        // Signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name || email.split('@')[0],
              full_name: name || email.split('@')[0],
              has_selected_plan: false,
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
          setIsLoading(false);
          return;
        }

        if (data.session && data.user) {
          // Initialize new profile row strictly using existing profiles table columns
          try {
            const { error: upsertErr } = await supabase.from('profiles').upsert({
              id: data.user.id,
              display_name: name || email.split('@')[0],
              role: 'user',
              has_selected_plan: false,
              subscription_tier: 'free',
              subscription_status: 'active',
            });
            if (upsertErr) {
              console.error('[AuthModal] Profile upsert error:', upsertErr);
            }
          } catch (e) {
            console.warn('[AuthModal] Error creating new user profile:', e);
          }

          const userName = name || data.user.user_metadata?.display_name || email.split('@')[0];
          onLoginSuccess({
            id: data.user.id,
            name: userName,
            email: data.user.email || email,
          });
          onClose();
        } else if (data.user && !data.session) {
          setSuccessMsg('Account created! Please check your email inbox to confirm your registration.');
        }
      }
    } catch (err: any) {
      console.error('Supabase Auth Modal error:', err);
      setErrorMsg(err?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to initialize Google Sign-In');
      setIsGoogleLoading(false);
    }
  };

  return createPortal(
    <div 
      data-modal-overlay="true"
      data-modal-id={modalId}
      style={{ zIndex }}
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={() => {
        if (!isLoading && onClose) onClose();
      }}
    >
      <div 
        data-modal-scroll="true"
        className="relative w-full max-w-md bg-[#FAF6EE] border border-[#E8E1D2] rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] p-6 sm:p-8 overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6B7869] hover:text-[#1D231E] hover:bg-[#E8E1D2]/50 rounded-full transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1D231E]">
            {customTitle || (tab === 'login' ? 'Welcome Back!' : 'Create an Account')}
          </h2>
          <p className="text-xs text-[#5B675A] mt-1">
            {customSubtitle || (tab === 'login'
              ? 'Sign in to access your saved cross-stitch patterns & order history.'
              : 'Join StitchedMemories to convert photos and save custom patterns.')}
          </p>
        </div>

        {/* Google OAuth Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-2.5 bg-white hover:bg-[#FAF6EE] text-[#1D231E] border border-[#D5CDBC] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs hover:border-[#1D231E]/40"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#E06C38]" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative text-center my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8E1D2]" />
          </div>
          <span className="relative px-3 bg-[#FAF6EE] text-[10px] uppercase tracking-wider text-[#8A9588] font-bold">
            Or with email
          </span>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-[#E8E1D2]/60 p-1 rounded-full mb-4">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-[#1D231E] shadow-sm'
                : 'text-[#6B7869] hover:text-[#1D231E]'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              tab === 'signup'
                ? 'bg-white text-[#1D231E] shadow-sm'
                : 'text-[#6B7869] hover:text-[#1D231E]'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-[#3A4538] mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9588]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Miller"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#3A4538] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9588]" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3A4538] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9588]" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full mt-2 py-3 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{tab === 'login' ? 'Logging in...' : 'Creating Account...'}</span>
              </>
            ) : (
              <>
                <span>{tab === 'login' ? 'Log In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>,
    document.body
  );
};
