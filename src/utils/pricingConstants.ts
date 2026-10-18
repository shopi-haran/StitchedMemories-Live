/**
 * Standard Stitchara Order & Quotation Pricing Constants
 * All stored values are in LKR (Sri Lankan Rupees).
 *
 * Converted from legacy USD defaults using standard rate of 300 LKR / USD:
 *  - DMC Floss Thread per skein: Old $1.20 USD -> New 360.00 LKR
 *  - Zweigart Aida Fabric cloth base: Old $8.00 USD -> New 2,400.00 LKR
 *  - Custom Keepsake Hand-crafting charge: Old $35.00 USD -> New 10,500.00 LKR
 *  - Island-wide Courier Delivery / Shipping charge: Old $5.00 USD -> New 1,500.00 LKR
 */

export const DEFAULT_THREAD_SKEIN_PRICE_LKR = 360.00;
export const DEFAULT_AIDA_FABRIC_BASE_PRICE_LKR = 2400.00;
export const DEFAULT_CRAFTING_CHARGE_LKR = 10500.00;
export const DEFAULT_DELIVERY_CHARGE_LKR = 1500.00;

export interface GeneratedQuoteParams {
  orderType: string;
  threadRequirements?: Array<{
    dmc_code?: string;
    color_name?: string;
    hex?: string;
    stitch_count?: number;
    skeins_needed?: number;
  }>;
  fabricDetails?: {
    fabric_count?: number;
    fabric_type?: string;
    dimensions_str?: string;
  };
  sizePreference?: string;
  isStudioMember?: boolean;
}

export interface GeneratedQuoteResult {
  currency: 'LKR';
  line_items: Array<{
    id: string;
    description: string;
    reference_qty: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
    dmc_code?: string;
    hex?: string;
  }>;
  items_subtotal: number;
  crafting_charge: number;
  discount_percent: number;
  discount_amount: number;
  delivery_charge: number;
  total_amount: number;
}

/**
 * Generates itemized line items and totals in LKR with currency = 'LKR'.
 */
export function generateLkrQuote(params: GeneratedQuoteParams): GeneratedQuoteResult {
  const lineItems: GeneratedQuoteResult['line_items'] = [];
  const isCustomStitched = params.orderType === 'custom_stitched';

  if (params.threadRequirements && params.threadRequirements.length > 0) {
    params.threadRequirements.forEach((item, idx) => {
      const skeins = item.skeins_needed || (item.stitch_count ? Math.max(1, Math.ceil(Number(item.stitch_count) / 1800)) : 1);
      const unitPrice = DEFAULT_THREAD_SKEIN_PRICE_LKR;
      const total = Number((skeins * unitPrice).toFixed(2));
      lineItems.push({
        id: `item_dmc_${idx + 1}`,
        description: `DMC ${item.dmc_code || ''} - ${item.color_name || 'Embroidery Floss'}`.trim(),
        reference_qty: item.stitch_count ? `${Number(item.stitch_count).toLocaleString()} stitches` : '',
        quantity: skeins,
        unit: 'skeins',
        unit_price: unitPrice,
        total,
        dmc_code: item.dmc_code,
        hex: item.hex,
      });
    });

    // Fabric line item in LKR
    const fabricCount = params.fabricDetails?.fabric_count || 14;
    const fabricDesc = params.fabricDetails?.fabric_type || `${fabricCount}-Count Aida Cloth`;
    const dimensionsStr = params.fabricDetails?.dimensions_str || (params.sizePreference ? `(${params.sizePreference})` : '');
    lineItems.push({
      id: 'item_fabric_base',
      description: `${fabricDesc} ${dimensionsStr}`.trim(),
      reference_qty: 'Fabric base',
      quantity: 1,
      unit: 'pcs',
      unit_price: DEFAULT_AIDA_FABRIC_BASE_PRICE_LKR,
      total: DEFAULT_AIDA_FABRIC_BASE_PRICE_LKR,
    });
  } else {
    // Single default kit/product row in LKR
    const defaultDesc = isCustomStitched
      ? 'Handcrafted Bespoke Embroidery Keepsake'
      : params.orderType === 'custom_kit_assisted'
      ? 'Assisted Custom Kit Materials (Floss & Fabric)'
      : 'Embroidery Materials & Supplies';

    lineItems.push({
      id: 'item_1',
      description: defaultDesc,
      reference_qty: params.sizePreference ? `Size: ${params.sizePreference}` : '',
      quantity: 1,
      unit: 'pcs',
      unit_price: DEFAULT_AIDA_FABRIC_BASE_PRICE_LKR,
      total: DEFAULT_AIDA_FABRIC_BASE_PRICE_LKR,
    });
  }

  const items_subtotal = Number(lineItems.reduce((acc, it) => acc + it.total, 0).toFixed(2));
  const crafting_charge = isCustomStitched ? DEFAULT_CRAFTING_CHARGE_LKR : 0;
  const delivery_charge = DEFAULT_DELIVERY_CHARGE_LKR;

  const discountableAmount = items_subtotal + crafting_charge;
  const discount_percent = params.isStudioMember ? 15 : 0;
  const discount_amount = params.isStudioMember
    ? Number((discountableAmount * 0.15).toFixed(2))
    : 0;

  const total_amount = Number((discountableAmount - discount_amount + delivery_charge).toFixed(2));

  return {
    currency: 'LKR',
    line_items: lineItems,
    items_subtotal,
    crafting_charge,
    discount_percent,
    discount_amount,
    delivery_charge,
    total_amount,
  };
}
