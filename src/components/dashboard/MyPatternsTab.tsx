import React, { useEffect, useState, useCallback } from 'react';
import { 
  Palette, 
  Sparkles, 
  Download, 
  Loader2, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Image as ImageIcon,
  RefreshCw,
  Lock,
  Eye
} from 'lucide-react';
import { 
  fetchUserConversionJobs, 
  fetchUserProfile, 
  getEffectiveTier,
  SupabaseConversionJobRow, 
  getJobPatternConfig 
} from '../../lib/supabase';
import { generatePatternFromImage, PatternConfig } from '../../utils/patternEngine';
import { exportPatternToPDF, previewPatternPDF, downloadFileFromUrl } from '../../utils/pdfExporter';
import { StitchTrackerModal } from './StitchTrackerModal';
import dogImg from '../../assets/images/hoop_dog.png';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
}

interface MyPatternsTabProps {
  user: UserProfile;
  onOpenConverter: () => void;
}

export const MyPatternsTab: React.FC<MyPatternsTabProps> = ({ user, onOpenConverter }) => {
  const [jobs, setJobs] = useState<SupabaseConversionJobRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrackerJob, setSelectedTrackerJob] = useState<SupabaseConversionJobRow | null>(null);
  const [downloadingPdfJobId, setDownloadingPdfJobId] = useState<string | number | null>(null);
  const [planTier, setPlanTier] = useState<'free' | 'pro' | 'studio'>('free');

  // Sync plan tier
  useEffect(() => {
    let active = true;
    async function syncTier() {
      try {
        if (user?.email || user?.id) {
          const profile = await fetchUserProfile(user.id, user.email);
          const effective = getEffectiveTier(profile);
          if (active) {
            setPlanTier(effective);
          }
        }
      } catch (err) {
        console.error('Error fetching user profile for patterns tab:', err);
      }
    }

    syncTier();

    const handleTierChange = (e: any) => {
      let extractedTier: 'free' | 'pro' | 'studio' | null = null;
      if (typeof e?.detail === 'string') {
        extractedTier = e.detail as any;
      } else if (typeof e?.detail?.tier === 'string') {
        extractedTier = e.detail.tier as any;
      }
      if (extractedTier && ['free', 'pro', 'studio'].includes(extractedTier)) {
        setPlanTier(extractedTier);
      } else {
        syncTier();
      }
    };

    window.addEventListener('dev-tier-changed', handleTierChange);
    window.addEventListener('tierChanged', handleTierChange);

    return () => {
      active = false;
      window.removeEventListener('dev-tier-changed', handleTierChange);
      window.removeEventListener('tierChanged', handleTierChange);
    };
  }, [user]);

  const getJobProgressCount = (jobId: string | number) => {
    try {
      const saved = localStorage.getItem(`stitch_tracker_job_${jobId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.length;
        }
      }
    } catch {
      return 0;
    }
    return 0;
  };

  const getJobPhotoUrl = (job: SupabaseConversionJobRow) => {
    if (job.pattern_preview_url && job.pattern_preview_url.length > 10 && !job.pattern_preview_url.startsWith('blob:')) return job.pattern_preview_url;
    if (job.thumbnail_url && job.thumbnail_url.length > 10 && !job.thumbnail_url.startsWith('blob:')) return job.thumbnail_url;
    if (job.photo_url && job.photo_url.length > 10 && !job.photo_url.startsWith('blob:')) return job.photo_url;
    if (job.original_image_url && job.original_image_url.length > 10 && !job.original_image_url.startsWith('blob:')) return job.original_image_url;
    try {
      const cachedPreview = localStorage.getItem(`user_pattern_preview_${job.title}`);
      if (cachedPreview) return cachedPreview;
      const cachedPhoto = localStorage.getItem(`user_pattern_photo_${job.title}`);
      if (cachedPhoto) return cachedPhoto;
      const cachedByUser = localStorage.getItem(`user_pattern_img_${job.user_id}_${job.title}`);
      if (cachedByUser) return cachedByUser;
      const cachedByTitle = localStorage.getItem(`user_pattern_img_${job.title}`);
      if (cachedByTitle) return cachedByTitle;
      const cachedThumb = localStorage.getItem(`user_pattern_thumb_${job.title}`);
      if (cachedThumb) return cachedThumb;
    } catch {}
    return dogImg;
  };

  const PAGE_SIZE = 10;

  const loadJobs = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { jobs: fetchedJobs, totalCount: count } = await fetchUserConversionJobs(
        user.id,
        user.email,
        pageNum,
        PAGE_SIZE
      );

      setTotalCount(count);

      if (append) {
        setJobs((prev) => [...prev, ...fetchedJobs]);
      } else {
        setJobs(fetchedJobs);
      }
    } catch (err: any) {
      console.error('Failed to load conversion jobs:', err);
      setError('Failed to load patterns from Supabase.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user.id, user.email]);

  useEffect(() => {
    loadJobs(0, false);

    const handlePatternSaved = () => {
      loadJobs(0, false);
    };

    window.addEventListener('patternSaved', handlePatternSaved);
    return () => {
      window.removeEventListener('patternSaved', handlePatternSaved);
    };
  }, [loadJobs]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadJobs(nextPage, true);
  };

  const handleRefresh = () => {
    setPage(0);
    loadJobs(0, false);
  };

  const handlePreviewPdf = async (job: SupabaseConversionJobRow, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cardTitle = job.title || job.title_name || job.filename || `Cross Stitch Chart #${job.id}`;

    // If valid PDF URL exists, open preview in a new browser tab
    if (job.pattern_pdf_url && (job.pattern_pdf_url.startsWith('http') || job.pattern_pdf_url.startsWith('blob:'))) {
      window.open(job.pattern_pdf_url, '_blank');
      return;
    }

    // Otherwise, generate pattern and PDF chart on-demand and open preview tab
    setDownloadingPdfJobId(job.id);

    // Open blank tab synchronously to prevent browser popup blockers
    const previewTab = window.open('about:blank', '_blank');

    try {
      const photoUrl = getJobPhotoUrl(job);
      const config = getJobPatternConfig(job);

      const pattern = await generatePatternFromImage(photoUrl, config);
      await previewPatternPDF(pattern, 'color', config, cardTitle, previewTab);
    } catch (err) {
      console.error('On-demand PDF preview error:', err);
      if (previewTab && !previewTab.closed) previewTab.close();
      // Fallback: Open interactive pattern viewer where user can view and download PDF
      setSelectedTrackerJob(job);
    } finally {
      setDownloadingPdfJobId(null);
    }
  };

  const formatDate = (rawDateStr?: string) => {
    if (!rawDateStr) return 'Recent';
    try {
      const d = new Date(rawDateStr);
      if (isNaN(d.getTime())) return rawDateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return rawDateStr;
    }
  };

  const renderStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    
    if (s === 'complete' || s === 'completed' || s === 'done') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Complete</span>
        </span>
      );
    }

    if (s === 'processing' || s === 'in_progress' || s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
          <span>Processing</span>
        </span>
      );
    }

    if (s === 'failed' || s === 'error') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Failed</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
        <Clock className="w-3.5 h-3.5 text-gray-500" />
        <span className="capitalize">{status || 'Pending'}</span>
      </span>
    );
  };

  const hasMore = jobs.length < totalCount || (jobs.length > 0 && jobs.length % PAGE_SIZE === 0 && jobs.length < (totalCount || Infinity));

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#93A28F] block mb-1">
            Pattern Vault
          </span>
          <h2 className="text-2xl font-bold text-[#1D231E]">My Patterns</h2>
          <p className="text-xs text-[#5A6659] mt-1">
            Access and download your AI-converted cross-stitch DMC pattern charts, color keys, and PDF guides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            title="Refresh list"
            className="p-2 bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#5A6659] rounded-xl border border-[#D5CDBC] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenConverter}
            className="px-4 py-2 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Convert New Photo</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-[#FAF6EE] border border-[#E8E1D2] rounded-3xl p-5 animate-pulse flex gap-4 items-center">
              <div className="w-24 h-24 bg-[#E8E1D2] rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-[#E8E1D2] rounded w-1/3" />
                <div className="h-5 bg-[#E8E1D2] rounded w-3/4" />
                <div className="h-8 bg-[#E8E1D2] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-rose-800">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-full hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : jobs.length > 0 ? (
        <>
          {/* Pattern Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job) => {
              const statusLower = (job.status || '').toLowerCase();
              const isComplete = statusLower === 'complete' || statusLower === 'completed' || statusLower === 'done';
              const isProcessing = statusLower === 'processing' || statusLower === 'in_progress' || statusLower === 'pending';
              const cardTitle = job.title || job.title_name || job.filename || `Cross Stitch Chart #${job.id}`;

              return (
                <div
                  key={job.id}
                  className="bg-[#FAF6EE] border border-[#E8E1D2] hover:border-[#D5CDBC] rounded-3xl p-5 transition-all shadow-xs flex flex-col justify-between group"
                >
                  <div className="flex gap-4 items-start mb-4">
                    
                    {/* Thumbnail Image - Clickable to View Pattern */}
                    <div 
                      onClick={() => isComplete && setSelectedTrackerJob(job)}
                      className="w-28 h-28 bg-white border border-[#E8E1D2] hover:border-[#E06C38] rounded-2xl overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs cursor-pointer group/thumb"
                      title="Click to view pattern chart on-screen"
                    >
                      <img
                        src={getJobPhotoUrl(job)}
                        alt={cardTitle}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = dogImg;
                        }}
                      />
                      {isComplete && (
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>

                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        {renderStatusBadge(job.status)}
                      </div>

                      <h3 
                        onClick={() => isComplete && setSelectedTrackerJob(job)}
                        className={`text-base font-bold text-[#1D231E] leading-snug truncate mb-1 ${isComplete ? 'hover:text-[#E06C38] cursor-pointer' : ''}`} 
                        title={cardTitle}
                      >
                        {cardTitle}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-[#6B7869]">
                        <Clock className="w-3.5 h-3.5 text-[#8A9588]" />
                        <span>{formatDate(job.created_at)}</span>
                      </div>

                      {(job.grid_width || job.colors_count) && (
                        <div className="flex flex-col gap-1 mt-2 text-[11px]">
                          <div className="flex items-center gap-2 font-semibold text-[#5A6659]">
                            {job.grid_width && <span>{job.grid_width}×{job.grid_height || job.grid_width} Stitches</span>}
                            {job.grid_width && job.colors_count && <span>•</span>}
                            {job.colors_count && <span>{job.colors_count} DMC Colors</span>}
                          </div>

                          {/* Progress Badge if stitching tracked */}
                          {(() => {
                            const doneCount = getJobProgressCount(job.id);
                            if (doneCount > 0) {
                              const totalSts = (job.grid_width || 60) * (job.grid_height || 60);
                              const pct = Math.min(100, Math.round((doneCount / totalSts) * 100));
                              return (
                                <div className="flex items-center gap-1.5 font-bold text-[#3D5239] bg-[#E8EFE5] px-2 py-0.5 rounded-md w-fit border border-[#C5D3C2] text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 text-[#E06C38]" />
                                  <span>{pct}% Stitched ({doneCount.toLocaleString()} sts)</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Actions / Status Indicators */}
                  <div className="pt-3 border-t border-[#E8E1D2]/80 flex flex-col sm:flex-row items-center gap-2">
                    
                    {isComplete ? (
                      <>
                        <button
                          onClick={() => setSelectedTrackerJob(job)}
                          className="w-full sm:w-1/2 py-2 px-3 bg-[#3D5239] hover:bg-[#2C3B29] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                          title="Open pattern chart to view on-screen without downloading"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#E06C38]" />
                          <span>View Pattern</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handlePreviewPdf(job, e)}
                          disabled={downloadingPdfJobId === job.id}
                          className="w-full sm:w-1/2 py-2 px-3 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60"
                          title="Preview PDF pattern chart in browser tab"
                        >
                          {downloadingPdfJobId === job.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Loading Preview...</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5" />
                              <span>PDF Chart</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : isProcessing ? (
                      <div className="w-full py-2.5 px-4 bg-amber-50/80 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        <span>Processing DMC Color Palette...</span>
                      </div>
                    ) : (
                      <div className="w-full py-2.5 px-4 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span>Status: {job.status || 'Pending'}</span>
                      </div>
                    )}

                  </div>

                </div>
              );
            })}
          </div>

          {/* Pagination Load More Button */}
          {hasMore && (
            <div className="pt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-3 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#E06C38]" />
                    <span>Loading Patterns...</span>
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4 text-[#E06C38]" />
                    <span>Load More Patterns ({jobs.length} loaded)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        /* Clean Empty State Card */
        <div className="p-10 border-2 border-dashed border-[#E8E1D2] rounded-3xl bg-[#FAF6EE]/50 text-center">
          <div className="w-12 h-12 bg-[#E06C38]/10 text-[#E06C38] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Palette className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#1D231E]">No Patterns Saved Yet</h3>
          <p className="text-xs text-[#5A6659] max-w-md mx-auto mt-1 mb-5 leading-relaxed">
            Convert any favorite photo into a custom DMC cross-stitch pattern chart with complete thread keys and instant PDF downloads.
          </p>
          <button
            onClick={onOpenConverter}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E06C38] text-white text-xs font-bold rounded-full hover:bg-[#d05c28] transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Stitchara</span>
          </button>
        </div>
      )}

      {/* Interactive Stitch Tracker Modal for Dashboard Pattern Jobs */}
      {selectedTrackerJob && (
        <StitchTrackerModal
          isOpen={Boolean(selectedTrackerJob)}
          onClose={() => setSelectedTrackerJob(null)}
          job={selectedTrackerJob}
        />
      )}

    </div>
  );
};
