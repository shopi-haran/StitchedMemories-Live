import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  ShoppingBag, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Package, 
  CreditCard,
  DollarSign,
  Truck,
  MapPin,
  Check,
  Copy,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { fetchUserStoreOrders, SupabaseOrderRow } from '../../lib/supabase';
import { StoreOrderItem } from '../../types';

export const STORE_ORDER_STAGES = [
  { id: 'received', label: 'Received', icon: Package, description: 'Order & payment confirmed' },
  { id: 'processing', label: 'Processing', icon: Clock, description: 'Items being prepared & packaged' },
  { id: 'shipped', label: 'Shipped', icon: Truck, description: 'Dispatched with tracking' },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle2, description: 'Delivered to your door' },
] as const;

export function getStoreStageIndex(statusRaw?: string): number {
  if (!statusRaw) return 0;
  const s = statusRaw.toLowerCase().trim();
  if (s === 'delivered' || s.includes('deliver') || s.includes('complete')) return 3;
  if (s === 'shipped' || s.includes('ship') || s.includes('transit') || s.includes('dispatch')) return 2;
  if (s === 'processing' || s === 'in_progress' || s === 'preparing' || s.includes('process')) return 1;
  return 0; // received
}

interface UserProfile {
  id?: string;
  name: string;
  email: string;
}

interface PurchasesTabProps {
  user: UserProfile;
  onNavigateToShop?: () => void;
}

export const PurchasesTab: React.FC<PurchasesTabProps> = ({ user, onNavigateToShop }) => {
  const [orders, setOrders] = useState<SupabaseOrderRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'processing' | 'shipped' | 'delivered'>('all');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserStoreOrders(user.id, user.email);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load store orders:', err);
      setError('Unable to load purchase history from Supabase.');
    } finally {
      setLoading(false);
    }
  }, [user.id, user.email]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(code);
    setTimeout(() => setCopiedTracking(null), 2500);
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

  const formatTotalAmount = (amount?: number | string) => {
    if (amount === undefined || amount === null || amount === '') return '$0.00';
    if (typeof amount === 'string' && amount.startsWith('$')) return amount;
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
    if (isNaN(num)) return String(amount);
    return `$${num.toFixed(2)}`;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const stageIdx = getStoreStageIndex(order.fulfillment_status || order.status);

      if (statusFilter === 'received' && stageIdx !== 0) return false;
      if (statusFilter === 'processing' && stageIdx !== 1) return false;
      if (statusFilter === 'shipped' && stageIdx !== 2) return false;
      if (statusFilter === 'delivered' && stageIdx !== 3) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const details = typeof order.request_details === 'string'
          ? (() => { try { return JSON.parse(order.request_details); } catch { return {}; } })()
          : order.request_details || {};
        const items = (Array.isArray(order.items) ? order.items : details.items) || [];
        const itemsText = items.map((it: any) => `${it.title || ''} ${it.name || ''}`).join(' ');

        const matchId = String(order.id || '').toLowerCase().includes(q);
        const matchTracking = String(order.tracking_number || '').toLowerCase().includes(q);
        const matchItems = itemsText.toLowerCase().includes(q);

        if (!matchId && !matchTracking && !matchItems) return false;
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#93A28F] block mb-1">
            Store Orders
          </span>
          <h2 className="text-2xl font-bold text-[#1D231E]">Purchases & Tracking</h2>
          <p className="text-xs text-[#5A6659] mt-1">
            Track your ready-made kits and store items live through the 4 fulfillment stages: <strong>Received → Processing → Shipped → Delivered</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOrders}
            title="Refresh order history"
            className="p-2 bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#5A6659] rounded-xl border border-[#D5CDBC] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E06C38]' : ''}`} />
          </button>

          {onNavigateToShop && (
            <button
              onClick={onNavigateToShop}
              className="px-4 py-2 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#E06C38]" />
              <span>Browse Store</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="p-6 bg-white border border-[#E8E1D2] rounded-3xl animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-[#E8E1D2] rounded w-48" />
                <div className="h-6 bg-[#E8E1D2] rounded w-24" />
              </div>
              <div className="h-16 bg-[#FAF6EE] rounded-2xl" />
              <div className="h-10 bg-[#E8E1D2] rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-rose-800">{error}</p>
          <button
            onClick={loadOrders}
            className="mt-3 px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-full hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-6">

          {/* Filter Bar */}
          <div className="bg-[#FAF6EE] p-3.5 rounded-2xl border border-[#E8E1D2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['all', 'received', 'processing', 'shipped', 'delivered'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-[#1D231E] text-white shadow-xs'
                      : 'bg-white text-[#5A6659] hover:bg-white/80 hover:text-[#1D231E] border border-[#E8E1D2]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-[#8A9588] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search purchases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 bg-white border border-[#D5CDC0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#E06C38]"
              />
            </div>
          </div>

          {/* Orders Cards List */}
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E1D2] text-[#5A6659] text-xs">
              No store orders match your filters.
            </div>
          ) : (
            <div className="space-y-5">
              {filteredOrders.map((order) => {
                const details = typeof order.request_details === 'string'
                  ? (() => { try { return JSON.parse(order.request_details); } catch { return {}; } })()
                  : order.request_details || {};
                
                const items: StoreOrderItem[] = (Array.isArray(order.items) ? order.items : details.items) || [];
                const stageIdx = getStoreStageIndex(order.fulfillment_status || order.status);
                const totalAmount = Number(order.total_amount || order.quoted_price || 0);
                const deliveryAddress = details.delivery_address || details.address || details.shipping_address;

                const isDelivered = stageIdx === 3;
                const isShipped = stageIdx === 2;
                const isProcessing = stageIdx === 1;
                const isReceived = stageIdx === 0;

                return (
                  <div
                    key={order.id}
                    className="bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 transition-all hover:shadow-md"
                  >
                    {/* Top Bar: Order ID, Date, Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1]">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="font-mono text-sm font-bold text-[#1D231E] bg-[#FAF6EE] px-3 py-1 rounded-xl border border-[#E8E1D2]">
                          #{String(order.id).replace('order_', '').slice(-8)}
                        </span>
                        <span className="text-xs text-[#70806E] flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(order.created_at)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Paid</span>
                        </span>
                      </div>

                      {/* Fulfillment Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto ${
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
                    </div>

                    {/* Items Breakdown */}
                    <div className="space-y-3">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#70806E] flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#E06C38]" />
                        <span>Purchased Items ({items.length || 1})</span>
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
                                      className="w-12 h-12 rounded-xl object-cover border border-[#E8E1D2] bg-white shrink-0 shadow-2xs"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-[#E8E1D2]/80 text-[#70806E] flex items-center justify-center shrink-0">
                                      <Package className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-xs font-bold text-[#1D231E]">
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
                                  {order.title || 'Store Inventory Package'}
                                </h4>
                                <p className="text-[11px] text-[#5A6659]">Ready-made kit & accessories</p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#1D231E]">
                              ${totalAmount.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Grand Total */}
                        <div className="p-3 bg-[#FAF6EE] flex items-center justify-between text-xs font-bold text-[#1D231E]">
                          <span className="text-[#5A6659]">Total Amount:</span>
                          <span className="font-mono text-sm text-[#1D231E] font-black">
                            ${totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4-Stage Store Order Progress Tracker */}
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#70806E]">
                          Fulfillment Progress (Stage {stageIdx + 1} of 4)
                        </span>
                        <span className="text-xs font-bold text-[#1D231E]">
                          {STORE_ORDER_STAGES[stageIdx]?.description}
                        </span>
                      </div>

                      {/* Desktop / Tablet Stepper */}
                      <div className="relative">
                        <div className="absolute top-4 left-6 right-6 h-1 bg-[#E8E1D2] -z-0 rounded-full" />
                        <div
                          className="absolute top-4 left-6 h-1 bg-[#E06C38] -z-0 transition-all duration-700 ease-out rounded-full"
                          style={{
                            width: `${(stageIdx / (STORE_ORDER_STAGES.length - 1)) * 88}%`
                          }}
                        />

                        <div className="grid grid-cols-4 gap-2 relative z-10">
                          {STORE_ORDER_STAGES.map((stg, sIdx) => {
                            const isPassed = sIdx < stageIdx;
                            const isCurrent = sIdx === stageIdx;
                            const StageIcon = stg.icon;

                            return (
                              <div key={stg.id} className="flex flex-col items-center text-center">
                                <div
                                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0 font-bold ${
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
                                    {stg.label}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Status Note or Artisan Update */}
                    {order.status_note && (
                      <div className="p-3 bg-[#FAF6EE] rounded-xl border border-[#E8E1D2] text-xs text-[#1D231E] flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#E06C38] shrink-0 mt-0.5" />
                        <p className="leading-relaxed text-[#5A6659]">
                          <strong className="text-[#1D231E]">Studio Update:</strong> {order.status_note}
                        </p>
                      </div>
                    )}

                    {/* Courier Tracking Info (when shipped or delivered) */}
                    {order.tracking_number && (
                      <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800 block">
                              Courier Tracking Code
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
                              <span>Copy Tracking</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Shipping Destination Snippet */}
                    {deliveryAddress && (
                      <div className="pt-2 border-t border-[#F0EBE1] flex items-start gap-2 text-xs text-[#5A6659]">
                        <MapPin className="w-3.5 h-3.5 text-[#70806E] shrink-0 mt-0.5" />
                        <span>Delivery Address: <strong className="text-[#1D231E] font-medium">{deliveryAddress}</strong></span>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      ) : (
        /* Empty State */
        <div className="p-12 border-2 border-dashed border-[#E8E1D2] rounded-3xl bg-[#FAF6EE]/50 text-center space-y-4">
          <div className="w-14 h-14 bg-[#E06C38]/10 text-[#E06C38] rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1D231E]">No Store Purchases Yet</h3>
            <p className="text-xs text-[#5A6659] max-w-md mx-auto mt-1 leading-relaxed">
              When you purchase ready-made kits, fabrics, threads, and handcrafted inventory items, your orders will appear here with live 4-stage tracking.
            </p>
          </div>
          {onNavigateToShop && (
            <button
              onClick={onNavigateToShop}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1D231E] text-white text-xs font-bold rounded-full hover:bg-[#323D34] transition-all cursor-pointer shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#E06C38]" />
              <span>Explore the Store</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};
