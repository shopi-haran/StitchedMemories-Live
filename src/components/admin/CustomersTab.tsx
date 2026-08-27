import React from 'react';
import { Search, Package } from 'lucide-react';
import { SupabaseProfileRow } from '../../lib/supabase';

interface CustomersTabProps {
  filteredProfiles: SupabaseProfileRow[];
  customerSearchQuery: string;
  setCustomerSearchQuery: (val: string) => void;
  customerTierFilter: string;
  setCustomerTierFilter: (val: string) => void;
  ordersCountByCustomer: Record<string, number>;
  getEffectiveTier: (profile: SupabaseProfileRow) => string;
  renderTierBadge: (tier?: string) => React.ReactNode;
  onViewCustomerOrders: (emailOrId: string) => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  filteredProfiles,
  customerSearchQuery,
  setCustomerSearchQuery,
  customerTierFilter,
  setCustomerTierFilter,
  ordersCountByCustomer,
  getEffectiveTier,
  renderTierBadge,
  onViewCustomerOrders,
}) => {
  return (
    <div className="space-y-6">
      {/* Search & Tier Filters */}
      <div className="bg-white p-5 rounded-2xl border border-[#1D231E]/10 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1D231E]/40" />
          <input
            type="text"
            placeholder="Search customer name, email, role..."
            value={customerSearchQuery}
            onChange={(e) => setCustomerSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 text-[#1D231E]"
          />
          {customerSearchQuery && (
            <button
              onClick={() => setCustomerSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#1D231E]/60 font-medium">Tier Filter:</span>
          <select
            value={customerTierFilter}
            onChange={(e) => setCustomerTierFilter(e.target.value)}
            className="px-3 py-2 bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 cursor-pointer"
          >
            <option value="all">All Tiers</option>
            <option value="studio">Studio Plan</option>
            <option value="pro">Pro Crafter</option>
            <option value="free">Free Tier</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-[#1D231E]/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF6EE] border-b border-[#1D231E]/10 text-[#1D231E]/70 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Customer Profile</th>
                <th className="py-3.5 px-4">Effective Tier</th>
                <th className="py-3.5 px-4">Subscription Status</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Total Orders</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D231E]/5">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    No customer profiles found.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => {
                  const effectiveTier = getEffectiveTier(p);
                  const orderCount =
                    (ordersCountByCustomer[(p.email || '').toLowerCase()] || 0) +
                    (p.id && p.id !== p.email ? ordersCountByCustomer[p.id] || 0 : 0);

                  const isCurrentAdmin = (p.role || '').toLowerCase() === 'admin';

                  return (
                    <tr key={p.id || p.email} className="hover:bg-[#FAF6EE]/50 transition-colors">
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center font-bold text-sm">
                            {p.avatar_url ? (
                              <img
                                src={p.avatar_url}
                                alt={p.display_name || 'Avatar'}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              (p.display_name || p.email || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-[#1D231E] block">
                              {p.display_name || p.name || 'Crafter'}
                            </span>
                            <span className="text-[11px] text-[#1D231E]/60 block font-mono">
                              {p.email || p.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-middle">
                        {renderTierBadge(effectiveTier)}
                      </td>

                      <td className="py-4 px-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            (p.subscription_status || 'active').toLowerCase() === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {(p.subscription_status || 'active').toUpperCase()}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-middle">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isCurrentAdmin
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {p.role || 'user'}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-middle">
                        <span className="font-bold text-[#1D231E]">{orderCount}</span>{' '}
                        <span className="text-[11px] text-[#1D231E]/50">orders</span>
                      </td>

                      <td className="py-4 px-4 align-middle text-right">
                        <button
                          onClick={() => onViewCustomerOrders(p.email || p.id || '')}
                          className="px-3 py-1.5 rounded-lg bg-[#FAF6EE] hover:bg-[#FAF6EE]/80 border border-[#1D231E]/15 text-xs font-semibold text-[#1D231E] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5 text-[#2D5A43]" /> View Orders
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
