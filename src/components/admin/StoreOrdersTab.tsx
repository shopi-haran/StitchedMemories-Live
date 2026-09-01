import React, { useState, useMemo } from 'react';
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  Search,
  RefreshCw,
  MapPin,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  Lock,
  Edit3,
  X,
  Loader2,
  ArrowRight,
  Filter,
  Eye
} from 'lucide-react';
import { SupabaseStitchOrderRow } from '../../lib/supabase';
import { StoreOrderItem } from '../../types';

export const STORE_ORDER_STAGES = [
  { id: 'received', label: 'Received', icon: Package, description: 'Order & payment received' },
  { id: 'processing', label: 'Processing', icon: Clock, description: 'Items being prepared & packaged' },
  { id: 'shipped', label: 'Shipped', icon: Truck, description: 'Dispatched with tracking' },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle2, description: 'Delivered to customer' },
] as const;

export function getStoreStageIndex(statusRaw?: string): number {
  if (!statusRaw) return 0;
  const s = statusRaw.toLowerCase().trim();
  if (s === 'delivered' || s.includes('deliver') || s.includes('complete')) return 3;
  if (s === 'shipped' || s.includes('ship') || s.includes('transit') || s.includes('dispatch')) return 2;
  if (s === 'processing' || s === 'in_progress' || s === 'preparing' || s.includes('process')) return 1;
  return 0; // received
}

interface StoreOrdersTabProps {
  orders: SupabaseStitchOrderRow[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onUpdateOrder: (
    orderId: string | number,
    updates: {
      fulfillment_status?: string;
      tracking_number?: string;
      status_note?: string;
      admin_notes?: string;
      estimated_completion?: string;
    }
  ) => Promise<{ success: boolean; error?: any }>;
  showToast: (msg: string) => void;
  renderStatusBadge?: (status?: string) => React.ReactNode;
}

export const StoreOrdersTab: React.FC<StoreOrdersTabProps> = ({
  orders,
  isLoading,
  onRefresh,
  onUpdateOrder,
  showToast,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'processing' | 'shipped' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [shippingModalOrder, setShippingModalOrder] = useState<SupabaseStitchOrderRow | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [carrierInput, setCarrierInput] = useState('USPS Priority Mail');
  const [shippingNoteInput, setShippingNoteInput] = useState('');
  const [isSubmittingShipment, setIsSubmittingShipment] = useState(false);

  const [editModalOrder, setEditModalOrder] = useState<SupabaseStitchOrderRow | null>(null);
  const [editStatus, setEditStatus] = useState<'received' | 'processing' | 'shipped' | 'delivered'>('received');
  const [editTracking, setEditTracking] = useState('');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [editStatusNote, setEditStatusNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Filter store orders only
  const allStoreOrders = useMemo(() => {
    return orders.filter((o) => {
      const type = (o.order_type || '').toLowerCase();
      const detailsType = (o.request_details?.order_type || '').toLowerCase();
      return type === 'store' || detailsType === 'store';
    });
  }, [orders]);

  // Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let receivedCount = 0;
    let processingCount = 0;
    let shippedCount = 0;
    let deliveredCount = 0;

    for (const o of allStoreOrders) {
      const amount = Number(o.total_amount || o.quoted_price || 0);
      totalRevenue += amount;

      const idx = getStoreStageIndex(o.fulfillment_status || o.status);
      if (idx === 0) receivedCount++;
      else if (idx === 1) processingCount++;
      else if (idx === 2) shippedCount++;
      else if (idx === 3) deliveredCount++;
    }

    return {
      totalOrders: allStoreOrders.length,
      totalRevenue,
      receivedCount,
      processingCount,
      shippedCount,
      deliveredCount,
      activeProcessing: receivedCount + processingCount,
    };
  }, [allStoreOrders]);

  // Filtered and sorted store orders
  const filteredOrders = useMemo(() => {
    return allStoreOrders.filter((order) => {
      const stageIdx = getStoreStageIndex(order.fulfillment_status || order.status);

      // Status filter
      if (statusFilter === 'received' && stageIdx !== 0) return false;
      if (statusFilter === 'processing' && stageIdx !== 1) return false;
      if (statusFilter === 'shipped' && stageIdx !== 2) return false;
      if (statusFilter === 'delivered' && stageIdx !== 3) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const details = order.request_details || {};
        const items = (Array.isArray(order.items) ? order.items : details.items) || [];
        const itemsText = items.map((it: any) => `${it.title || ''} ${it.name || ''}`).join(' ');

        const matchId = String(order.id || '').toLowerCase().includes(q) || String(order.raw_order_id || '').toLowerCase().includes(q);
        const matchName = String(order.customer_name || details.customer_name || details.name || '').toLowerCase().includes(q);
        const matchEmail = String(order.customer_email || order.user_id || details.customer_email || '').toLowerCase().includes(q);
        const matchAddress = String(details.delivery_address || details.address || '').toLowerCase().includes(q);
        const matchTracking = String(order.tracking_number || '').toLowerCase().includes(q);
        const matchItems = itemsText.toLowerCase().includes(q);

        if (!matchId && !matchName && !matchEmail && !matchAddress && !matchTracking && !matchItems) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [allStoreOrders, statusFilter, searchQuery, sortOrder]);

  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(code);
    showToast('Tracking number copied to clipboard!');
    setTimeout(() => setCopiedTracking(null), 2500);
  };

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    try {
      await onRefresh();
      showToast('Store orders refreshed from database.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Quick Action: Advance to Processing
  const handleAdvanceToProcessing = async (order: SupabaseStitchOrderRow) => {
    const rawId = order.raw_order_id || order.id;
    const res = await onUpdateOrder(rawId, {
      fulfillment_status: 'processing',
      status_note: 'Items are now being picked, packaged, and prepared for shipment.',
    });
    if (res.success) {
      showToast(`Order #${order.id} marked as Processing!`);
    } else {
      showToast('Failed to update status. Please try again.');
    }
  };

  // Open Ship Modal
  const handleOpenShipModal = (order: SupabaseStitchOrderRow) => {
    setShippingModalOrder(order);
    setTrackingNumberInput(order.tracking_number || '');
    setCarrierInput('USPS Priority Mail');
    setShippingNoteInput('Package has been dispatched and handed over to courier.');
  };

  // Submit Shipment
  const handleConfirmShipment = async () => {
    if (!shippingModalOrder) return;
    if (!trackingNumberInput.trim()) {
      showToast('Please enter a valid tracking number.');
      return;
    }

    setIsSubmittingShipment(true);
    try {
      const rawId = shippingModalOrder.raw_order_id || shippingModalOrder.id;
      const combinedTracking = carrierInput.trim()
        ? `${carrierInput.trim()}: ${trackingNumberInput.trim()}`
        : trackingNumberInput.trim();

      const res = await onUpdateOrder(rawId, {
        fulfillment_status: 'shipped',
        tracking_number: combinedTracking,
        status_note: shippingNoteInput.trim() || 'Your package is on the way!',
      });

      if (res.success) {
        showToast(`Order #${shippingModalOrder.id} successfully marked as Shipped!`);
        setShippingModalOrder(null);
      } else {
        showToast('Failed to mark order as shipped.');
      }
    } finally {
      setIsSubmittingShipment(false);
    }
  };

  // Quick Action: Advance to Delivered
  const handleAdvanceToDelivered = async (order: SupabaseStitchOrderRow) => {
    const rawId = order.raw_order_id || order.id;
    const res = await onUpdateOrder(rawId, {
      fulfillment_status: 'delivered',
      status_note: 'Order has been safely delivered to customer.',
    });
    if (res.success) {
      showToast(`Order #${order.id} marked as Delivered!`);
    } else {
      showToast('Failed to mark as delivered.');
    }
  };

  // Open Edit Order Modal
  const handleOpenEditModal = (order: SupabaseStitchOrderRow) => {
    const stageIdx = getStoreStageIndex(order.fulfillment_status || order.status);
    const stages: ('received' | 'processing' | 'shipped' | 'delivered')[] = ['received', 'processing', 'shipped', 'delivered'];
    setEditModalOrder(order);
    setEditStatus(stages[stageIdx]);
    setEditTracking(order.tracking_number || '');
    setEditAdminNotes(order.admin_notes || '');
    setEditStatusNote(order.status_note || '');
  };

  // Save Edit Order
  const handleSaveEditModal = async () => {
    if (!editModalOrder) return;
    const rawId = editModalOrder.raw_order_id || editModalOrder.id;
    const currentIdx = getStoreStageIndex(editModalOrder.fulfillment_status || editModalOrder.status);

    // Rule: Backward progression lock: once 'delivered', status cannot be moved back to an earlier stage
    if (currentIdx === 3 && editStatus !== 'delivered') {
      showToast('Delivered orders cannot be moved back to an earlier stage.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await onUpdateOrder(rawId, {
        fulfillment_status: editStatus,
        tracking_number: editTracking.trim() || undefined,
        admin_notes: editAdminNotes.trim() || undefined,
        status_note: editStatusNote.trim() || undefined,
      });

      if (res.success) {
        showToast(`Order #${editModalOrder.id} updated successfully!`);
        setEditModalOrder(null);
      } else {
        showToast('Failed to update order details.');
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Overview Stats Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8E1D2] shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-[#E06C38]/10 text-[#E06C38] text-[10px] font-extrabold uppercase tracking-wider">
                Store Fulfillment Desk
              </span>
              <span className="text-xs text-[#5A6659]">• 4-Stage Store Lifecycle</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1D231E] mt-1 font-serif">
              Store Orders
            </h2>
            <p className="text-xs text-[#5A6659] mt-0.5 max-w-2xl">
              Fulfill ready-made inventory purchases through the standard 4-stage pipeline: <strong>Received → Processing → Shipped → Delivered</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isSyncing || isLoading}
              className="px-4 py-2 bg-[#FAF6EE] hover:bg-[#EFE7D8] text-[#1D231E] rounded-xl text-xs font-bold transition-colors border border-[#D5CDC0] flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#E06C38]' : ''}`} />
              <span>{isSyncing ? 'Refreshing...' : 'Refresh Orders'}</span>
            </button>
          </div>
        </div>

        {/* 5 Stats Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 pt-2 border-t border-[#F0EBE1]">
          <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-[#E8E1D2]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#70806E] block mb-1">
              Total Orders
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-[#1D231E]">
                {stats.totalOrders}
              </span>
              <span className="text-[10px] text-[#70806E]">purchases</span>
            </div>
          </div>

          <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-[#E8E1D2]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#70806E] block mb-1">
              Store Sales
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-emerald-800">
                ${stats.totalRevenue.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block mb-1">
              Action Required
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-amber-900">
                {stats.activeProcessing}
              </span>
              <span className="text-[10px] text-amber-700 font-medium">to pack/ship</span>
            </div>
          </div>

          <div className="bg-sky-50/80 p-4 rounded-2xl border border-sky-200">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800 block mb-1">
              In Transit
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-sky-900">
                {stats.shippedCount}
              </span>
              <span className="text-[10px] text-sky-700 font-medium">shipped</span>
            </div>
          </div>

          <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block mb-1">
              Delivered
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-emerald-900">
                {stats.deliveredCount}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8E1D2] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-[#1D231E] text-white shadow-xs'
                : 'bg-[#FAF6EE] text-[#5A6659] hover:bg-[#EFE7D8] hover:text-[#1D231E]'
            }`}
          >
            <span>All</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-black/10 text-[#5A6659]'}`}>
              {stats.totalOrders}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('received')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'received'
                ? 'bg-[#E06C38] text-white shadow-xs'
                : 'bg-[#FAF6EE] text-[#5A6659] hover:bg-[#EFE7D8] hover:text-[#1D231E]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Received</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'received' ? 'bg-white/20 text-white' : 'bg-black/10 text-[#5A6659]'}`}>
              {stats.receivedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('processing')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'processing'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[#FAF6EE] text-[#5A6659] hover:bg-[#EFE7D8] hover:text-[#1D231E]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Processing</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'processing' ? 'bg-white/20 text-white' : 'bg-black/10 text-[#5A6659]'}`}>
              {stats.processingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('shipped')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'shipped'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-[#FAF6EE] text-[#5A6659] hover:bg-[#EFE7D8] hover:text-[#1D231E]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Shipped</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'shipped' ? 'bg-white/20 text-white' : 'bg-black/10 text-[#5A6659]'}`}>
              {stats.shippedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'delivered'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-[#FAF6EE] text-[#5A6659] hover:bg-[#EFE7D8] hover:text-[#1D231E]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Delivered</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'delivered' ? 'bg-white/20 text-white' : 'bg-black/10 text-[#5A6659]'}`}>
              {stats.deliveredCount}
            </span>
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-[#70806E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, customer, item..."
              className="w-full pl-9 pr-4 py-2 bg-[#FAF6EE] border border-[#D5CDC0] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#E06C38] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            aria-label="Sort orders by date"
            className="px-3 py-2 bg-[#FAF6EE] border border-[#D5CDC0] rounded-xl text-xs font-semibold text-[#1D231E] focus:outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 sm:p-16 border border-[#E8E1D2] text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#FAF6EE] text-[#70806E] flex items-center justify-center mx-auto border border-[#E8E1D2]">
            <ShoppingBag className="w-8 h-8 text-[#E06C38]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1D231E]">No Store Orders Found</h3>
            <p className="text-xs text-[#5A6659] mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search terms or status filter.'
                : 'When customers purchase kits and ready-made items from the Store, their orders will appear here automatically.'}
            </p>
          </div>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-[#FAF6EE] hover:bg-[#EFE7D8] text-[#1D231E] text-xs font-bold rounded-xl border border-[#D5CDC0] transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const details = order.request_details || {};
            const items: StoreOrderItem[] = (Array.isArray(order.items) ? order.items : details.items) || [];
            const stageIdx = getStoreStageIndex(order.fulfillment_status || order.status);
            const totalAmount = Number(order.total_amount || order.quoted_price || 0);
            const customerName = order.customer_name || details.customer_name || details.name || 'Customer';
            const customerEmail = order.customer_email || order.user_id || details.customer_email || 'No email';
            const deliveryAddress = details.delivery_address || details.address || details.shipping_address;
            const customerPhone = details.phone || details.customer_phone || details.phone_number;
            const customerNotes = details.customer_notes || details.notes || details.instructions;

            const isDelivered = stageIdx === 3;
            const isShipped = stageIdx === 2;
            const isProcessing = stageIdx === 1;
            const isReceived = stageIdx === 0;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl border transition-all overflow-hidden p-6 sm:p-7 space-y-6 shadow-xs hover:shadow-md ${
                  isDelivered
                    ? 'border-emerald-200/90'
                    : isShipped
                    ? 'border-sky-200/90'
                    : isProcessing
                    ? 'border-amber-200/90'
                    : 'border-[#E8E1D2]'
                }`}
              >
                {/* Order Top Bar: ID, Date, Badges & Edit Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1]">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-mono text-sm font-bold text-[#1D231E] bg-[#FAF6EE] px-3 py-1 rounded-xl border border-[#E8E1D2]">
                      #{order.id}
                    </span>
                    <span className="text-xs text-[#70806E] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : 'Recent'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Paid • Online
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Fulfillment Status Pill */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isShipped
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : isProcessing
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#FAF6EE] text-[#E06C38] border border-[#E06C38]/30'
                      }`}
                    >
                      {isDelivered && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                      {isShipped && <Truck className="w-3.5 h-3.5 text-sky-700" />}
                      {isProcessing && <Clock className="w-3.5 h-3.5 text-amber-700" />}
                      {isReceived && <Package className="w-3.5 h-3.5 text-[#E06C38]" />}
                      <span>{STORE_ORDER_STAGES[stageIdx]?.label || 'Received'}</span>
                    </span>

                    {/* Edit Order Modal Trigger */}
                    <button
                      onClick={() => handleOpenEditModal(order)}
                      className="px-3 py-1 bg-[#FAF6EE] hover:bg-[#EFE7D8] text-[#1D231E] rounded-xl text-xs font-semibold transition-colors border border-[#D5CDC0] flex items-center gap-1.5 cursor-pointer"
                      title="Edit order details, tracking number, or notes"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#70806E]" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Main Content Grid: Items (Left) + Customer & Destination (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Products Ordered List (7 Cols) */}
                  <div className="lg:col-span-7 space-y-3">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#70806E] flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#E06C38]" />
                      <span>Items Ordered ({items.length || 1})</span>
                    </span>

                    <div className="bg-[#FAF6EE]/70 rounded-2xl border border-[#E8E1D2] divide-y divide-[#E8E1D2] overflow-hidden">
                      {items.length > 0 ? (
                        items.map((item, itIdx) => {
                          const itemImg = item.image || item.image_url || (Array.isArray(item.images) && item.images[0]) || '';
                          const qty = Number(item.quantity || 1);
                          const price = Number(item.price || 0);
                          const lineTotal = price * qty;

                          return (
                            <div key={itIdx} className="p-3.5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {itemImg ? (
                                  <img
                                    src={itemImg}
                                    alt={item.title || 'Product'}
                                    className="w-12 h-12 rounded-xl object-cover border border-[#E8E1D2] bg-white shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-[#E8E1D2]/80 text-[#70806E] flex items-center justify-center shrink-0">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs font-bold text-[#1D231E] leading-snug">
                                    {item.title || item.name || 'Store Item'}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-[#5A6659]">
                                    <span>Qty: <strong className="text-[#1D231E]">{qty}</strong></span>
                                    <span>•</span>
                                    <span>${price.toFixed(2)} each</span>
                                    {item.category && (
                                      <>
                                        <span>•</span>
                                        <span className="bg-white px-1.5 py-0.2 rounded border border-[#E8E1D2] text-[10px]">
                                          {item.category}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <span className="font-mono text-xs font-bold text-[#1D231E] shrink-0">
                                ${lineTotal.toFixed(2)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[#E8E1D2]/80 text-[#70806E] flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-[#1D231E]">
                                {order.title || 'Ready-Made Store Purchase'}
                              </h4>
                              <p className="text-[11px] text-[#5A6659]">Standard store inventory package</p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-[#1D231E]">
                            ${totalAmount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Total Bar */}
                      <div className="p-3 bg-[#FAF6EE] flex items-center justify-between text-xs font-bold text-[#1D231E]">
                        <span className="text-[#5A6659]">Total Paid:</span>
                        <span className="font-mono text-sm text-[#1D231E] font-black">
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Customer Info & Shipping Address (5 Cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#70806E] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#E06C38]" />
                      <span>Customer & Destination</span>
                    </span>

                    <div className="p-4 bg-[#FAF6EE]/70 rounded-2xl border border-[#E8E1D2] space-y-3 text-xs">
                      <div>
                        <span className="font-bold text-[#1D231E] block text-xs">
                          {customerName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5A6659] mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-[#70806E] shrink-0" />
                          <span className="truncate">{customerEmail}</span>
                        </div>
                        {customerPhone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#5A6659] mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-[#70806E] shrink-0" />
                            <span>{customerPhone}</span>
                          </div>
                        )}
                      </div>

                      {deliveryAddress ? (
                        <div className="pt-2 border-t border-[#E8E1D2]/80">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#70806E] block mb-0.5">
                            Shipping Address
                          </span>
                          <p className="text-[#1D231E] font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-[#E8E1D2] text-[11px]">
                            {deliveryAddress}
                          </p>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-[#E8E1D2]/80 text-[11px] text-gray-500 italic">
                          No physical address recorded on file.
                        </div>
                      )}

                      {customerNotes && (
                        <div className="pt-2 border-t border-[#E8E1D2]/80">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#70806E] block mb-0.5">
                            Customer Notes
                          </span>
                          <p className="text-[11px] text-[#1D231E] italic bg-white p-2 rounded-lg border border-[#E8E1D2]">
                            "{customerNotes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* 4-Stage Store Lifecycle Visual Stepper */}
                <div className="pt-4 border-t border-[#F0EBE1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#70806E]">
                      Store Order Pipeline (Step {stageIdx + 1} of 4)
                    </span>
                    <span className="text-xs font-bold text-[#1D231E]">
                      {STORE_ORDER_STAGES[stageIdx]?.description}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {STORE_ORDER_STAGES.map((stg, sIdx) => {
                      const isComplete = sIdx < stageIdx;
                      const isCurrent = sIdx === stageIdx;
                      const isUpcoming = sIdx > stageIdx;
                      const IconComponent = stg.icon;

                      return (
                        <div
                          key={stg.id}
                          className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1 relative ${
                            isCurrent
                              ? 'bg-[#1D231E] text-white border-[#1D231E] shadow-sm ring-2 ring-[#E06C38]/40'
                              : isComplete
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : 'bg-[#FAF6EE] text-[#8A9588] border-[#E8E1D2]'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {isComplete ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <IconComponent className={`w-3.5 h-3.5 ${isCurrent ? 'text-[#E06C38]' : 'text-[#8A9588]'}`} />
                            )}
                            <span className="text-xs font-bold whitespace-nowrap">
                              {stg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Courier Tracking Box (if tracking exists) */}
                {order.tracking_number && (
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800 block">
                          Dispatched Courier Tracking
                        </span>
                        <span className="font-mono text-xs font-bold text-sky-950">
                          {order.tracking_number}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyTracking(order.tracking_number!)}
                      className="px-3 py-1.5 bg-white hover:bg-sky-100 text-sky-900 text-xs font-bold rounded-xl border border-sky-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
                    >
                      {copiedTracking === order.tracking_number ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-sky-700" />
                          <span>Copy Tracking Code</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Admin Action Bar: Direct Stage Advancements */}
                <div className="pt-4 border-t border-[#F0EBE1] flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#5A6659]">
                    {isDelivered && (
                      <span className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Fulfillment Completed & Delivered (Locked)</span>
                      </span>
                    )}
                    {isShipped && (
                      <span className="text-sky-800 font-medium">
                        Package dispatched. Mark as delivered once confirmed by courier.
                      </span>
                    )}
                    {isProcessing && (
                      <span className="text-amber-800 font-medium">
                        Package in preparation. Ready to generate tracking label and ship.
                      </span>
                    )}
                    {isReceived && (
                      <span className="text-[#5A6659] font-medium">
                        New order paid. Ready to advance to processing.
                      </span>
                    )}
                  </div>

                  {/* Forward Progression Buttons */}
                  <div className="flex items-center gap-2">
                    {isReceived && (
                      <button
                        onClick={() => handleAdvanceToProcessing(order)}
                        className="px-5 py-2.5 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Advance to Processing</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isProcessing && (
                      <button
                        onClick={() => handleOpenShipModal(order)}
                        className="px-5 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Ship Order (Add Tracking)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isShipped && (
                      <button
                        onClick={() => handleAdvanceToDelivered(order)}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark as Delivered</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SHIP ORDER MODAL (Input Tracking Number & Courier) */}
      {/* ========================================================================= */}
      {shippingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E8E1D2] max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between gap-3 border-b border-[#E8E1D2] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D231E]">
                    Ship Store Order #{shippingModalOrder.id}
                  </h3>
                  <p className="text-xs text-[#5A6659]">
                    Provide shipment tracking number for the customer.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShippingModalOrder(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1D231E] mb-1">
                  Courier / Shipping Carrier
                </label>
                <input
                  type="text"
                  value={carrierInput}
                  onChange={(e) => setCarrierInput(e.target.value)}
                  placeholder="e.g. USPS Priority Mail, FedEx, UPS Ground, DHL"
                  className="w-full p-3 bg-[#FAF6EE] border border-[#D5CDC0] rounded-xl focus:bg-white focus:outline-none focus:border-[#E06C38] transition-colors"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D231E] mb-1">
                  Tracking Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  placeholder="e.g. 9400 1000 0000 0000 0000 00"
                  className="w-full p-3 bg-[#FAF6EE] border border-[#D5CDC0] rounded-xl font-mono focus:bg-white focus:outline-none focus:border-[#E06C38] transition-colors"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D231E] mb-1">
                  Customer Status Note
                </label>
                <textarea
                  rows={2}
                  value={shippingNoteInput}
                  onChange={(e) => setShippingNoteInput(e.target.value)}
                  placeholder="Note visible to customer..."
                  className="w-full p-3 bg-[#FAF6EE] border border-[#D5CDC0] rounded-xl focus:bg-white focus:outline-none focus:border-[#E06C38] transition-colors"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E8E1D2] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShippingModalOrder(null)}
                className="px-4 py-2 bg-[#FAF6EE] hover:bg-[#EFE7D8] text-[#1D231E] text-xs font-semibold rounded-xl border border-[#D5CDC0] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmShipment}
                disabled={isSubmittingShipment || !trackingNumberInput.trim()}
                className="px-6 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmittingShipment ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Shipment...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" />
                    <span>Confirm & Mark as Shipped</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT STORE ORDER MODAL */}
      {/* ========================================================================= */}
      {editModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E8E1D2] max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-[#E8E1D2] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF6EE] text-[#1D231E] flex items-center justify-center shrink-0 border border-[#E8E1D2]">
                  <Edit3 className="w-5 h-5 text-[#E06C38]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D231E]">
                    Edit Order #{editModalOrder.id}
                  </h3>
                  <p className="text-xs text-[#5A6659]">
                    Update fulfillment stage, tracking code, and internal notes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOrder(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Stage Selector */}
              <div>
                <label className="block font-bold text-[#1D231E] mb-1">
                  Fulfillment Stage
                </label>
                {getStoreStageIndex(editModalOrder.fulfillment_status || editModalOrder.status) === 3 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Delivered (Final stage — locked from moving backward)</span>
                  </div>
                ) : (
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-3 bg-[#FAF6EE] border border-[#D5CDC0] rounded-xl font-semibold text-[#1D231E] focus:bg-white focus:outline-none focus:border-[#E06C38] transition-colors cursor-pointer"
                  >
                    <option value="received">1. Received (Payment verified)</option>
                    <option value="processing">2. Processing (Packaging items)</option>
                    <option value="shipped">3. Shipped (In transit)</option>
                    <option value="delivered">4. Delivered (Completed)</option>
                  </select>
                )}
              </div>

              {/* Tracking Number */}
              <div>
                <label className="block font-bold text-[#1D231E] mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value)}
                  placeholder="e.g. USPS: 9400 1000 0000 0000 0000 00"
                  className="w-full p-3 bg-[#FAF6EE] border border-[#D5CDC0] rounded-xl font-mono focus:bg-white focus:outline-none focus:border-[#E06C38] transition-colors"
                />
              </div>

              {/* Customer Status Note */}
              <div>
                <label className="block font-bold text-[#1D231E] mb-1">
                  Customer Status Note (Public to customer)
                </label>
                <textarea
                  rows={2}
                  value={editStatusNote}
                  onChange={(e) => setEditStatusNote(e.target.value)}
                  placeholder="Message displayed on customer tracker..."
                  className="w-full p-3 bg-[#FAF6EE] border border-[#D5CDC0] rounded-xl focus:bg-white focus:outline-none focus:border-[#E06C38] transition-colors"
                />
              </div>

              {/* Admin Internal Notes */}
              <div>
                <label className="block font-bold text-[#1D231E] mb-1">
                  Internal Studio Notes (Private)
                </label>
                <textarea
                  rows={2}
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="Notes for studio staff only..."
                  className="w-full p-3 bg-[#FAF6EE] border border-[#D5CDC0] rounded-xl focus:bg-white focus:outline-none focus:border-[#E06C38] transition-colors"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E8E1D2] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditModalOrder(null)}
                className="px-4 py-2 bg-[#FAF6EE] hover:bg-[#EFE7D8] text-[#1D231E] text-xs font-semibold rounded-xl border border-[#D5CDC0] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEditModal}
                disabled={isSavingEdit}
                className="px-6 py-2.5 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#E06C38]" />
                    <span>Save Order Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
