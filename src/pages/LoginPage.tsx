import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase, fetchUserProfile } from '../lib/supabase';

interface LoginPageProps {
  onLoginSuccess: (user: { id?: string; name: string; email: string; avatar_url?: string }) => void;
  onGoHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onGoHome }) => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Email / Password Login or Signup
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
        }
      } else {
        // Signup Flow
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
          // Initialize new profile row with has_selected_plan: false
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              user_id: data.user.id,
              email: data.user.email || email,
              display_name: name || email.split('@')[0],
              has_selected_plan: false,
              subscription_tier: 'free',
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('Error creating new user profile:', e);
          }

          const userName = name || data.user.user_metadata?.display_name || email.split('@')[0];
          onLoginSuccess({
            id: data.user.id,
            name: userName,
            email: data.user.email || email,
          });
        } else if (data.user && !data.session) {
          setSuccessMsg('Account created! Please check your email inbox to confirm your registration, or sign in now.');
        }
      }
    } catch (err: any) {
      console.error('Supabase Auth error:', err);
      setErrorMsg(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Sign-in
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        setErrorMsg(error.message || 'Google OAuth sign-in failed.');
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      console.error('Google OAuth exception:', err);
      setErrorMsg(err?.message || 'Failed to initiate Google sign in.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#1D231E] flex flex-col justify-center py-12 px-6 lg:px-12 relative">
      
      {/* Top Home Link */}
      <div className="absolute top-6 left-6 lg:left-12">
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5A6659] hover:text-[#1D231E] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to StitchedMemories Home</span>
        </button>
      </div>

      <div className="max-w-md w-full mx-auto">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] mb-3 shadow-xs">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-[#1D231E]">
            {tab === 'login' ? 'Sign In to Your Dashboard' : 'Create Crafter Account'}
          </h1>
          <p className="text-xs text-[#5A6659] mt-2">
            Access your saved pattern vault, custom order status, and profile settings.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
          
          {/* Google OAuth Button */}
          <div>
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
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative text-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8E1D2]" />
            </div>
            <span className="relative px-3 bg-white text-[10px] uppercase tracking-wider text-[#8A9588] font-bold">
              Or with email & password
            </span>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-[#FAF6EE] p-1 rounded-full border border-[#E8E1D2]">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-[#1D231E] text-white shadow-xs'
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
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#1D231E] text-white shadow-xs'
                  : 'text-[#6B7869] hover:text-[#1D231E]'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-[#1D231E] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9588]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Elena Rostova"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1D231E] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9588]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="crafter@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D231E] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9588]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
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
              className="w-full py-3 bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{tab === 'login' ? 'Signing in...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{tab === 'login' ? 'Sign In to Dashboard' : 'Create Crafter Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

      </div>

    </div>
  );
};
