import React, { useEffect, useState, useCallback } from 'react';
import { 
  Package, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Calendar, 
  FileText, 
  Radio, 
  Truck, 
  Check,
  SearchCheck,
  CreditCard,
  MapPin,
  Phone,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Scissors,
  Copy,
  Activity,
  Layers,
  MessageSquare,
  RotateCcw,
  XCircle,
  History,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import { 
  supabase, 
  fetchUserStitchOrders, 
  SupabaseStitchOrderRow, 
  acceptCustomerQuote,
  requestQuoteRevision,
  cancelCustomerOrder,
  ArchivedQuote
} from '../../lib/supabase';
import { StitchTrackerModal } from './StitchTrackerModal';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
}

interface CustomOrdersTabProps {
  user: UserProfile;
  onOpenConverter?: () => void;
}

export const ORDER_STAGES = [
  { id: 'received', label: 'Received', icon: Package, description: 'Order received & queued' },
  { id: 'quoted', label: 'Quoted', icon: FileText, description: 'Studio pricing ready' },
  { id: 'confirmed', label: 'Confirmed', icon: CheckCircle2, description: 'Payment verified & booked' },
  { id: 'in_progress', label: 'In Progress', icon: Sparkles, description: 'Artisan crafting in progress' },
  { id: 'quality_check', label: 'Quality Check', icon: SearchCheck, description: 'Inspection & finishing' },
  { id: 'shipped', label: 'Shipped', icon: Truck, description: 'Dispatched with tracking' },
  { id: 'delivered', label: 'Delivered', icon: Check, description: 'Delivered to your door' },
];

export const getStageIndex = (statusRaw?: string): number => {
  if (!statusRaw) return 0;
  const s = statusRaw.toLowerCase().trim();

  // Stage 0: Pending Quote / Received (Explicit guard so pending_quote doesn't get matched by substring checks)
  if (s === 'pending_quote' || s === 'received' || s === 'new' || s === 'pending') {
    return 0;
  }
  // Stage 6: Delivered
  if (s === 'delivered' || s.includes('deliver') || s.includes('complete') || s.includes('done')) {
    return 6;
  }
  // Stage 5: Shipped
  if (s === 'shipped' || s.includes('ship') || s.includes('transit') || s.includes('dispatch')) {
    return 5;
  }
  // Stage 4: Quality Check
  if (s === 'quality_check' || s.includes('quality') || s.includes('qc') || s.includes('inspect') || s.includes('proof')) {
    return 4;
  }
  // Stage 3: In Production / In Progress
  if (s === 'in_production' || s === 'in_progress' || s.includes('production') || s.includes('progress') || s.includes('stitch') || s.includes('craft') || s.includes('process')) {
    return 3;
  }
  // Stage 2: Confirmed (Only set when payment is received/verified)
  if (s === 'confirmed' || s === 'paid' || s.includes('payment_received')) {
    return 2;
  }
  // Stage 1: Quoted / Revision Requested (Only actual quote ready, revision requested, or awaiting payment)
  if (s === 'quoted' || s === 'revision_requested' || s === 'awaiting_payment' || s === 'quote_ready' || s.includes('awaiting')) {
    return 1;
  }
  // Stage 0: Received (fallback default)
  return 0;
};

export const CustomOrdersTab: React.FC<CustomOrdersTabProps> = ({ user, onOpenConverter }) => {
  const [orders, setOrders] = useState<SupabaseStitchOrderRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Detail View Modal state
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<SupabaseStitchOrderRow | null>(null);

  // Quote Revision and Cancellation state
  const [revisionModalOrder, setRevisionModalOrder] = useState<SupabaseStitchOrderRow | null>(null);
  const [revisionText, setRevisionText] = useState<string>('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState<boolean>(false);
  const [cancelModalOrder, setCancelModalOrder] = useState<SupabaseStitchOrderRow | null>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);
  const [expandedHistoryOrders, setExpandedHistoryOrders] = useState<Record<string, boolean>>({});

  // Filter and Search states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lock body scroll when any modal is open in CustomOrdersTab
  useBodyScrollLock(Boolean(selectedDetailOrder || revisionModalOrder || cancelModalOrder));

  // Customer View-Only Stitch Tracker state
  const [viewOnlyTrackerOrder, setViewOnlyTrackerOrder] = useState<SupabaseStitchOrderRow | null>(null);
  const [isViewOnlyTrackerOpen, setIsViewOnlyTrackerOpen] = useState<boolean>(false);

  // Filtered orders
  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      const rawStatus = (order.fulfillment_status || order.status || 'pending_quote').toLowerCase();
      const details = order.request_details || {};
      const isCustomStitched = order.order_type === 'custom_stitched' || 
        (order.title && order.title.toLowerCase().includes('stitched')) ||
        (details.order_type === 'custom_stitched');

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending_quote') {
          if (rawStatus !== 'pending_quote' && rawStatus !== 'received' && rawStatus !== 'new') return false;
        } else if (statusFilter === 'quoted') {
          if (rawStatus !== 'quoted' && rawStatus !== 'revision_requested' && rawStatus !== 'awaiting_payment') return false;
        } else if (statusFilter === 'confirmed') {
          if (rawStatus !== 'confirmed' && rawStatus !== 'paid') return false;
        } else if (statusFilter === 'in_production') {
          if (rawStatus !== 'in_production' && rawStatus !== 'in_progress') return false;
        } else if (statusFilter === 'quality_check') {
          if (rawStatus !== 'quality_check') return false;
        } else if (statusFilter === 'shipped') {
          if (rawStatus !== 'shipped') return false;
        } else if (statusFilter === 'delivered') {
          if (rawStatus !== 'delivered') return false;
        } else if (statusFilter === 'cancelled') {
          if (rawStatus !== 'cancelled' && rawStatus !== 'canceled' && rawStatus !== 'declined') return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'custom_stitched') {
          if (!isCustomStitched) return false;
        } else if (typeFilter === 'custom_kit') {
          if (isCustomStitched) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (order.title || order.title_name || '').toLowerCase().includes(q);
        const idMatch = String(order.id).toLowerCase().includes(q);
        const detailsNotesMatch = (details.notes || details.comments || '').toLowerCase().includes(q);
        const trackingMatch = (order.tracking_number || '').toLowerCase().includes(q);
        if (!titleMatch && !idMatch && !detailsNotesMatch && !trackingMatch) return false;
      }

      return true;
    });
  }, [orders, statusFilter, typeFilter, searchQuery]);

  // Keep selectedDetailOrder in sync with refreshed orders
  useEffect(() => {
    if (selectedDetailOrder) {
      const fresh = orders.find(
        (o) => (o.raw_order_id || o.id) === (selectedDetailOrder.raw_order_id || selectedDetailOrder.id)
      );
      if (fresh) setSelectedDetailOrder(fresh);
    }
  }, [orders]);

  const toggleOrderHistory = (orderId: string | number) => {
    const key = String(orderId);
    setExpandedHistoryOrders((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleOpenRevision = (order: SupabaseStitchOrderRow) => {
    const revisionCount = (order.quote_history && Array.isArray(order.quote_history)) ? order.quote_history.length : 0;
    if (revisionCount >= 2) {
      setFeedbackMsg({
        text: "You've reached the maximum number of revisions for this order — please contact support for further changes.",
        type: 'info',
      });
      setTimeout(() => setFeedbackMsg(null), 6000);
      return;
    }
    setRevisionModalOrder(order);
    setRevisionText('');
  };

  const handleSubmitRevision = async () => {
    if (!revisionModalOrder) return;
    const targetId = revisionModalOrder.raw_order_id || revisionModalOrder.id;
    setIsSubmittingRevision(true);
    try {
      const res = await requestQuoteRevision(
        targetId,
        revisionText
      );
      if (res.success) {
        setFeedbackMsg({
          text: 'Revision requested! Our studio team will review your notes and update your quotation.',
          type: 'success',
        });
        setRevisionModalOrder(null);
        setRevisionText('');
        await loadOrders(true);
      } else {
        const errorMsg = res.message || res.error?.message || 'Unable to submit revision request. Please try again.';
        setFeedbackMsg({
          text: errorMsg,
          type: 'info',
        });
      }
    } catch (err: any) {
      console.error('Error requesting revision:', err);
      setFeedbackMsg({
        text: err?.message || 'Unable to submit revision request. Please try again.',
        type: 'info',
      });
    } finally {
      setIsSubmittingRevision(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleOpenCancel = (order: SupabaseStitchOrderRow) => {
    setCancelModalOrder(order);
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    const targetId = cancelModalOrder.raw_order_id || cancelModalOrder.id;
    setIsSubmittingCancel(true);
    try {
      const res = await cancelCustomerOrder(targetId, 'Cancelled by customer from dashboard');
      if (res.success) {
        setFeedbackMsg({
          text: 'Order cancelled successfully.',
          type: 'info',
        });
        setCancelModalOrder(null);
        await loadOrders(true);
      } else {
        const errorMsg = res.message || res.error?.message || 'Unable to cancel order. Please try again.';
        setFeedbackMsg({
          text: errorMsg,
          type: 'info',
        });
      }
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      setFeedbackMsg({
        text: err?.message || 'Unable to cancel order. Please try again.',
        type: 'info',
      });
    } finally {
      setIsSubmittingCancel(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsSilentRefreshing(true);
    setError(null);
    try {
      const data = await fetchUserStitchOrders(user.id, user.email);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load stitch orders:', err);
      if (!silent) setError('Unable to load custom orders from Supabase.');
    } finally {
      setLoading(false);
      setIsSilentRefreshing(false);
    }
  }, [user.id, user.email]);

  useEffect(() => {
    loadOrders();

    const currentUserId = user.id ? String(user.id).toLowerCase() : '';
    const currentUserEmail = user.email ? String(user.email).toLowerCase() : '';

    // Handle Realtime update event immediately in state for instant 0ms latency
    const handleOrderRecordChange = (payload: any) => {
      console.log('[Supabase Realtime User Orders]', payload.eventType, payload);
      const updatedRow = payload.new;
      if (!updatedRow) {
        loadOrders(true);
        return;
      }

      const rowUserId = String(updatedRow.user_id || '').toLowerCase();
      const isMatch = !rowUserId || 
        rowUserId === currentUserId || 
        rowUserId === currentUserEmail ||
        (updatedRow.request_details && (
          String(updatedRow.request_details.customer_email || '').toLowerCase() === currentUserEmail ||
          String(updatedRow.request_details.email || '').toLowerCase() === currentUserEmail
        ));

      if (isMatch) {
        setOrders((prevOrders) => {
          const targetId = updatedRow.id;
          const index = prevOrders.findIndex(
            (o) => o.raw_order_id === targetId || o.id === targetId || o.id === `order_${targetId}`
          );

          if (index === -1) {
            // New order - trigger background refresh
            loadOrders(true);
            return prevOrders;
          }

          const existing = prevOrders[index];
          const details = typeof updatedRow.request_details === 'string'
            ? (() => { try { return JSON.parse(updatedRow.request_details); } catch { return existing.request_details || {}; } })()
            : updatedRow.request_details || existing.request_details || {};

          const quoteObj = typeof updatedRow.quote === 'string'
            ? (() => { try { return JSON.parse(updatedRow.quote); } catch { return existing.quote; } })()
            : updatedRow.quote || existing.quote;

          const rawStatus = updatedRow.fulfillment_status || updatedRow.status || existing.fulfillment_status || existing.status;
          const totalAmountVal = updatedRow.total_amount ?? quoteObj?.total_amount ?? updatedRow.quoted_price ?? existing.total_amount;

          let title = existing.title;
          if (updatedRow.order_type === 'custom_kit_converter') title = `Custom Kit (Converter) - ${details.size || 'Standard'}`;
          else if (updatedRow.order_type === 'custom_kit_assisted') title = `Assisted Kit - ${details.size || 'Standard'}`;
          else if (updatedRow.order_type === 'custom_stitched') title = `Custom Stitched Keepsake - ${details.size || 'Standard'}`;
          else if (updatedRow.order_type) title = `${updatedRow.order_type.replace(/_/g, ' ')}`;

          const updatedOrder: SupabaseStitchOrderRow = {
            ...existing,
            ...updatedRow,
            id: existing.id,
            raw_order_id: updatedRow.id,
            title: title || existing.title,
            fulfillment_status: rawStatus,
            status: rawStatus,
            quote: quoteObj,
            request_details: details,
            total_amount: totalAmountVal,
            quoted_price: totalAmountVal > 0 ? totalAmountVal : existing.quoted_price,
            progress_percent: updatedRow.progress_percent !== undefined ? updatedRow.progress_percent : details.progress_percent ?? existing.progress_percent,
            progress_note: updatedRow.progress_note !== undefined ? updatedRow.progress_note : details.progress_note ?? existing.progress_note,
            progress_updated_at: updatedRow.progress_updated_at || details.progress_updated_at || existing.progress_updated_at,
            tracking_number: updatedRow.tracking_number !== undefined ? updatedRow.tracking_number : details.tracking_number ?? existing.tracking_number,
            status_note: updatedRow.status_note || details.status_note || existing.status_note,
            admin_notes: quoteObj?.admin_notes || updatedRow.admin_notes || existing.admin_notes,
            estimated_completion: updatedRow.estimated_completion || details.estimated_completion || existing.estimated_completion,
          };

          const next = [...prevOrders];
          next[index] = updatedOrder;
          return next;
        });

        // Trigger background sync to ensure relations and calculations are complete
        loadOrders(true);
      }
    };

    // Construct unique Realtime channel subscribed to orders table filtered to current user
    const channelId = `user_orders_realtime_${currentUserId || currentUserEmail || 'client'}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: user.id ? `user_id=eq.${user.id}` : undefined
        },
        handleOrderRecordChange
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        },
        handleOrderRecordChange
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeActive(false);
        }
      });

    const handleLocalUpdate = () => { loadOrders(true); };
    window.addEventListener('orderUpdated', handleLocalUpdate);
    window.addEventListener('orderCreated', handleLocalUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('orderUpdated', handleLocalUpdate);
      window.removeEventListener('orderCreated', handleLocalUpdate);
    };
  }, [user.id, user.email, loadOrders]);

  const handleConfirmQuote = async (order: SupabaseStitchOrderRow) => {
    const targetId = order.raw_order_id || order.id;
    setConfirmingOrderId(targetId);
    try {
      const res = await acceptCustomerQuote(targetId);
      if (res.success) {
        setFeedbackMsg({
          text: 'Quote accepted! Your order is now awaiting payment processing. Our studio team will reach out with payment confirmation.',
          type: 'success'
        });
        await loadOrders(true);
      } else {
        setFeedbackMsg({
          text: 'Unable to confirm order at this moment. Please try again.',
          type: 'info'
        });
      }
    } catch (err) {
      console.error('Error accepting quote:', err);
    } finally {
      setConfirmingOrderId(null);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleCopyTracking = (trackingNumber: string) => {
    try {
      navigator.clipboard.writeText(trackingNumber);
      setCopiedTracking(trackingNumber);
      setTimeout(() => setCopiedTracking(null), 3000);
    } catch {
      // Fallback
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
        year: 'numeric'
      });
    } catch {
      return rawDateStr;
    }
  };

  const getStatusBadge = (statusRaw?: string) => {
    const s = (statusRaw || 'pending_quote').toLowerCase().trim();
    if (s === 'delivered' || s.includes('deliver') || s.includes('complete')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>Delivered</span>
        </span>
      );
    }
    if (s === 'shipped' || s.includes('ship') || s.includes('transit')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
          <Truck className="w-3.5 h-3.5 text-sky-600 animate-bounce" />
          <span>Shipped</span>
        </span>
      );
    }
    if (s === 'quality_check' || s.includes('quality') || s.includes('qc')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <SearchCheck className="w-3.5 h-3.5 text-purple-600" />
          <span>Quality Check</span>
        </span>
      );
    }
    if (s === 'in_production' || s === 'in_progress' || s.includes('production') || s.includes('progress')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Scissors className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>In Production</span>
        </span>
      );
    }
    if (s === 'confirmed' || s === 'paid') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Confirmed</span>
        </span>
      );
    }
    if (s === 'awaiting_payment') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
          <span>Awaiting Payment</span>
        </span>
      );
    }
    if (s === 'revision_requested') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
          <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
          <span>Revision Requested</span>
        </span>
      );
    }
    if (s === 'declined') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Request Declined</span>
        </span>
      );
    }
    if (s === 'cancelled' || s === 'canceled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
          <XCircle className="w-3.5 h-3.5 text-gray-500" />
          <span className="line-through">Cancelled</span>
        </span>
      );
    }
    if (s === 'quoted') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
          <FileText className="w-3.5 h-3.5 text-orange-600" />
          <span>Quote Ready</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF6EE] text-[#1D231E] border border-[#E8E1D2]">
        <span className="w-2 h-2 rounded-full bg-[#E06C38]" />
        <span>Received</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#93A28F]">
              My Orders
            </span>
            {isRealtimeActive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                <span>Live Realtime Sync</span>
              </span>
            )}
            {isSilentRefreshing && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#8A9588] font-medium">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Syncing...
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-[#1D231E]">Custom Orders & Progress</h2>
          <p className="text-xs text-[#5A6659] mt-1">
            Track bespoke kits and hand-stitched orders live from pricing quote to courier delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadOrders(false)}
            title="Refresh custom orders"
            className="p-2 bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#5A6659] rounded-xl border border-[#D5CDBC] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onOpenConverter && (
            <button
              onClick={onOpenConverter}
              className="px-4 py-2 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Convert Photo to Kit</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-medium flex items-center gap-3 animate-fadeIn ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      {!loading && !error && orders.length > 0 && (
        <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-[#E8E1D2] space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9588]" />
              <input
                type="text"
                placeholder="Search orders by title, #ID, tracking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-[#D5CDBC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 text-[#1D231E]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#D5CDBC]">
                <Filter className="w-3.5 h-3.5 text-[#8A9588]" />
                <span className="text-[11px] font-bold text-[#8A9588] uppercase">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#1D231E] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses ({orders.length})</option>
                  <option value="pending_quote">Pending Quotes</option>
                  <option value="quoted">Quoted / Ready</option>
                  <option value="confirmed">Confirmed / Paid</option>
                  <option value="in_production">In Production</option>
                  <option value="quality_check">Quality Check</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled / Declined</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#D5CDBC]">
                <Scissors className="w-3.5 h-3.5 text-[#8A9588]" />
                <span className="text-[11px] font-bold text-[#8A9588] uppercase">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#1D231E] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="custom_stitched">Hand-Stitched Keepsake</option>
                  <option value="custom_kit">Custom Kit Only</option>
                </select>
              </div>

              {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 text-xs text-[#E06C38] font-bold hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((n) => (
            <div key={n} className="p-6 bg-[#FAF6EE] border border-[#E8E1D2] rounded-3xl animate-pulse space-y-4">
              <div className="h-5 bg-[#E8E1D2] rounded w-1/3" />
              <div className="h-16 bg-[#E8E1D2] rounded-2xl w-full" />
              <div className="h-4 bg-[#E8E1D2] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-rose-800">{error}</p>
          <button
            onClick={() => loadOrders(false)}
            className="mt-3 px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-full hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-[#FAF6EE] rounded-3xl border border-[#E8E1D2] space-y-4">
          <div className="w-16 h-16 bg-[#E06C38]/10 rounded-2xl flex items-center justify-center mx-auto text-[#E06C38]">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#1D231E]">No Custom Orders Yet</h3>
          <p className="text-xs text-[#5A6659] max-w-md mx-auto leading-relaxed">
            Upload your favorite photo to create a personalized cross-stitch pattern or order a fully handcrafted embroidered keepsake.
          </p>
          {onOpenConverter && (
            <button
              onClick={onOpenConverter}
              className="px-6 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Convert Your First Photo</span>
            </button>
          )}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-10 text-center bg-[#FAF6EE] rounded-3xl border border-[#E8E1D2] space-y-3">
          <Filter className="w-8 h-8 text-[#8A9588] mx-auto" />
          <h3 className="text-sm font-bold text-[#1D231E]">No Orders Match Current Filters</h3>
          <p className="text-xs text-[#5A6659]">
            Try adjusting your search query, fulfillment status, or order type filter.
          </p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setTypeFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-1.5 bg-white border border-[#D5CDBC] text-[#1D231E] text-xs font-bold rounded-full hover:bg-gray-50"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const rawStatus = (order.fulfillment_status || order.status || 'pending_quote').toLowerCase();
            const currentStageIndex = getStageIndex(rawStatus);
            const orderTitle = order.title || order.title_name || `Custom Order #${order.id}`;
            const details = order.request_details || {};
            
            // Check if custom stitched product
            const isCustomStitched = order.order_type === 'custom_stitched' || 
              (order.title && order.title.toLowerCase().includes('stitched')) ||
              (details.order_type === 'custom_stitched');

            const isPendingQuote = rawStatus === 'pending_quote' || rawStatus === 'received';
            const isRevisionRequested = rawStatus === 'revision_requested';
            const isCancelled = rawStatus === 'cancelled' || rawStatus === 'canceled';
            const isDeclined = rawStatus === 'declined';
            const isInProduction = rawStatus === 'in_production' || rawStatus === 'in_progress';
            const progressPercent = Number(order.progress_percent || details.progress_percent || 0);

            const totalAmount = Number(order.quote?.total_amount) || Number(order.quoted_price) || Number(order.total_amount) || 0;
            const hasQuotedAmount = !isPendingQuote && !isDeclined && totalAmount > 0;

            return (
              <div
                key={order.id}
                onClick={() => setSelectedDetailOrder(order)}
                className="bg-white border border-[#E8E1D2] hover:border-[#E06C38]/60 hover:shadow-md rounded-3xl p-6 sm:p-7 transition-all shadow-xs space-y-5 cursor-pointer group select-none"
              >
                {/* 1. Header: Photo/Icon, Title, Order #, Date, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E1D2]/80">
                  <div className="flex items-center gap-3.5">
                    {order.image_url ? (
                      <img
                        src={order.image_url}
                        alt={orderTitle}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-[#E8E1D2] shrink-0 shadow-2xs group-hover:scale-102 transition-transform"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#1D231E] leading-snug group-hover:text-[#E06C38] transition-colors">
                          {orderTitle}
                        </h3>
                        {isCustomStitched && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-[#E06C38] bg-[#E06C38]/10 px-2 py-0.5 rounded-full">
                            <Scissors className="w-2.5 h-2.5" /> Keepsake
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B7869] mt-0.5">
                        <span className="font-mono font-semibold text-[#8A9588]">
                          Order #{String(order.raw_order_id || order.id).replace('order_', '').slice(-8)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#8A9588]" />
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="self-start sm:self-auto shrink-0 flex items-center gap-2">
                    {getStatusBadge(rawStatus)}
                  </div>
                </div>

                {/* Live Stitch Progress Preview Bar: ONLY for custom_stitched when in_production or later */}
                {isCustomStitched && ['in_production', 'in_progress', 'quality_check', 'completed', 'shipped', 'delivered'].includes(rawStatus) && (
                  <div className="p-3.5 bg-gradient-to-r from-amber-50/80 via-[#FFF9F2] to-orange-50/80 border border-amber-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        Hand-Stitching Workshop Progress: <strong className="text-amber-900">{progressPercent}%</strong>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewOnlyTrackerOrder(order);
                          setIsViewOnlyTrackerOpen(true);
                        }}
                        className="text-[11px] font-bold text-[#2D5A43] hover:text-[#1d3d2c] flex items-center gap-1 hover:underline cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Live Stitch View →</span>
                      </button>
                    </div>
                    <div className="w-full h-2.5 bg-amber-200/50 rounded-full overflow-hidden p-0.5 border border-amber-200">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-[#2D5A43] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, progressPercent)}%` }}
                      />
                    </div>
                    {order.progress_note && (
                      <p className="text-[11px] text-[#1D231E]/80 font-medium truncate">
                        "{order.progress_note}"
                      </p>
                    )}
                  </div>
                )}

                {/* 2. The progress tracker OR Declined Banner */}
                {isDeclined ? (
                  <div className="py-1">
                    <div className="p-4 bg-rose-50/90 border border-rose-200 rounded-2xl flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-900">
                          We're unable to fulfill this request
                        </h4>
                        {order.status_note ? (
                          <p className="text-xs text-rose-800 leading-relaxed">
                            {order.status_note}
                          </p>
                        ) : (
                          <p className="text-[11px] text-rose-700 leading-relaxed">
                            Our studio artisan reviewed your request and determined we cannot fulfill it at this time.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-1">
                    {/* Desktop / Tablet Stepper */}
                    <div className="relative hidden md:block">
                      <div className="absolute top-5 left-8 right-8 h-1 bg-[#E8E1D2] -z-0 rounded-full" />
                      <div 
                        className="absolute top-5 left-8 h-1 bg-[#E06C38] -z-0 transition-all duration-700 ease-out rounded-full"
                        style={{
                          width: `${(currentStageIndex / (ORDER_STAGES.length - 1)) * 92}%`
                        }}
                      />

                      <div className="grid grid-cols-7 gap-2 relative z-10">
                        {ORDER_STAGES.map((stage, idx) => {
                          const isPassed = idx < currentStageIndex;
                          const isCurrent = idx === currentStageIndex;
                          const StageIcon = stage.icon;

                          return (
                            <div key={stage.id} className="flex flex-col items-center text-center">
                              <div 
                                className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0 font-bold ${
                                  isPassed
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : isCurrent
                                    ? 'bg-[#E06C38] text-white shadow-md ring-4 ring-[#E06C38]/20 scale-105'
                                    : 'bg-[#FAF6EE] text-[#8A9588] border border-[#E8E1D2]'
                                }`}
                              >
                                {isPassed ? <Check className="w-4 h-4" /> : <StageIcon className="w-3.5 h-3.5" />}
                              </div>
                              <div className="mt-1.5 w-full px-1">
                                <p className={`text-[11px] font-bold truncate ${
                                  isCurrent ? 'text-[#E06C38]' : isPassed ? 'text-[#1D231E]' : 'text-[#8A9588]'
                                }`}>
                                  {stage.label}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mobile Stepper (Condensed) */}
                    <div className="md:hidden flex items-center justify-between bg-[#FAF6EE] p-3 rounded-2xl border border-[#E8E1D2]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E06C38] animate-pulse" />
                        <span className="text-xs font-bold text-[#1D231E]">
                          Stage {currentStageIndex + 1}/7: {ORDER_STAGES[currentStageIndex]?.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#6B7869]">
                        {ORDER_STAGES[currentStageIndex]?.description}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. The final total_amount (once quoted — show "Awaiting quote" if pending_quote) & Click Action */}
                <div className="pt-3 border-t border-[#E8E1D2]/80 flex items-center justify-between gap-3">
                  <div>
                    {isDeclined ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-rose-700">Status:</span>
                        <span className="text-xs font-medium text-rose-600">Request declined</span>
                      </div>
                    ) : hasQuotedAmount ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-[#5A6659]">Total Amount:</span>
                        <span className="text-lg sm:text-xl font-black font-serif text-[#1D231E]">
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>
                    ) : isRevisionRequested ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#5A6659]">Total Amount:</span>
                        <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 inline-flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                          Revision in review
                        </span>
                      </div>
                    ) : isCancelled ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Total Amount:</span>
                        <span className="text-xs font-medium text-gray-400">Order cancelled</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#5A6659]">Total Amount:</span>
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          Awaiting quote
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDetailOrder(order);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#E06C38] bg-[#E06C38]/10 group-hover:bg-[#E06C38] group-hover:text-white transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    <span>{isDeclined ? 'View Decline Details' : hasQuotedAmount ? 'View Quote Breakdown' : 'View Order Details'}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ORDER DETAIL & FULL ITEMIZED QUOTE MODAL */}
      {/* ========================================================================= */}
      {selectedDetailOrder && (() => {
        const order = selectedDetailOrder;
        const rawStatus = (order.fulfillment_status || order.status || 'pending_quote').toLowerCase();
        const currentStageIndex = getStageIndex(rawStatus);
        const orderTitle = order.title || order.title_name || `Custom Order #${order.id}`;
        const details = order.request_details || {};
        const isQuotedState = rawStatus === 'quoted';
        const isAwaitingPayment = rawStatus === 'awaiting_payment';
        const isPendingQuote = rawStatus === 'pending_quote' || rawStatus === 'received';
        const isRevisionRequested = rawStatus === 'revision_requested';
        const isCancelled = rawStatus === 'cancelled' || rawStatus === 'canceled';
        const isDeclined = rawStatus === 'declined';

        const isCustomStitched = order.order_type === 'custom_stitched' || 
          (order.title && order.title.toLowerCase().includes('stitched')) ||
          (details.order_type === 'custom_stitched');

        const isInProduction = rawStatus === 'in_production' || 
          rawStatus === 'in_progress' || 
          currentStageIndex === 3;

        const isShipped = rawStatus === 'shipped' || currentStageIndex === 5 || currentStageIndex === 6 || Boolean(order.tracking_number);

        const revisionCount = (order.quote_history && Array.isArray(order.quote_history)) ? order.quote_history.length : 0;
        const hasReachedRevisionLimit = revisionCount >= 2;

        const progressPercent = typeof order.progress_percent === 'number' 
          ? Math.min(100, Math.max(0, order.progress_percent))
          : order.progress_percent !== undefined
          ? Math.min(100, Math.max(0, Number(order.progress_percent) || 0))
          : 0;

        const progressNote = order.progress_note || details.progress_note || (
          progressPercent > 0 
            ? `${progressPercent}% stitched — Studio hand embroidery actively underway.`
            : 'Artisan hand stitching and fabric mounting in progress.'
        );

        const quote: any = (typeof order.quote === 'object' && order.quote !== null) ? order.quote : {};
        const lineItems: any[] = quote.line_items || [];
        const hasLineItems = Array.isArray(lineItems) && lineItems.length > 0;
        const hasQuoteData = (!isPendingQuote && !isDeclined) || hasLineItems || (Number(order.quoted_price) > 0);

        const itemsSubtotal = quote.items_subtotal !== undefined 
          ? Number(quote.items_subtotal) 
          : hasLineItems
          ? lineItems.reduce((acc: number, it: any) => acc + (Number(it.total) || (Number(it.quantity) * Number(it.unit_price)) || 0), 0)
          : Number(quote.item_price) || Number(order.item_price) || 0;

        const craftingCharge = Number(quote.crafting_charge) || 0;
        const discountPercent = Number(quote.discount_percent) || 0;
        const discountAmount = Number(quote.discount_amount) || 0;
        const deliveryCharge = Number(quote.delivery_charge) || Number(order.delivery_charge) || 0;
        const discountableAmount = itemsSubtotal + craftingCharge;
        const totalAmount = Number(quote.total_amount) || Number(order.quoted_price) || Number(order.total_amount) || (discountableAmount - discountAmount + deliveryCharge);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div 
              className="bg-white rounded-3xl border border-[#E8E1D2] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[#E8E1D2] bg-white shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-3.5">
                  {order.image_url ? (
                    <img
                      src={order.image_url}
                      alt={orderTitle}
                      className="w-14 h-14 rounded-2xl object-cover border border-[#E8E1D2] shrink-0 shadow-2xs"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center shrink-0">
                      <Package className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[#1D231E]">
                        {orderTitle}
                      </h3>
                      {isCustomStitched && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E06C38] bg-[#E06C38]/10 px-2.5 py-0.5 rounded-full">
                          <Scissors className="w-2.5 h-2.5" /> Keepsake
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B7869] mt-1">
                      <span className="font-mono font-semibold text-[#8A9588]">
                        Order #{String(order.raw_order_id || order.id).replace('order_', '').slice(-8)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#8A9588]" />
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(rawStatus)}
                  <button
                    type="button"
                    onClick={() => setSelectedDetailOrder(null)}
                    className="p-2 text-[#8A9588] hover:text-[#1D231E] hover:bg-[#FAF6EE] rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 overscroll-contain">

              {/* Revision Requested State Banner */}
              {isRevisionRequested && (
                <div className="p-4 sm:p-5 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    <span>Revision Requested — Studio Artisan Reviewing</span>
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed">
                    You requested revisions for this quotation. Our studio master is currently reviewing your notes and preparing an updated itemized quote.
                  </p>
                  {order.customer_feedback && (
                    <div className="p-3 bg-white/95 rounded-xl border border-amber-200 text-xs text-amber-900 shadow-2xs">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800 block mb-0.5">
                        Your Feedback / Revision Notes:
                      </span>
                      <p className="italic text-[#1D231E]">"{order.customer_feedback}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cancelled State Banner */}
              {isCancelled && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">
                      Order Cancelled
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                      This order has been cancelled and is no longer active. You may submit a new custom request anytime.
                    </p>
                  </div>
                </div>
              )}

              {/* Declined State Banner in Modal */}
              {isDeclined && (
                <div className="p-5 sm:p-6 bg-rose-50/90 border border-rose-200 rounded-3xl space-y-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-sm sm:text-base">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>We're unable to fulfill this request</span>
                  </div>
                  {order.status_note ? (
                    <div className="p-3.5 bg-white rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1 shadow-2xs">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-rose-800 block">
                        Reason from Studio Artisan:
                      </span>
                      <p className="leading-relaxed font-medium">{order.status_note}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-800 leading-relaxed">
                      Our studio artisans reviewed your custom request specifications and determined that we cannot fulfill this order at this time.
                    </p>
                  )}
                  <p className="text-[11px] text-rose-700">
                    All actions for this order have been closed. If you have questions or want to try a different design, feel free to submit a new request or reach out to support.
                  </p>
                </div>
              )}

              {/* ================================================================= */}
              {/* CASE 1: PENDING QUOTE (NO QUOTE DATA YET) */}
              {/* ================================================================= */}
              {!isDeclined && isPendingQuote && !hasQuoteData ? (
                <div className="p-6 sm:p-8 bg-[#FAF6EE] border-2 border-dashed border-[#D5CDBC] rounded-3xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-base font-bold text-[#1D231E]">
                    We're preparing your quote — check back soon
                  </h4>
                  <p className="text-xs text-[#5A6659] max-w-md mx-auto leading-relaxed">
                    Our studio artisans are currently calculating your DMC thread skein counts, premium fabric dimensions, and workshop preparation time. You'll receive a full itemized quote breakdown here once ready.
                  </p>
                </div>
              ) : !isDeclined ? (
                /* ================================================================= */
                /* CASE 2: FULL ITEMIZED QUOTE BREAKDOWN */
                /* ================================================================= */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#5A6659] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#E06C38]" /> Itemized Quote Breakdown
                    </h4>
                    {isQuotedState && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full border border-orange-200">
                        Ready for approval
                      </span>
                    )}
                  </div>

                  {/* Table Structure matching exact format requested */}
                  <div className="bg-[#FAF6EE]/50 rounded-2xl border border-[#E8E1D2] overflow-hidden shadow-2xs">
                    {hasLineItems ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#E8E1D2] text-[11px] font-bold uppercase tracking-wider text-[#5A6659] bg-[#FAF6EE]">
                              <th className="py-3 px-4 font-bold">Item</th>
                              <th className="py-3 px-3 font-bold text-center">Qty</th>
                              <th className="py-3 px-3 font-bold text-right">Unit Price</th>
                              <th className="py-3 px-4 font-bold text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E8E1D2]/80 bg-white">
                            {lineItems.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-[#FAF6EE]/30 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    {item.hex && (
                                      <span
                                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 shadow-2xs"
                                        style={{ backgroundColor: item.hex }}
                                        title={item.dmc_code ? `DMC #${item.dmc_code}` : undefined}
                                      />
                                    )}
                                    <span className="font-semibold text-[#1D231E]">{item.description}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center font-medium text-[#1D231E]">
                                  {item.quantity} {item.unit ? `(${item.unit})` : ''}
                                </td>
                                <td className="py-3 px-3 text-right text-[#5A6659] font-mono">
                                  ${Number(item.unit_price).toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-[#1D231E] font-mono">
                                  ${Number(item.total).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Fallback for legacy flat quotes */
                      <div className="p-4 bg-white border-b border-[#E8E1D2] text-xs flex justify-between items-center">
                        <span className="font-semibold text-[#1D231E]">Custom Materials & Crafting</span>
                        <span className="font-bold text-[#1D231E] font-mono">${itemsSubtotal.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Subtotals & Grand Total Section */}
                    <div className="p-4 bg-[#FAF6EE] border-t border-[#E8E1D2] space-y-2 text-xs">
                      {craftingCharge > 0 ? (
                        <>
                          <div className="flex justify-between text-[#5A6659]">
                            <span>Items Subtotal:</span>
                            <span className="font-semibold font-mono text-[#1D231E]">
                              ${itemsSubtotal.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[#5A6659]">
                            <span className="flex items-center gap-1.5">
                              <Scissors className="w-3.5 h-3.5 text-[#2D5A43]" /> Crafting Charge:
                            </span>
                            <span className="font-semibold font-mono text-[#1D231E]">
                              ${craftingCharge.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[#1D231E] font-medium pt-1 border-t border-[#E8E1D2]/60">
                            <span>Items + Crafting Subtotal:</span>
                            <span className="font-semibold font-mono text-[#1D231E]">
                              ${(itemsSubtotal + craftingCharge).toFixed(2)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-[#5A6659]">
                          <span>Items Subtotal:</span>
                          <span className="font-semibold font-mono text-[#1D231E]">
                            ${itemsSubtotal.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-800 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Studio member discount ({discountPercent || 15}%):
                          </span>
                          <span className="font-bold font-mono text-emerald-700">
                            -${discountAmount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-[#5A6659]">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-[#E06C38]" /> Delivery:
                        </span>
                        <span className="font-semibold font-mono text-[#1D231E]">
                          ${deliveryCharge.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between pt-2.5 border-t border-[#D5CDBC] text-sm font-bold text-[#1D231E]">
                        <span>Total:</span>
                        <span className="text-base font-black font-serif text-[#E06C38]">
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Studio Artisan Notes */}
                  {(quote.admin_notes || order.status_note || order.admin_notes) && (
                    <div className="p-4 bg-[#FAF6EE] rounded-2xl border border-[#E8E1D2] text-xs text-[#1D231E]">
                      <p className="font-bold text-[#556653] text-[11px] mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#E06C38]" /> Studio Artisan Note:
                      </p>
                      <p className="leading-relaxed text-[#1D231E]/90">
                        {quote.admin_notes || order.status_note || order.admin_notes}
                      </p>
                    </div>
                  )}

                  {/* Previous Quotes History Accordion */}
                  {order.quote_history && Array.isArray(order.quote_history) && order.quote_history.length > 0 && (
                    <div className="bg-[#FAF6EE]/70 rounded-2xl border border-[#E8E1D2] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleOrderHistory(order.raw_order_id || order.id)}
                        className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-[#1D231E] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <History className="w-4 h-4 text-[#E06C38]" />
                          <span>Previous Quote Versions ({order.quote_history.length})</span>
                        </span>
                        <span className="text-[#5A6659] text-[11px] flex items-center gap-1">
                          {expandedHistoryOrders[String(order.raw_order_id || order.id)] ? 'Hide History' : 'View History'}
                          {expandedHistoryOrders[String(order.raw_order_id || order.id)] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </button>

                      {expandedHistoryOrders[String(order.raw_order_id || order.id)] && (
                        <div className="p-4 pt-0 space-y-3 border-t border-[#E8E1D2]/80 divide-y divide-[#E8E1D2]">
                          {order.quote_history.map((prevQuote: ArchivedQuote, qIdx: number) => (
                            <div key={qIdx} className="pt-3 first:pt-0 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#5A6659] text-[11px]">
                                  Version #{qIdx + 1}
                                  {prevQuote.superseded_at && ` • ${formatDate(prevQuote.superseded_at)}`}
                                </span>
                                <span className="font-bold text-[#1D231E] font-mono">
                                  ${(Number(prevQuote.total_amount) || Number(prevQuote.quoted_price) || 0).toFixed(2)}
                                </span>
                              </div>
                              {prevQuote.reason && (
                                <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                                  <span className="font-semibold">Superseded Reason:</span> "{prevQuote.reason}"
                                </div>
                              )}
                              {prevQuote.line_items && prevQuote.line_items.length > 0 && (
                                <p className="text-[11px] text-[#6B7869]">
                                  {prevQuote.line_items.length} itemized line {prevQuote.line_items.length === 1 ? 'item' : 'items'}
                                  {prevQuote.delivery_charge !== undefined && ` + $${Number(prevQuote.delivery_charge).toFixed(2)} delivery`}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quoted State Action Buttons */}
                  {isQuotedState && (
                    <div className="pt-3 border-t border-[#E8E1D2] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {hasReachedRevisionLimit ? (
                          <span className="text-[11px] text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 leading-tight max-w-xs">
                            You've reached the maximum number of revisions for this order — please contact support for further changes.
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenRevision(order)}
                            className="px-4 py-2.5 bg-white hover:bg-[#FAF6EE] text-[#1D231E] border border-[#1D231E]/20 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            <span>Request Revision</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenCancel(order)}
                          className="px-4 py-2.5 bg-transparent hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-semibold rounded-full transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Cancel Order</span>
                        </button>
                      </div>

                      {/* Confirm Order Button */}
                      <button
                        onClick={() => handleConfirmQuote(order)}
                        disabled={confirmingOrderId === (order.raw_order_id || order.id)}
                        className="px-6 py-2.5 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {confirmingOrderId === (order.raw_order_id || order.id) ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Confirming Order...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#E06C38]" />
                            <span>Confirm Order</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Awaiting Payment Banner */}
                  {isAwaitingPayment && (
                    <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 animate-spin" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-900">
                          Quote Confirmed — Awaiting Payment Verification
                        </h4>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                          We have recorded your confirmation. Please proceed with payment or await our studio coordinator to finalize the processing receipt.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* LIVE WORKSHOP PROGRESS: ONLY for custom_stitched when in_production or later */}
              {isCustomStitched && ['in_production', 'in_progress', 'quality_check', 'completed', 'shipped', 'delivered'].includes(rawStatus) && (
                <div className="p-5 bg-gradient-to-r from-amber-50/80 via-[#FFF9F2] to-orange-50/80 border-2 border-[#E06C38]/30 rounded-3xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E06C38] flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Live Workshop Progress
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black font-mono text-[#E06C38]">
                        {progressPercent}% completed
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setViewOnlyTrackerOrder(order);
                          setIsViewOnlyTrackerOpen(true);
                        }}
                        className="px-3 py-1 bg-[#2D5A43] hover:bg-[#234734] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Interactive Stitch View →</span>
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-[#E8E1D2] rounded-full overflow-hidden p-0.5 border border-[#D5CDBC]/60">
                    <div 
                      className="h-full bg-gradient-to-r from-[#E06C38] via-[#e87c4d] to-[#2D5A43] rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.max(4, progressPercent)}%` }}
                    />
                  </div>
                  {progressNote && (
                    <p className="text-xs text-[#1D231E] font-medium leading-relaxed">
                      "{progressNote}"
                    </p>
                  )}
                  {order.progress_updated_at && (
                    <p className="text-[10px] text-[#5A6659]">
                      Last updated: {new Date(order.progress_updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* SHIPPED TRACKING NUMBER */}
              {isShipped && order.tracking_number && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Truck className="w-5 h-5 text-sky-600 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 block">
                        Courier Tracking
                      </span>
                      <span className="font-mono text-xs font-bold text-sky-950">
                        {order.tracking_number}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyTracking(order.tracking_number!)}
                    className="px-3 py-1.5 bg-white hover:bg-sky-100 text-sky-900 text-xs font-semibold rounded-xl border border-sky-300 transition-colors cursor-pointer"
                  >
                    {copiedTracking === order.tracking_number ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              )}

              {/* Order Specs & Destination Summary */}
              <div className="pt-4 border-t border-[#E8E1D2] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {order.estimated_completion && (
                  <div className="p-3.5 bg-[#FAF6EE] rounded-2xl border border-[#E8E1D2]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9588] block">
                      Estimated Turnaround
                    </span>
                    <span className="font-semibold text-[#1D231E] mt-0.5 block">
                      {order.estimated_completion}
                    </span>
                  </div>
                )}
                {(details.delivery_address || details.phone_number || details.phone) && (
                  <div className="p-3.5 bg-[#FAF6EE] rounded-2xl border border-[#E8E1D2]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9588] block">
                      Delivery Destination
                    </span>
                    {details.delivery_address && (
                      <span className="font-medium text-[#1D231E] mt-0.5 block line-clamp-2">
                        {details.delivery_address}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDetailOrder(null)}
                  className="px-5 py-2 bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#1D231E] text-xs font-bold rounded-full transition-colors cursor-pointer"
                >
                  Close View
                </button>
              </div>

            </div>
          </div>
        </div>
        );
      })()}

      {/* Request Revision Modal Dialog */}
      {revisionModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E8E1D2] max-w-lg w-full max-h-[90vh] flex flex-col p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp overflow-y-auto overscroll-contain">
            <div className="flex items-start justify-between gap-3 border-b border-[#E8E1D2] pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D231E]">Request Quote Revision</h3>
                  <p className="text-xs text-[#6B7869]">
                    Order #{String(revisionModalOrder.raw_order_id || revisionModalOrder.id).replace('order_', '').slice(-8)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevisionModalOrder(null)}
                disabled={isSubmittingRevision}
                className="p-2 text-[#8A9588] hover:text-[#1D231E] hover:bg-[#FAF6EE] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#1D231E]">
                Let us know what you'd like changed (price, materials, size, etc.)
              </label>
              <textarea
                value={revisionText}
                onChange={(e) => setRevisionText(e.target.value)}
                placeholder="e.g. Could we reduce the canvas size, adjust thread skein counts, or modify the shipping arrangement?"
                rows={4}
                disabled={isSubmittingRevision}
                className="w-full px-4 py-3 rounded-2xl bg-[#FAF6EE]/60 border border-[#D5CDBC] text-xs text-[#1D231E] placeholder:text-[#8A9588] focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:border-transparent transition-all resize-none"
              />
              <p className="text-[11px] text-[#8A9588] leading-relaxed">
                Submitting this request will archive the current quote and notify our studio artisans to adjust your order requirements.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E8E1D2] shrink-0">
              <button
                type="button"
                onClick={() => setRevisionModalOrder(null)}
                disabled={isSubmittingRevision}
                className="px-4 py-2 text-xs font-semibold text-[#5A6659] hover:text-[#1D231E] rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRevision}
                disabled={isSubmittingRevision}
                className="px-5 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSubmittingRevision ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Submit Revision Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Dialog */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-rose-200 max-w-md w-full max-h-[90vh] flex flex-col p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp overflow-y-auto overscroll-contain">
            <div className="flex items-start gap-3.5 shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1D231E]">Cancel Order Confirmation</h3>
                <p className="text-xs text-rose-800 font-medium mt-1">
                  Are you sure you want to cancel this order? This can't be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#6B7869] leading-relaxed">
              Cancelling will permanently close this custom order request and no further quotes or production will take place.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E8E1D2] shrink-0">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-semibold text-[#5A6659] hover:text-[#1D231E] rounded-full transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSubmittingCancel ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling Order...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Yes, Cancel Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer View-Only Stitch Tracker Modal */}
      {isViewOnlyTrackerOpen && viewOnlyTrackerOrder && (
        <StitchTrackerModal
          isOpen={isViewOnlyTrackerOpen}
          mode="view-only"
          order={viewOnlyTrackerOrder}
          onClose={() => {
            setIsViewOnlyTrackerOpen(false);
            setViewOnlyTrackerOrder(null);
            loadOrders(false);
          }}
        />
      )}

    </div>
  );
};

export default CustomOrdersTab;
