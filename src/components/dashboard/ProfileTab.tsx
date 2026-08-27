import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  User, 
  Camera, 
  Lock, 
  CreditCard, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Shield,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { 
  supabase, 
  fetchUserProfile, 
  updateUserProfile, 
  uploadAvatarToSupabase, 
  SupabaseProfileRow 
} from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
}

interface ProfileTabProps {
  user: UserProfile;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ user }) => {
  const { refreshProfile } = useAuth();
  // Profile State
  const [profile, setProfile] = useState<SupabaseProfileRow | null>(null);
  const [displayName, setDisplayName] = useState<string>(user.name || '');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [paymentBrand, setPaymentBrand] = useState<string>('Visa');
  const [paymentLast4, setPaymentLast4] = useState<string>('4242');

  // Loading & Feedback States
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Password State
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changingPassword, setChangingPassword] = useState<boolean>(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const data = await fetchUserProfile(user.id, user.email);
      if (data) {
        setProfile(data);
        if (data.display_name) setDisplayName(data.display_name);
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
        if (data.payment_brand) setPaymentBrand(data.payment_brand);
        if (data.payment_last4) setPaymentLast4(data.payment_last4);
      }
    } catch (err) {
      console.error('Error loading profile from Supabase:', err);
    } finally {
      setLoadingProfile(false);
    }
  }, [user.id, user.email]);

  useEffect(() => {
    loadProfile();

    const handleTierChange = () => {
      loadProfile();
    };
    window.addEventListener('dev-tier-changed', handleTierChange);

    return () => {
      window.removeEventListener('dev-tier-changed', handleTierChange);
    };
  }, [loadProfile]);

  // Handle Avatar File Upload with 400px Client-Side Resize
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      const userIdToUse = user.id || user.email || 'user';
      const uploadedUrl = await uploadAvatarToSupabase(file, userIdToUse);

      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
        // Automatically persist new avatar_url to Supabase profile
        await updateUserProfile(user.id || user.email, user.email, {
          display_name: displayName,
          avatar_url: uploadedUrl,
        });
        setProfileSuccessMsg('Profile picture updated and resized (max 400px)!');
      } else {
        setProfileErrorMsg('Failed to upload profile picture. Please try again.');
      }
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setProfileErrorMsg(err?.message || 'Error processing avatar image.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Profile Form Submission
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const userIdToUse = user.id || user.email || 'user';
      const success = await updateUserProfile(userIdToUse, user.email, {
        display_name: displayName,
        avatar_url: avatarUrl,
      });

      if (success) {
        setProfileSuccessMsg('Profile information saved successfully!');
        await refreshProfile();
      } else {
        setProfileErrorMsg('Failed to save profile. Please check database permissions.');
      }
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setProfileErrorMsg(err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Update calling supabase.auth.updateUser({ password: newPassword })
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New passwords do not match.');
      return;
    }

    setChangingPassword(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Error calling supabase.auth.updateUser:', error);
        setPasswordErrorMsg(error.message || 'Failed to update password.');
      } else {
        setPasswordSuccessMsg('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      console.error('Password change exception:', err);
      setPasswordErrorMsg(err?.message || 'An unexpected error occurred updating password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpdatePaymentMethodLinkOut = () => {
    alert('Redirecting to secure Stripe payment method management portal...');
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#93A28F] block mb-1">
            Account Management
          </span>
          <h2 className="text-2xl font-bold text-[#1D231E]">Profile Settings</h2>
          <p className="text-xs text-[#5A6659] mt-1">
            Manage your public display name, avatar, account credentials, and saved payment methods.
          </p>
        </div>

        <button
          onClick={loadProfile}
          title="Refresh profile data"
          className="p-2 bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#5A6659] rounded-xl border border-[#D5CDBC] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loadingProfile ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 1. Edit Profile Form (Display Name & Avatar Upload) */}
      <div className="bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E8E1D2]">
          <div className="w-9 h-9 rounded-xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1D231E]">Personal Details</h3>
            <p className="text-xs text-[#6B7869]">Update your public avatar and crafter display name.</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          
          {/* Avatar Upload Preview Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-[#FAF6EE] border border-[#E8E1D2] rounded-2xl">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-2 border-[#E06C38] overflow-hidden bg-white shadow-xs flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full bg-[#1D231E] text-white flex items-center justify-center text-2xl font-bold">
                    {(displayName || user.name || 'C').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Camera Overlay Icon */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 p-2 bg-[#E06C38] hover:bg-[#d05c28] text-white rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer"
                title="Upload new picture"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="text-center sm:text-left space-y-1">
              <h4 className="text-xs font-bold text-[#1D231E]">Profile Avatar</h4>
              <p className="text-[11px] text-[#6B7869]">
                Images are automatically resized client-side to max 400px and stored in the <code className="bg-[#E8E1D2] px-1 py-0.5 rounded text-[10px] text-[#1D231E]">profile-pictures</code> bucket.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="mt-2 px-3 py-1.5 bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#1D231E] border border-[#D5CDBC] text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                {uploadingAvatar ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E06C38]" />
                    <span>Resizing & Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 text-[#E06C38]" />
                    <span>Choose Image File</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Display Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1D231E]">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Elena Rostova"
              required
              className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#E8E1D2] focus:border-[#E06C38] focus:bg-white rounded-xl text-xs text-[#1D231E] outline-none transition-all"
            />
          </div>

          {/* User Email (Read-only) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#8A9588]">
              Account Email Address (Primary ID)
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2.5 bg-[#F0EBE1]/60 border border-[#E8E1D2] rounded-xl text-xs text-[#6B7869] cursor-not-allowed"
            />
          </div>

          {/* Profile Success / Error Alerts */}
          {profileSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* 2. Change Password Section */}
      <div className="bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E8E1D2]">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1D231E]">Change Password</h3>
            <p className="text-xs text-[#6B7869]">
              Updates authentication credentials via <code className="bg-[#E8E1D2] px-1 py-0.5 rounded text-[10px] text-[#1D231E]">supabase.auth.updateUser</code>.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1D231E]">
                New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6EE] border border-[#E8E1D2] focus:border-[#E06C38] focus:bg-white rounded-xl text-xs text-[#1D231E] outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-[#8A9588] absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1D231E]">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6EE] border border-[#E8E1D2] focus:border-[#E06C38] focus:bg-white rounded-xl text-xs text-[#1D231E] outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-[#8A9588] absolute left-3 top-3" />
              </div>
            </div>

          </div>

          {passwordSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccessMsg}</span>
            </div>
          )}

          {passwordErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordErrorMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="px-6 py-2.5 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#E06C38]" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-[#E06C38]" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* 3. Payment Method Section */}
      <div className="bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E8E1D2]">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1D231E]">Payment Method</h3>
            <p className="text-xs text-[#6B7869]">
              Default billing card on file from <code className="bg-[#E8E1D2] px-1 py-0.5 rounded text-[10px] text-[#1D231E]">profiles</code> table.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#FAF6EE] border border-[#E8E1D2] rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl border border-[#E8E1D2] flex items-center justify-center text-[#1D231E] shrink-0 shadow-xs">
              <CreditCard className="w-6 h-6 text-[#E06C38]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#93A28F] block">
                Saved Card
              </span>
              <p className="text-sm font-bold text-[#1D231E] mt-0.5">
                {paymentBrand || 'Visa'} •••• {paymentLast4 || '4242'}
              </p>
              <p className="text-[11px] text-[#6B7869]">Expires 12/28 • Default for auto-renewals</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpdatePaymentMethodLinkOut}
            className="px-4 py-2 bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#1D231E] border border-[#D5CDBC] text-xs font-bold rounded-full transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
          >
            <span>Update Payment Method</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#E06C38]" />
          </button>
        </div>
      </div>

    </div>
  );
};
