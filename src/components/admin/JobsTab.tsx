import React from 'react';
import {
  Package,
  Clock,
  DollarSign,
  CheckCircle2,
  Scissors,
  ShieldCheck,
  Truck,
  Search,
  RotateCcw,
  User,
} from 'lucide-react';
import { SupabaseStitchOrderRow } from '../../lib/supabase';
import { AdminJobCard } from './AdminJobCard';

export type AdminJobsSubTab =
  | 'all'
  | 'pending_quote'
  | 'pending_confirmation'
  | 'confirmed'
  | 'in_production'
  | 'completed'
  | 'shipped';

interface JobsTabProps {
  orders: SupabaseStitchOrderRow[];
  jobsSubTab: AdminJobsSubTab;
  setJobsSubTab: (tab: AdminJobsSubTab) => void;
  filteredAllOrders: SupabaseStitchOrderRow[];
  pendingQuoteOrders: SupabaseStitchOrderRow[];
  pendingConfirmationOrders: SupabaseStitchOrderRow[];
  confirmedOrders: SupabaseStitchOrderRow[];
  inProductionOrders: SupabaseStitchOrderRow[];
  completedOrders: SupabaseStitchOrderRow[];
  shippedOrders: SupabaseStitchOrderRow[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  orderTypeFilter: string;
  setOrderTypeFilter: (val: string) => void;
  inProgressSearchQuery: string;
  setInProgressSearchQuery: (val: string) => void;
  customerOrdersFilterEmail: string | null;
  setCustomerOrdersFilterEmail: (email: string | null) => void;
  onOpenEdit: (order: SupabaseStitchOrderRow) => void;
  onOpenQuote: (order: SupabaseStitchOrderRow) => void;
  onOpenDecline: (order: SupabaseStitchOrderRow) => void;
  onOpenConverter: (order: SupabaseStitchOrderRow) => void;
  onOpenStitchTracker: (order: SupabaseStitchOrderRow) => void;
  onPreviewImage: (preview: { url: string; title: string }) => void;
  onViewCustomerHistory: (customerEmail: string) => void;
  renderStatusBadge: (status?: string) => React.ReactNode;
  renderTierBadge: (tier?: string) => React.ReactNode;
}

export const JobsTab: React.FC<JobsTabProps> = ({
  orders,
  jobsSubTab,
  setJobsSubTab,
  filteredAllOrders,
  pendingQuoteOrders,
  pendingConfirmationOrders,
  confirmedOrders,
  inProductionOrders,
  completedOrders,
  shippedOrders,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  orderTypeFilter,
  setOrderTypeFilter,
  inProgressSearchQuery,
  setInProgressSearchQuery,
  customerOrdersFilterEmail,
  setCustomerOrdersFilterEmail,
  onOpenEdit,
  onOpenQuote,
  onOpenDecline,
  onOpenConverter,
  onOpenStitchTracker,
  onPreviewImage,
  onViewCustomerHistory,
  renderStatusBadge,
  renderTierBadge,
}) => {
  return (
    <div className="space-y-6">
      {/* JOBS SUB-TABS NAVIGATION BAR (Strict Order) */}
      <div className="bg-white rounded-2xl border border-[#1D231E]/10 p-1.5 shadow-xs overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        {/* 1. All Jobs */}
        <button
          onClick={() => setJobsSubTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            jobsSubTab === 'all'
              ? 'bg-[#1D231E] text-white shadow-xs'
              : 'text-[#1D231E]/70 hover:text-[#1D231E] hover:bg-[#FAF6EE]'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>All Jobs</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              jobsSubTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#1D231E]/70'
            }`}
          >
            {orders.length}
          </span>
        </button>

        {/* 2. Pending Quote */}
        <button
          onClick={() => setJobsSubTab('pending_quote')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            jobsSubTab === 'pending_quote'
              ? 'bg-[#E06C38] text-white shadow-xs'
              : 'text-[#1D231E]/70 hover:text-[#1D231E] hover:bg-[#FAF6EE]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Quote</span>
          {pendingQuoteOrders.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                jobsSubTab === 'pending_quote'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {pendingQuoteOrders.length}
            </span>
          )}
        </button>

        {/* 3. Pending Confirmation */}
        <button
          onClick={() => setJobsSubTab('pending_confirmation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            jobsSubTab === 'pending_confirmation'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-[#1D231E]/70 hover:text-[#1D231E] hover:bg-[#FAF6EE]'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Pending Confirmation</span>
          {pendingConfirmationOrders.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                jobsSubTab === 'pending_confirmation'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 text-blue-900'
              }`}
            >
              {pendingConfirmationOrders.length}
            </span>
          )}
        </button>

        {/* 4. Confirmed */}
        <button
          onClick={() => setJobsSubTab('confirmed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            jobsSubTab === 'confirmed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-[#1D231E]/70 hover:text-[#1D231E] hover:bg-[#FAF6EE]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Confirmed</span>
          {confirmedOrders.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                jobsSubTab === 'confirmed'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              {confirmedOrders.length}
            </span>
          )}
        </button>

        {/* 5. In Production */}
        <button
          onClick={() => setJobsSubTab('in_production')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            jobsSubTab === 'in_production'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-[#1D231E]/70 hover:text-[#1D231E] hover:bg-[#FAF6EE]'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>In Production</span>
          {inProductionOrders.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                jobsSubTab === 'in_production'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 text-indigo-900'
              }`}
            >
              {inProductionOrders.length}
            </span>
          )}
        </button>

        {/* 6. Completed */}
        <button
          onClick={() => setJobsSubTab('completed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            jobsSubTab === 'completed'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-[#1D231E]/70 hover:text-[#1D231E] hover:bg-[#FAF6EE]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Completed</span>
          {completedOrders.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                jobsSubTab === 'completed'
                  ? 'bg-white/20 text-white'
                  : 'bg-teal-100 text-teal-900'
              }`}
            >
              {completedOrders.length}
            </span>
          )}
        </button>

        {/* 7. Shipped */}
        <button
          onClick={() => setJobsSubTab('shipped')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            jobsSubTab === 'shipped'
              ? 'bg-[#E06C38] text-white shadow-xs'
              : 'text-[#1D231E]/70 hover:text-[#1D231E] hover:bg-[#FAF6EE]'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Shipped</span>
          {shippedOrders.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                jobsSubTab === 'shipped'
                  ? 'bg-white/20 text-white'
                  : 'bg-orange-100 text-orange-900'
              }`}
            >
              {shippedOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: ALL JOBS */}
      {/* ========================================================================= */}
      {jobsSubTab === 'all' && (
        <div className="space-y-6">
          {/* Filter Controls Bar */}
          <div className="bg-white p-5 rounded-2xl border border-[#1D231E]/10 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Search Query Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1D231E]/40" />
                <input
                  type="text"
                  placeholder="Search Order ID, title, customer name, email, notes, tracking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-xs bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 text-[#1D231E]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status and Order Type Dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Fulfillment Status Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#1D231E]/60 font-semibold">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending_quote">Pending Quote / Revision</option>
                    <option value="quoted">Quoted / Pending Confirmation</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_production">In Production</option>
                    <option value="quality_check">Quality Check / Completed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="declined">Declined</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Order Type Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#1D231E]/60 font-semibold">Type:</span>
                  <select
                    value={orderTypeFilter}
                    onChange={(e) => setOrderTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
                  >
                    <option value="all">All Order Types</option>
                    <option value="custom_stitched">Custom Stitched Keepsake</option>
                    <option value="custom_kit_converter">Custom Kit (Converter)</option>
                    <option value="custom_kit_assisted">Assisted Kit Request</option>
                    <option value="marketplace">Marketplace Pattern</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active Customer Filter Banner */}
            {customerOrdersFilterEmail && (
              <div className="flex items-center justify-between bg-[#FAF6EE] px-4 py-2 rounded-xl border border-[#1D231E]/10 text-xs text-[#1D231E]">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#2D5A43]" />
                  <span>
                    Filtering jobs for customer:{' '}
                    <strong className="font-mono">{customerOrdersFilterEmail}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerOrdersFilterEmail(null)}
                  className="text-[#E06C38] hover:underline font-semibold cursor-pointer"
                >
                  Clear Customer Filter
                </button>
              </div>
            )}
          </div>

          {/* Results Count Header */}
          <div className="flex items-center justify-between px-1 text-xs text-[#1D231E]/60">
            <span>
              Showing <strong>{filteredAllOrders.length}</strong> of <strong>{orders.length}</strong> total jobs
            </span>
            {(statusFilter !== 'all' || orderTypeFilter !== 'all' || searchQuery || customerOrdersFilterEmail) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setOrderTypeFilter('all');
                  setSearchQuery('');
                  setCustomerOrdersFilterEmail(null);
                }}
                className="text-[#E06C38] hover:underline font-bold cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {/* Jobs List */}
          {filteredAllOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#1D231E]/10 p-12 text-center shadow-xs">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#1D231E] font-serif">No Jobs Found</h3>
              <p className="text-xs text-[#1D231E]/60 max-w-sm mx-auto mt-1">
                No orders match the current search or status filter selection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredAllOrders.map((order) => (
                <AdminJobCard
                  key={order.id}
                  order={order}
                  onOpenEdit={onOpenEdit}
                  onOpenQuote={onOpenQuote}
                  onOpenDecline={onOpenDecline}
                  onOpenConverter={onOpenConverter}
                  onOpenStitchTracker={onOpenStitchTracker}
                  onPreviewImage={onPreviewImage}
                  onViewCustomerHistory={onViewCustomerHistory}
                  renderStatusBadge={renderStatusBadge}
                  renderTierBadge={renderTierBadge}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PENDING QUOTE */}
      {/* ========================================================================= */}
      {jobsSubTab === 'pending_quote' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#1D231E]/10 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-[#1D231E] font-serif flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#E06C38]" />
                Pending Quote Requests
              </h2>
              <p className="text-xs text-[#1D231E]/60">
                Keepsake & kit requests awaiting initial workshop price estimation or revision adjustments.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pendingQuoteOrders.some(
                (o) => (o.fulfillment_status || o.status) === 'revision_requested'
              ) && (
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-300 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                  {
                    pendingQuoteOrders.filter(
                      (o) => (o.fulfillment_status || o.status) === 'revision_requested'
                    ).length
                  }{' '}
                  Revision Needed
                </span>
              )}
              <div className="text-sm font-medium text-[#1D231E]/80 bg-[#FAF6EE] px-4 py-2 rounded-xl border border-[#1D231E]/5">
                Total Pending:{' '}
                <span className="font-bold text-[#E06C38]">{pendingQuoteOrders.length}</span>
              </div>
            </div>
          </div>

          {pendingQuoteOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#1D231E]/10 p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#1D231E] font-serif">All Quotes Complete!</h3>
              <p className="text-sm text-[#1D231E]/60 max-w-md mx-auto mt-1">
                There are currently no custom keepsake or kit requests awaiting price estimation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {pendingQuoteOrders.map((order) => (
                <AdminJobCard
                  key={order.id}
                  order={order}
                  onOpenEdit={onOpenEdit}
                  onOpenQuote={onOpenQuote}
                  onOpenDecline={onOpenDecline}
                  onOpenConverter={onOpenConverter}
                  onOpenStitchTracker={onOpenStitchTracker}
                  onPreviewImage={onPreviewImage}
                  onViewCustomerHistory={onViewCustomerHistory}
                  renderStatusBadge={renderStatusBadge}
                  renderTierBadge={renderTierBadge}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: PENDING CONFIRMATION */}
      {/* ========================================================================= */}
      {jobsSubTab === 'pending_confirmation' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#1D231E]/10 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-[#1D231E] font-serif flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Pending Confirmation
              </h2>
              <p className="text-xs text-[#1D231E]/60">
                Quotes submitted to customer, waiting on customer confirmation or initial deposit.
              </p>
            </div>
            <div className="text-sm font-medium text-[#1D231E]/80 bg-[#FAF6EE] px-4 py-2 rounded-xl border border-[#1D231E]/5">
              Total Awaiting Confirmation:{' '}
              <span className="font-bold text-blue-600">{pendingConfirmationOrders.length}</span>
            </div>
          </div>

          {pendingConfirmationOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#1D231E]/10 p-12 text-center shadow-xs">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#1D231E] font-serif">
                No Orders Awaiting Confirmation
              </h3>
              <p className="text-xs text-[#1D231E]/60 max-w-sm mx-auto mt-1">
                All quoted orders have either been confirmed by customers or are pending initial quote.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {pendingConfirmationOrders.map((order) => (
                <AdminJobCard
                  key={order.id}
                  order={order}
                  onOpenEdit={onOpenEdit}
                  onOpenQuote={onOpenQuote}
                  onOpenDecline={onOpenDecline}
                  onOpenConverter={onOpenConverter}
                  onOpenStitchTracker={onOpenStitchTracker}
                  onPreviewImage={onPreviewImage}
                  onViewCustomerHistory={onViewCustomerHistory}
                  renderStatusBadge={renderStatusBadge}
                  renderTierBadge={renderTierBadge}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: CONFIRMED */}
      {/* ========================================================================= */}
      {jobsSubTab === 'confirmed' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#1D231E]/10 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-[#1D231E] font-serif flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Confirmed Orders
              </h2>
              <p className="text-xs text-[#1D231E]/60">
                Customer-approved jobs ready for materials staging, pattern generation, or workshop queue.
              </p>
            </div>
            <div className="text-sm font-medium text-[#1D231E]/80 bg-[#FAF6EE] px-4 py-2 rounded-xl border border-[#1D231E]/5">
              Total Confirmed:{' '}
              <span className="font-bold text-emerald-600">{confirmedOrders.length}</span>
            </div>
          </div>

          {confirmedOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#1D231E]/10 p-12 text-center shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#1D231E] font-serif">No Confirmed Orders</h3>
              <p className="text-xs text-[#1D231E]/60 max-w-sm mx-auto mt-1">
                There are currently no orders in the confirmed holding queue.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {confirmedOrders.map((order) => (
                <AdminJobCard
                  key={order.id}
                  order={order}
                  onOpenEdit={onOpenEdit}
                  onOpenQuote={onOpenQuote}
                  onOpenDecline={onOpenDecline}
                  onOpenConverter={onOpenConverter}
                  onOpenStitchTracker={onOpenStitchTracker}
                  onPreviewImage={onPreviewImage}
                  onViewCustomerHistory={onViewCustomerHistory}
                  renderStatusBadge={renderStatusBadge}
                  renderTierBadge={renderTierBadge}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: IN PRODUCTION */}
      {/* ========================================================================= */}
      {jobsSubTab === 'in_production' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#1D231E]/10 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-[#1D231E] font-serif flex items-center gap-2">
                <Scissors className="w-5 h-5 text-indigo-600" />
                Live Production Workshop
              </h2>
              <p className="text-xs text-[#1D231E]/60">
                Active stitching projects and kit assembly in progress with live workshop progress bars.
              </p>
            </div>

            {/* In-Production Search Filter */}
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#1D231E]/40" />
                <input
                  type="text"
                  placeholder="Filter production jobs..."
                  value={inProgressSearchQuery}
                  onChange={(e) => setInProgressSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-[#1D231E]"
                />
              </div>

              <div className="text-sm font-medium text-[#1D231E]/80 bg-[#FAF6EE] px-4 py-2 rounded-xl border border-[#1D231E]/5 whitespace-nowrap">
                Active In Production:{' '}
                <span className="font-bold text-indigo-600">{inProductionOrders.length}</span>
              </div>
            </div>
          </div>

          {inProductionOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#1D231E]/10 p-12 text-center shadow-xs">
              <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#1D231E] font-serif">No Active Production Jobs</h3>
              <p className="text-xs text-[#1D231E]/60 max-w-sm mx-auto mt-1">
                No orders are currently tagged as in production. To move an order here, update its stage to "In Production".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {inProductionOrders.map((order) => (
                <AdminJobCard
                  key={order.id}
                  order={order}
                  onOpenEdit={onOpenEdit}
                  onOpenQuote={onOpenQuote}
                  onOpenDecline={onOpenDecline}
                  onOpenConverter={onOpenConverter}
                  onOpenStitchTracker={onOpenStitchTracker}
                  onPreviewImage={onPreviewImage}
                  onViewCustomerHistory={onViewCustomerHistory}
                  renderStatusBadge={renderStatusBadge}
                  renderTierBadge={renderTierBadge}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 6: COMPLETED */}
      {/* ========================================================================= */}
      {jobsSubTab === 'completed' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#1D231E]/10 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-[#1D231E] font-serif flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                Completed & Quality Check
              </h2>
              <p className="text-xs text-[#1D231E]/60">
                Production stitching and kit assembly complete; undergoing final QA and packaging before dispatch.
              </p>
            </div>
            <div className="text-sm font-medium text-[#1D231E]/80 bg-[#FAF6EE] px-4 py-2 rounded-xl border border-[#1D231E]/5">
              Total Completed Pending QA:{' '}
              <span className="font-bold text-teal-600">{completedOrders.length}</span>
            </div>
          </div>

          {completedOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#1D231E]/10 p-12 text-center shadow-xs">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#1D231E] font-serif">No Completed Jobs Pending QA</h3>
              <p className="text-xs text-[#1D231E]/60 max-w-sm mx-auto mt-1">
                There are currently no orders in the final Quality Check / Completed stage.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {completedOrders.map((order) => (
                <AdminJobCard
                  key={order.id}
                  order={order}
                  onOpenEdit={onOpenEdit}
                  onOpenQuote={onOpenQuote}
                  onOpenDecline={onOpenDecline}
                  onOpenConverter={onOpenConverter}
                  onOpenStitchTracker={onOpenStitchTracker}
                  onPreviewImage={onPreviewImage}
                  onViewCustomerHistory={onViewCustomerHistory}
                  renderStatusBadge={renderStatusBadge}
                  renderTierBadge={renderTierBadge}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 7: SHIPPED */}
      {/* ========================================================================= */}
      {jobsSubTab === 'shipped' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#1D231E]/10 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-[#1D231E] font-serif flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#E06C38]" />
                Shipped & Delivered Orders
              </h2>
              <p className="text-xs text-[#1D231E]/60">
                Dispatched keepsake packages and embroidery kits with tracking details.
              </p>
            </div>
            <div className="text-sm font-medium text-[#1D231E]/80 bg-[#FAF6EE] px-4 py-2 rounded-xl border border-[#1D231E]/5">
              Total Dispatched:{' '}
              <span className="font-bold text-[#E06C38]">{shippedOrders.length}</span>
            </div>
          </div>

          {shippedOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#1D231E]/10 p-12 text-center shadow-xs">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#1D231E] font-serif">No Shipped Orders Yet</h3>
              <p className="text-xs text-[#1D231E]/60 max-w-sm mx-auto mt-1">
                Orders marked as "Shipped" or "Delivered" will appear here with tracking info.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {shippedOrders.map((order) => (
                <AdminJobCard
                  key={order.id}
                  order={order}
                  onOpenEdit={onOpenEdit}
                  onOpenQuote={onOpenQuote}
                  onOpenDecline={onOpenDecline}
                  onOpenConverter={onOpenConverter}
                  onOpenStitchTracker={onOpenStitchTracker}
                  onPreviewImage={onPreviewImage}
                  onViewCustomerHistory={onViewCustomerHistory}
                  renderStatusBadge={renderStatusBadge}
                  renderTierBadge={renderTierBadge}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
