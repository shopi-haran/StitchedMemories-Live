import React, { useState, useEffect } from 'react';
import { Sparkles, Lock, ArrowLeft, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ResetPasswordPageProps {
  onGoHome: () => void;
  onPasswordUpdated: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onGoHome, onPasswordUpdated }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (data.session) {
        setHasRecoverySession(true);
      } else {
        setTimeout(async () => {
          if (!active) return;
          const { data: retryData } = await supabase.auth.getSession();
          if (retryData.session) {
            setHasRecoverySession(true);
          } else {
            setHasRecoverySession(false);
          }
        }, 800);
      }
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Password updated successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        onPasswordUpdated();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update password.');
      setIsLoading(false);
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
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-[#1D231E]">
            Reset Your Password
          </h1>
          <p className="text-xs text-[#5A6659] mt-2">
            Enter a secure new password for your StitchedMemories crafter account.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
          
          {hasRecoverySession === null ? (
            <div className="text-center py-10 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#E06C38] mx-auto" />
              <p className="text-xs text-[#6B7869] font-medium">Verifying reset link...</p>
            </div>
          ) : hasRecoverySession === false ? (
            <div className="text-center py-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>This reset link is invalid or has expired.</span>
              </div>
              <p className="text-xs text-[#6B7869]">
                Please request a new password reset link from the login page.
              </p>
              <button
                onClick={onGoHome}
                className="w-full py-3 bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <span>Request New Reset Link</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-[#1D231E] mb-1">
                  New Password (min 8 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9588]" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1D231E] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9588]" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                disabled={isLoading}
                className="w-full py-3 bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          )}

        </div>

      </div>

    </div>
  );
};
