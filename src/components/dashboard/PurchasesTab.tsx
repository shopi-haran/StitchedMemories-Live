import React, { useEffect, useState, useCallback } from 'react';
import { 
  ShoppingBag, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Package, 
  CreditCard,
  DollarSign
} from 'lucide-react';
import { fetchUserStoreOrders, SupabaseOrderRow } from '../../lib/supabase';

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

  const parseItemNames = (itemsRaw: any): string[] => {
    if (!itemsRaw) return ['Store Order Item'];

    let parsed = itemsRaw;
    if (typeof itemsRaw === 'string') {
      try {
        parsed = JSON.parse(itemsRaw);
      } catch {
        return [itemsRaw];
      }
    }

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return ['Store Order Item'];
      return parsed.map((item, idx) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          const title = item.name || item.title || item.item_name || item.product_name;
          const qty = item.quantity || item.qty;
          if (title) {
            return qty && qty > 1 ? `${title} (x${qty})` : title;
          }
        }
        return `Item #${idx + 1}`;
      });
    }

    if (typeof parsed === 'object' && parsed !== null) {
      const title = parsed.name || parsed.title || parsed.item_name || parsed.product_name;
      if (title) return [title];
    }

    return ['Store Order Item'];
  };

  const renderPaymentStatusBadge = (statusRaw?: string) => {
    const s = (statusRaw || 'pending').toLowerCase();

    if (s === 'paid' || s === 'completed' || s === 'succeeded' || s === 'complete') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span className="capitalize">Paid</span>
        </span>
      );
    }

    if (s === 'pending' || s === 'processing' || s === 'unpaid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span className="capitalize">{s}</span>
        </span>
      );
    }

    if (s === 'failed' || s === 'cancelled' || s === 'error') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span className="capitalize">{s}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
        <CreditCard className="w-3 h-3 text-gray-500" />
        <span className="capitalize">{statusRaw}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#93A28F] block mb-1">
            Order History
          </span>
          <h2 className="text-2xl font-bold text-[#1D231E]">Purchases</h2>
          <p className="text-xs text-[#5A6659] mt-1">
            View order details, item breakdown, total amounts, and payment statuses for kit & shop purchases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOrders}
            title="Refresh order history"
            className="p-2 bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#5A6659] rounded-xl border border-[#D5CDBC] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onNavigateToShop && (
            <button
              onClick={onNavigateToShop}
              className="px-4 py-2 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#93A28F]" />
              <span>Visit Shop</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-4 bg-[#FAF6EE] border border-[#E8E1D2] rounded-2xl animate-pulse flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-[#E8E1D2] rounded w-48" />
                <div className="h-3 bg-[#E8E1D2] rounded w-28" />
              </div>
              <div className="h-6 bg-[#E8E1D2] rounded w-20" />
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
        <div className="bg-white border border-[#E8E1D2] rounded-3xl overflow-hidden shadow-xs">
          
          {/* Desktop & Tablet Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF6EE] border-b border-[#E8E1D2] text-[#5A6659] uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-6">Order ID & Items</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-6 text-right">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1]">
                {orders.map((order) => {
                  const itemNames = parseItemNames(order.items);
                  return (
                    <tr key={order.id} className="hover:bg-[#FAF6EE]/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center shrink-0 mt-0.5">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[11px] font-mono font-semibold text-[#8A9588] block">
                              #{String(order.id).slice(-8)}
                            </span>
                            <div className="font-bold text-[#1D231E] text-sm mt-0.5">
                              {itemNames.join(', ')}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-[#5A6659] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#8A9588]" />
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#1D231E] text-sm">
                          {formatTotalAmount(order.total_amount)}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {renderPaymentStatusBadge(order.payment_status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      ) : (
        /* Empty State */
        <div className="p-10 border-2 border-dashed border-[#E8E1D2] rounded-3xl bg-[#FAF6EE]/50 text-center">
          <div className="w-12 h-12 bg-[#93A28F]/20 text-[#556653] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#1D231E]">No Store Purchases Yet</h3>
          <p className="text-xs text-[#5A6659] max-w-md mx-auto mt-1 mb-5 leading-relaxed">
            When you commission custom kits, bespoke hand-stitched keepsakes, or digital materials, your receipts will appear here.
          </p>
          {onNavigateToShop && (
            <button
              onClick={onNavigateToShop}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D231E] text-white text-xs font-bold rounded-full hover:bg-[#323D34] transition-all cursor-pointer shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#93A28F]" />
              <span>Explore Marketplace</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};
