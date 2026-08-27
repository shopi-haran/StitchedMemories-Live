import React from 'react';
import {
  Eye,
  Scissors,
  Sparkles,
  DollarSign,
  RotateCcw,
  XCircle,
  Sliders,
  MapPin,
  Mail,
  MessageSquare,
  Activity,
  Image as ImageIcon,
  ChevronRight,
  Truck,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  CreditCard,
  Check,
  X
} from 'lucide-react';
import { SupabaseStitchOrderRow } from '../../lib/supabase';

interface AdminJobCardProps {
  order: SupabaseStitchOrderRow;
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

export const AdminJobCard: React.FC<AdminJobCardProps> = ({
  order,
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
  const details = order.request_details || {};
  const photoUrl = order.image_url || details.photo_url || details.image_url || details.pattern_result_url;
  const fulfillmentStatus = (order.fulfillment_status || order.status || 'pending_quote').toLowerCase();
  const isRevision = fulfillmentStatus === 'revision_requested';
  const isPendingQuote = fulfillmentStatus === 'pending_quote' || fulfillmentStatus === 'received' || isRevision;
  const isQuoted = fulfillmentStatus === 'quoted' || fulfillmentStatus === 'awaiting_payment';
  const isConfirmed = fulfillmentStatus === 'confirmed';
  const isInProduction = fulfillmentStatus === 'in_production' || fulfillmentStatus === 'in_progress';
  const isQualityCheck = fulfillmentStatus === 'quality_check' || fulfillmentStatus === 'completed';
  const isShipped = fulfillmentStatus === 'shipped' || fulfillmentStatus === 'delivered';
  const isDeclined = fulfillmentStatus === 'declined';
  const isCancelled = fulfillmentStatus === 'cancelled' || fulfillmentStatus === 'canceled';

  const isCustomStitched =
    order.order_type === 'custom_stitched' ||
    (order.title && order.title.toLowerCase().includes('stitched')) ||
    (details.order_type === 'custom_stitched');

  // Rule 3: Stitch tracker is ONLY visible/accessible for custom_stitched when in_production or later
  const isEligibleForStitchTracker =
    isCustomStitched &&
    ['in_production', 'in_progress', 'quality_check', 'completed', 'shipped', 'delivered'].includes(fulfillmentStatus);

  const progressPercent = Math.min(100, Math.max(0, Number(order.progress_percent || details.progress_percent || 0)));
  const progressNote = order.progress_note || details.progress_note || '';
  const totalAmount = order.total_amount ?? order.quoted_price ?? 0;
  const deliveryAddress = details.delivery_address || details.address;
  const customerPhone = details.phone || details.delivery_phone || details.customer_phone;
  const customerNotes = details.customer_notes || details.instructions || details.notes || details.special_instructions;

  return (
    <div
      className={`bg-white rounded-3xl border transition-all overflow-hidden flex flex-col p-6 sm:p-7 space-y-5 shadow-xs hover:shadow-md ${
        isRevision
          ? 'border-amber-400 bg-amber-50/15 ring-1 ring-amber-400/40'
          : isInProduction
          ? 'border-amber-200/80 bg-white'
          : isConfirmed
          ? 'border-emerald-200/80'
          : 'border-[#1D231E]/10'
      }`}
    >
      {/* Top Header: Image, Title, Order ID, Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Photo Preview Thumbnail */}
          {photoUrl ? (
            <div
              onClick={() => onPreviewImage({ url: photoUrl, title: `${order.title || 'Order'} (#${order.id})` })}
              className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black/5 border border-[#1D231E]/10 shrink-0 cursor-pointer group shadow-2xs"
              title="Click to zoom image"
            >
              <img
                src={photoUrl}
                alt={order.title || 'Customer Artwork'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Eye className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-[#FAF6EE] border border-dashed border-[#1D231E]/15 flex flex-col items-center justify-center text-gray-400 shrink-0">
              <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
              <span className="text-[10px]">No Photo</span>
            </div>
          )}

          {/* Title & Type Info */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#2D5A43]/10 text-[#2D5A43]">
                {order.order_type === 'custom_stitched'
                  ? 'Custom Stitched Keepsake'
                  : order.order_type === 'custom_kit_converter'
                  ? 'Custom Kit (Converter)'
                  : order.order_type === 'custom_kit_assisted'
                  ? 'Assisted Kit Request'
                  : order.order_type === 'marketplace'
                  ? 'Marketplace Pattern'
                  : order.order_type || 'Custom Order'}
              </span>
              <span className="text-xs font-mono font-bold text-[#1D231E]">
                #{order.id}
              </span>
              <span className="text-xs text-[#1D231E]/40">•</span>
              <span className="text-[11px] text-[#1D231E]/60">
                {order.created_at
                  ? new Date(order.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#1D231E] font-serif leading-snug">
              {order.title || 'Custom Keepsake Embroidery'}
            </h3>

            {/* Customer identity row */}
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
              <span className="font-semibold text-[#1D231E]">
                {order.customer_name || 'Customer'}
              </span>
              {renderTierBadge(order.customer_tier)}
              <span className="text-[#1D231E]/50 font-mono text-[11px]">
                ({order.customer_email || order.user_id})
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
          <div>{renderStatusBadge(order.fulfillment_status || order.status)}</div>
          {order.tracking_number && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-orange-900 bg-orange-100/80 px-2.5 py-0.5 rounded-lg border border-orange-300">
              <Truck className="w-3 h-3 text-orange-700" /> TRK: {order.tracking_number}
            </span>
          )}
          {totalAmount > 0 && (
            <span className="text-sm font-black font-mono text-[#1D231E]">
              ${Number(totalAmount).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Customer Revision Request Banner */}
      {isRevision && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
            <RotateCcw className="w-4 h-4 text-amber-700 animate-spin" />
            <span>Customer Requested Quote Revision</span>
          </div>
          {order.customer_feedback ? (
            <p className="text-xs text-amber-900 font-medium leading-relaxed pl-6">
              <span className="font-bold">Customer Feedback:</span> "{order.customer_feedback}"
            </p>
          ) : (
            <p className="text-xs text-amber-800 italic pl-6">
              Customer requested adjustments to materials, floss skeins, or pricing.
            </p>
          )}
        </div>
      )}

      {/* Declined / Cancelled info banners */}
      {isDeclined && order.status_note && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
          <span className="font-bold flex items-center gap-1.5 text-rose-950">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Decline Reason:
          </span>
          <p className="italic text-rose-800">"{order.status_note}"</p>
        </div>
      )}

      {isCancelled && order.status_note && (
        <div className="p-3.5 rounded-2xl bg-gray-100 border border-gray-200 text-xs text-gray-700 space-y-1">
          <span className="font-bold flex items-center gap-1.5 text-gray-900">
            <X className="w-3.5 h-3.5 text-gray-500" /> Cancellation Reason:
          </span>
          <p className="italic text-gray-600">"{order.status_note}"</p>
        </div>
      )}

      {/* Specifications & Delivery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-[#FAF6EE] p-4 rounded-2xl border border-[#1D231E]/5">
        <div>
          <span className="text-[#1D231E]/50 block text-[10px] uppercase font-bold">Size / Grid</span>
          <span className="font-semibold text-[#1D231E] truncate block mt-0.5">
            {details.size || details.grid_size || (order.pattern_config ? `${order.pattern_config.gridWidth} st` : 'Standard')}
          </span>
        </div>

        <div>
          <span className="text-[#1D231E]/50 block text-[10px] uppercase font-bold">Aida Cloth</span>
          <span className="font-semibold text-[#1D231E] truncate block mt-0.5">
            {details.cloth_count || details.aida_count || (order.pattern_config ? `${order.pattern_config.fabricCount}ct Aida` : '14 Count Standard')}
          </span>
        </div>

        <div>
          <span className="text-[#1D231E]/50 block text-[10px] uppercase font-bold">Palette / Thread</span>
          <span className="font-semibold text-[#1D231E] truncate block mt-0.5">
            {details.thread_brand || details.palette_type || 'DMC Stranded Floss'}
          </span>
        </div>

        <div>
          <span className="text-[#1D231E]/50 block text-[10px] uppercase font-bold">Framing</span>
          <span className="font-semibold text-[#1D231E] truncate block mt-0.5">
            {details.framing_option || 'None (Fabric only)'}
          </span>
        </div>

        {deliveryAddress && (
          <div className="col-span-2 sm:col-span-4 pt-2 border-t border-[#1D231E]/5 flex items-start gap-1.5 text-[11px] text-[#1D231E]">
            <MapPin className="w-3.5 h-3.5 text-[#E06C38] shrink-0 mt-0.5" />
            <span className="truncate">
              <strong>Delivery:</strong> {deliveryAddress}
              {customerPhone ? ` • Tel: ${customerPhone}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Customer Instructions / Special Notes */}
      {customerNotes && (
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs text-amber-900">
          <span className="font-bold flex items-center gap-1 mb-0.5 text-amber-950">
            <MessageSquare className="w-3.5 h-3.5 text-amber-700" /> Customer Instructions:
          </span>
          <p className="text-amber-800 italic">"{customerNotes}"</p>
        </div>
      )}

      {/* REDESIGNED FULL-WIDTH WORKSHOP PROGRESS BAR (Matching CustomOrdersTab.tsx visual style) */}
      {isCustomStitched && (isInProduction || progressPercent > 0 || order.pattern_config) && (
        <div className="p-5 bg-gradient-to-r from-amber-50/80 via-[#FFF9F2] to-orange-50/80 border-2 border-[#E06C38]/30 rounded-3xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E06C38] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Live Workshop Progress
            </span>
            <div className="flex items-center gap-3">
              <span className="text-base font-black font-mono text-[#E06C38]">
                {progressPercent}% completed
              </span>
              <button
                type="button"
                onClick={() => onOpenStitchTracker(order)}
                className="px-3.5 py-1.5 bg-[#2D5A43] hover:bg-[#234734] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-[#E06C38]" />
                <span>Update Stitch Progress →</span>
              </button>
            </div>
          </div>

          <div className="w-full h-3.5 bg-[#E8E1D2] rounded-full overflow-hidden p-0.5 border border-[#D5CDBC]/60">
            <div
              className="h-full bg-gradient-to-r from-[#E06C38] via-[#e87c4d] to-[#2D5A43] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>

          {progressNote ? (
            <p className="text-xs text-[#1D231E] font-medium leading-relaxed">
              "{progressNote}"
            </p>
          ) : (
            <p className="text-[11px] text-[#1D231E]/60 italic">
              Click "Update Stitch Progress" to mark stitches directly on the chart and sync progress.
            </p>
          )}

          {order.progress_updated_at && (
            <p className="text-[10px] text-[#1D231E]/50">
              Last progress sync: {new Date(order.progress_updated_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Quote Breakdown Summary if available */}
      {order.quote && (
        <div className="p-3.5 bg-[#FAF6EE] rounded-2xl border border-[#1D231E]/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#E06C38]" />
            <span>
              {order.quote.line_items && order.quote.line_items.length > 0 ? (
                <>
                  <strong>{order.quote.line_items.length} Line Items:</strong> Subtotal ${(order.quote.items_subtotal ?? 0).toFixed(2)} + Crafting ${(order.quote.crafting_charge ?? 0).toFixed(2)}
                  {Number(order.quote.discount_amount || 0) > 0 && (
                    <span className="text-emerald-700 font-semibold"> - Studio 15% (-${Number(order.quote.discount_amount).toFixed(2)})</span>
                  )}
                  {` + Delivery $${(order.quote.delivery_charge ?? 0).toFixed(2)}`}
                </>
              ) : (
                <>
                  Quoted: ${(order.quote.total_amount ?? totalAmount).toFixed(2)}
                </>
              )}
            </span>
          </div>
          <span className="font-bold text-[#E06C38] font-mono text-sm">
            Total: ${(order.quote.total_amount ?? totalAmount).toFixed(2)}
          </span>
        </div>
      )}

      {/* Actions Footer */}
      <div className="pt-3 border-t border-[#1D231E]/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* View Customer History */}
          <button
            type="button"
            onClick={() => onViewCustomerHistory(order.customer_email || order.user_id || '')}
            className="text-xs font-semibold text-[#2D5A43] hover:underline flex items-center gap-1 mr-2"
          >
            Customer History <ChevronRight className="w-3 h-3" />
          </button>

          {/* Manage Details & Notes Modal */}
          <button
            type="button"
            onClick={() => onOpenEdit(order)}
            className="px-3.5 py-2 bg-white hover:bg-[#FAF6EE] text-[#1D231E] text-xs font-bold rounded-xl border border-[#1D231E]/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-[#5A6659]" />
            <span>Manage & Stage</span>
          </button>

          {/* Pattern Studio / Converter */}
          {(photoUrl || order.order_type === 'custom_kit_assisted' || order.order_type === 'custom_stitched' || order.order_type === 'custom_kit_converter') && (
            <button
              type="button"
              onClick={() => onOpenConverter(order)}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Open Admin Pattern Studio to configure grid, DMC colors & chart"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Converter</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* If Pending Quote / Revision Requested: Show Decline & Quote Buttons */}
          {isPendingQuote && (
            <>
              <button
                type="button"
                onClick={() => onOpenDecline(order)}
                className="px-3.5 py-2 rounded-xl border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Decline Request</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenQuote(order)}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  isRevision
                    ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-400/40'
                    : 'bg-[#E06C38] hover:bg-[#c95927]'
                }`}
              >
                {isRevision ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" /> Re-Submit Quote
                  </>
                ) : (
                  <>
                    <DollarSign className="w-3.5 h-3.5" /> Set Quote & Price
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
