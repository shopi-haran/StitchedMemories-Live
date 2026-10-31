import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle2,
  Truck,
  Package,
  Sparkles,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  User,
  Mail,
  Calendar,
  Layers,
  Check,
  X,
  FileText,
  Sliders,
  Eye,
  ArrowRight,
  ShieldCheck,
  Award,
  Scissors,
  Image as ImageIcon,
  MapPin,
  Phone,
  MessageSquare,
  Activity,
  CreditCard,
  TrendingUp,
  Tag,
  BookOpen,
  Store,
  Plus,
  Trash2,
  RotateCcw,
  History,
  AlertTriangle,
  XCircle,
  Download,
  Settings,
  Coins
} from 'lucide-react';
import {
  fetchAllAdminOrders,
  fetchAllProfiles,
  fetchAllAdminBlogPosts,
  fetchAllAdminProducts,
  fetchAllContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
  submitAdminQuote,
  updateAdminOrderDetails,
  declineAdminOrder,
  saveOrderStitchProgress,
  SupabaseStitchOrderRow,
  SupabaseProfileRow,
  getEffectiveTier,
  getEffectiveTierLabel,
  supabase,
  fetchExchangeRate,
  updateExchangeRateInDb,
} from '../lib/supabase';
import { formatDualPrice, formatUsd, formatLkr, formatLkrPrice, formatOrderDualPrice } from '../utils/currency';
import { LkrPriceDisplay } from '../components/LkrPriceDisplay';
import { UserProfile } from '../context/AuthContext';
import { BlogPost, ContactMessage, ContactMessageStatus, Product } from '../types';
import { BlogPostsTab } from '../components/admin/BlogPostsTab';
import { BlogEditorModal } from '../components/admin/BlogEditorModal';
import { StoreProductsTab } from '../components/admin/StoreProductsTab';
import { StoreOrdersTab } from '../components/admin/StoreOrdersTab';
import { ProductEditorModal } from '../components/admin/ProductEditorModal';
import { AdminJobCard } from '../components/admin/AdminJobCard';
import { JobsTab } from '../components/admin/JobsTab';
import { CustomersTab } from '../components/admin/CustomersTab';
import { MessagesTab } from '../components/admin/MessagesTab';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import { StitchTrackerModal } from '../components/dashboard/StitchTrackerModal';
import { PhotoConverterModal } from '../components/PhotoConverterModal';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export type AdminTopLevelTab = 'jobs' | 'blogs' | 'store' | 'customers' | 'messages' | 'settings';
export type AdminStoreSubTab = 'products' | 'orders';
export type AdminJobsSubTab =
  | 'all'
  | 'pending_quote'
  | 'pending_confirmation'
  | 'confirmed'
  | 'in_production'
  | 'completed'
  | 'shipped';

interface AdminPageProps {
  user: UserProfile | null;
  onGoHome: () => void;
  initialTab?: 'pending_quotes' | 'in_progress' | 'all_orders' | 'customers' | 'blog_posts' | 'jobs' | 'blogs' | 'store' | 'messages' | 'settings';
  initialSubTab?: AdminJobsSubTab;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  user,
  onGoHome,
  initialTab = 'jobs',
  initialSubTab = 'all',
}) => {
  const [topLevelTab, setTopLevelTab] = useState<AdminTopLevelTab>(() => {
    if (initialTab === 'blog_posts' || initialTab === 'blogs') return 'blogs';
    if (initialTab === 'store') return 'store';
    if (initialTab === 'customers') return 'customers';
    if (initialTab === 'messages') return 'messages';
    if (initialTab === 'settings') return 'settings';
    return 'jobs';
  });

  const [storeSubTab, setStoreSubTab] = useState<AdminStoreSubTab>('products');

  const [jobsSubTab, setJobsSubTab] = useState<AdminJobsSubTab>(() => {
    if (initialTab === 'pending_quotes') return 'pending_quote';
    if (initialTab === 'in_progress') return 'in_production';
    if (initialTab === 'all_orders') return 'all';
    return initialSubTab || 'all';
  });

  const [orders, setOrders] = useState<SupabaseStitchOrderRow[]>([]);
  const [profiles, setProfiles] = useState<SupabaseProfileRow[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Admin Pattern Studio / PhotoConverterModal State
  const [selectedOrderForConverter, setSelectedOrderForConverter] = useState<SupabaseStitchOrderRow | null>(null);

  // Stitch Tracker Modal State
  const [selectedStitchTrackerOrder, setSelectedStitchTrackerOrder] = useState<SupabaseStitchOrderRow | null>(null);
  const [isStitchTrackerOpen, setIsStitchTrackerOpen] = useState(false);

  // In Progress Filter
  const [inProgressSearchQuery, setInProgressSearchQuery] = useState<string>('');

  // Blog Editor State
  const [isBlogEditorOpen, setIsBlogEditorOpen] = useState(false);
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<BlogPost | null>(null);

  // Store Product Editor State
  const [isProductEditorOpen, setIsProductEditorOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);

  // Quote Form Modal State
  const [selectedQuoteOrder, setSelectedQuoteOrder] = useState<SupabaseStitchOrderRow | null>(null);
  const [quoteLineItems, setQuoteLineItems] = useState<Array<{
    id: string;
    description: string;
    reference_qty: string;
    quantity: string | number;
    unit: string;
    unit_price: string | number;
    total: number;
    dmc_code?: string;
    hex?: string;
  }>>([]);
  const [craftingChargeInput, setCraftingChargeInput] = useState<string>('0');
  const [deliveryChargeInput, setDeliveryChargeInput] = useState<string>('1500.00');
  const [adminNotesInput, setAdminNotesInput] = useState<string>('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Order Details / Update Panel State
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<SupabaseStitchOrderRow | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editProgressPercent, setEditProgressPercent] = useState<number>(0);
  const [editProgressNote, setEditProgressNote] = useState<string>('');
  const [editTrackingNumber, setEditTrackingNumber] = useState<string>('');
  const [editStatusNote, setEditStatusNote] = useState<string>('');
  const [editAdminNotes, setEditAdminNotes] = useState<string>('');
  const [editEstimatedCompletion, setEditEstimatedCompletion] = useState<string>('');
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Image Fullscreen Preview Modal
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);

  // Decline Order Modal State
  const [declineModalOrder, setDeclineModalOrder] = useState<SupabaseStitchOrderRow | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [isDeclining, setIsDeclining] = useState(false);

  const [isManualPaymentModalOpen, setIsManualPaymentModalOpen] = useState(false);
  const [manualPaymentWhat, setManualPaymentWhat] = useState<'50% advance' | 'Balance' | 'Paid in full'>('50% advance');
  const [manualPaymentAmount, setManualPaymentAmount] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'Bank transfer' | 'Cash' | 'Other'>('Bank transfer');
  const [manualPaymentRef, setManualPaymentRef] = useState('');
  const [manualPaymentDate, setManualPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isManualPaymentConfirming, setIsManualPaymentConfirming] = useState(false);
  const [isSavingManualPayment, setIsSavingManualPayment] = useState(false);

  // Filters for ALL ORDERS tab
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filters for CUSTOMERS tab
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [customerTierFilter, setCustomerTierFilter] = useState<string>('all');

  // Customer filter triggered from customer table click
  const [customerOrdersFilterEmail, setCustomerOrdersFilterEmail] = useState<string | null>(null);

  // Settings Tab State (Currency / Exchange Rate)
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('300');
  const [isSavingExchangeRate, setIsSavingExchangeRate] = useState<boolean>(false);
  const [rateLastUpdatedAt, setRateLastUpdatedAt] = useState<string | null>(null);
  const [rateFetchError, setRateFetchError] = useState<string | null>(null);

  // Lock body scroll when any admin modal is open
  useBodyScrollLock(Boolean(selectedQuoteOrder || selectedOrderForEdit || previewImageModal || declineModalOrder || isManualPaymentModalOpen));

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const loadExchangeRate = useCallback(async () => {
    try {
      const rate = await fetchExchangeRate();
      setExchangeRateInput(rate.toString());
      setRateFetchError(null);
    } catch (err: any) {
      console.error('[AdminPage] Error loading exchange rate:', err);
      setRateFetchError(err.message || 'Failed to load exchange rate');
    }
  }, []);

  const handleSaveExchangeRate = async (rateToSave?: number) => {
    const targetRate = rateToSave !== undefined ? rateToSave : parseFloat(exchangeRateInput);
    if (isNaN(targetRate) || targetRate <= 0) {
      alert('Please enter a valid positive exchange rate (e.g. 300.00).');
      return;
    }
    setIsSavingExchangeRate(true);
    try {
      const res = await updateExchangeRateInDb(targetRate);
      if (res.success) {
        setExchangeRateInput(targetRate.toString());
        setRateLastUpdatedAt(new Date().toLocaleTimeString());
        showToast(`USD to LKR rate updated to ${targetRate.toLocaleString()}! Live price displays updated.`);
      } else {
        alert(`Failed to update exchange rate: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error updating exchange rate: ${err.message}`);
    } finally {
      setIsSavingExchangeRate(false);
    }
  };

  // Load all admin orders, customer profiles, blog articles, store products & contact messages
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const [fetchedOrders, fetchedProfiles, fetchedBlogPosts, fetchedProducts, fetchedMessages] = await Promise.all([
        fetchAllAdminOrders(),
        fetchAllProfiles(),
        fetchAllAdminBlogPosts(),
        fetchAllAdminProducts(),
        fetchAllContactMessages(),
        loadExchangeRate(),
      ]);

      setOrders(fetchedOrders);
      setProfiles(fetchedProfiles);
      setBlogPosts(fetchedBlogPosts);
      setProducts(fetchedProducts);
      setContactMessages(fetchedMessages);
    } catch (err: any) {
      console.error('[AdminPage] Error loading data:', err);
      setErrorMessage('Failed to fetch data from Supabase. Please check connection and permissions.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [loadExchangeRate]);

  useEffect(() => {
    loadData();

    // Setup real-time postgres changes subscription on orders & contact messages
    const ordersChannel = supabase
      .channel('admin_realtime_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[Admin Realtime] orders change detected:', payload);
          loadData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_messages' },
        (payload) => {
          console.log('[Admin Realtime] contact_messages change detected:', payload);
          loadData(true);
        }
      )
      .subscribe();

    const handleLocalOrderUpdated = () => {
      loadData(true);
    };

    window.addEventListener('orderUpdated', handleLocalOrderUpdated);

    return () => {
      supabase.removeChannel(ordersChannel);
      window.removeEventListener('orderUpdated', handleLocalOrderUpdated);
    };
  }, [loadData]);

  // Derived Pending Quotes list (includes new requests and revision requests)
  const pendingQuoteOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.fulfillment_status || o.status || '').toLowerCase();
      return st === 'pending_quote' || st === 'received' || st === 'revision_requested';
    });
  }, [orders]);

  // Derived Pending Confirmation orders (quoted / awaiting payment)
  const pendingConfirmationOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.fulfillment_status || o.status || '').toLowerCase();
      return st === 'quoted' || st === 'awaiting_payment';
    });
  }, [orders]);

  // Derived Confirmed orders
  const confirmedOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.fulfillment_status || o.status || '').toLowerCase();
      return st === 'confirmed';
    });
  }, [orders]);

  // Derived In Production orders (orders currently in production)
  const inProductionOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.fulfillment_status || o.status || '').toLowerCase();
      const isInProd = st === 'in_production' || st === 'in_progress';
      if (!isInProd) return false;

      if (inProgressSearchQuery.trim()) {
        const q = inProgressSearchQuery.toLowerCase().trim();
        const matchesId = String(o.id || '').toLowerCase().includes(q);
        const matchesTitle = String(o.title || '').toLowerCase().includes(q);
        const matchesCustomer = String(o.customer_name || '').toLowerCase().includes(q);
        const matchesEmail = String(o.customer_email || o.user_id || '').toLowerCase().includes(q);
        const matchesNotes = String(o.status_note || o.admin_notes || '').toLowerCase().includes(q);
        return matchesId || matchesTitle || matchesCustomer || matchesEmail || matchesNotes;
      }
      return true;
    });
  }, [orders, inProgressSearchQuery]);

  // Derived Completed / Quality Check orders
  const completedOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.fulfillment_status || o.status || '').toLowerCase();
      return st === 'quality_check' || st === 'completed';
    });
  }, [orders]);

  // Derived Shipped & Delivered orders
  const shippedOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.fulfillment_status || o.status || '').toLowerCase();
      return st === 'shipped' || st === 'delivered';
    });
  }, [orders]);

  // Derived Store merchandise orders (4-stage fulfillment lifecycle)
  const storeOrders = useMemo(() => {
    return orders.filter((o) => {
      const isStoreType = o.order_type === 'store';
      const detailsType = o.request_details && (o.request_details.order_type === 'store' || o.request_details.is_store_order);
      return isStoreType || detailsType;
    });
  }, [orders]);

  // Derived unread contact messages count
  const unreadMessagesCount = useMemo(() => {
    return contactMessages.filter((m) => m.status === 'new').length;
  }, [contactMessages]);

  // Handler to open stitch tracker for a custom stitched order
  const handleOpenStitchTracker = (order: SupabaseStitchOrderRow) => {
    setSelectedStitchTrackerOrder(order);
    setIsStitchTrackerOpen(true);
  };

  // Derived filtered orders for ALL JOBS tab
  const filteredAllOrders = useMemo(() => {
    return orders.filter((o) => {
      // Customer filter if selected from Customers tab
      if (customerOrdersFilterEmail) {
        const orderEmail = (o.customer_email || o.user_id || '').toLowerCase();
        if (orderEmail !== customerOrdersFilterEmail.toLowerCase()) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const orderStatus = (o.fulfillment_status || o.status || '').toLowerCase();
        if (statusFilter === 'pending_quote') {
          if (orderStatus !== 'pending_quote' && orderStatus !== 'received') return false;
        } else if (statusFilter === 'in_production') {
          if (orderStatus !== 'in_production' && orderStatus !== 'in_progress') return false;
        } else if (statusFilter === 'quality_check') {
          if (orderStatus !== 'quality_check' && orderStatus !== 'completed') return false;
        } else if (statusFilter === 'shipped') {
          if (orderStatus !== 'shipped' && orderStatus !== 'delivered') return false;
        } else if (statusFilter === 'cancelled') {
          if (orderStatus !== 'cancelled' && orderStatus !== 'canceled') return false;
        } else if (orderStatus !== statusFilter) {
          return false;
        }
      }

      // Order type filter
      if (orderTypeFilter !== 'all') {
        if (o.order_type !== orderTypeFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = String(o.id || '').toLowerCase().includes(q);
        const matchesTitle = String(o.title || '').toLowerCase().includes(q);
        const matchesCustomer = String(o.customer_name || '').toLowerCase().includes(q);
        const matchesEmail = String(o.customer_email || o.user_id || '').toLowerCase().includes(q);
        const matchesNotes = String(o.status_note || o.admin_notes || '').toLowerCase().includes(q);
        const matchesTracking = String(o.tracking_number || '').toLowerCase().includes(q);
        return matchesId || matchesTitle || matchesCustomer || matchesEmail || matchesNotes || matchesTracking;
      }

      return true;
    });
  }, [orders, statusFilter, orderTypeFilter, searchQuery, customerOrdersFilterEmail]);

  // Map of orders per profile email for customer stats
  const ordersCountByCustomer = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      const email = (o.customer_email || o.user_id || '').toLowerCase();
      if (email) {
        counts[email] = (counts[email] || 0) + 1;
      }
      if (o.user_id && o.user_id !== email) {
        counts[o.user_id] = (counts[o.user_id] || 0) + 1;
      }
    }
    return counts;
  }, [orders]);

  // Filtered Profiles list for CUSTOMERS tab
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const effectiveTier = getEffectiveTier(p);
      if (customerTierFilter !== 'all' && effectiveTier !== customerTierFilter) {
        return false;
      }

      if (customerSearchQuery.trim()) {
        const q = customerSearchQuery.toLowerCase().trim();
        const name = (p.display_name || p.name || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const role = (p.role || '').toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q);
      }

      return true;
    });
  }, [profiles, customerTierFilter, customerSearchQuery]);

  // Open Converter Modal for an order in Admin Mode
  const handleOpenConverterForOrder = (order: SupabaseStitchOrderRow) => {
    setSelectedOrderForConverter(order);
  };

  // Open Quote Form for an order
  const handleOpenQuoteForm = (order: SupabaseStitchOrderRow) => {
    setSelectedQuoteOrder(order);
    const details = order.request_details || {};
    const existingQuote = order.quote;
    const threadReqs = (details.thread_requirements && Array.isArray(details.thread_requirements) && details.thread_requirements.length > 0)
      ? details.thread_requirements
      : (order.thread_requirements && Array.isArray(order.thread_requirements) && order.thread_requirements.length > 0)
      ? order.thread_requirements
      : null;

    if (existingQuote?.line_items && Array.isArray(existingQuote.line_items) && existingQuote.line_items.length > 0) {
      // 1. Existing itemized quote
      const isLegacy = existingQuote.currency !== 'LKR';
      const quoteRate = parseFloat(exchangeRateInput) || 300;
      const rateMultiplier = isLegacy ? quoteRate : 1;

      setQuoteLineItems(
        existingQuote.line_items.map((it, idx) => {
          const qty = it.quantity !== undefined ? it.quantity : 1;
          const uPrice = it.unit_price !== undefined ? (Number(it.unit_price) * rateMultiplier) : 0;
          const numQty = parseFloat(String(qty)) || 0;
          const numUPrice = parseFloat(String(uPrice)) || 0;
          return {
            id: it.id || `item_${idx + 1}`,
            description: it.description || '',
            reference_qty: it.reference_qty || '',
            quantity: qty,
            unit: it.unit || 'pcs',
            unit_price: isLegacy ? numUPrice.toFixed(2) : uPrice,
            total: Number((numQty * numUPrice).toFixed(2)),
            dmc_code: it.dmc_code,
            hex: it.hex,
          };
        })
      );
      setCraftingChargeInput(existingQuote.crafting_charge !== undefined ? String(Number((Number(existingQuote.crafting_charge) * rateMultiplier).toFixed(2))) : '0');
      setDeliveryChargeInput(existingQuote.delivery_charge !== undefined ? String(Number((Number(existingQuote.delivery_charge) * rateMultiplier).toFixed(2))) : '1500.00');
      setAdminNotesInput(existingQuote.admin_notes || order.admin_notes || '');
    } else if (threadReqs && threadReqs.length > 0) {
      // 2. Pre-populate from converter thread requirements (LKR amounts)
      const populatedItems = threadReqs.map((item: any, idx: number) => {
        const skeins = item.skeins_needed || (item.stitch_count ? Math.max(1, Math.ceil(Number(item.stitch_count) / 1800)) : 1);
        const unitPrice = 360.00;
        return {
          id: `item_dmc_${idx + 1}`,
          description: `DMC ${item.dmc_code || ''} - ${item.color_name || 'Embroidery Floss'}`,
          reference_qty: item.stitch_count ? `${Number(item.stitch_count).toLocaleString()} stitches` : '',
          quantity: skeins,
          unit: 'skeins',
          unit_price: unitPrice.toFixed(2),
          total: Number((skeins * unitPrice).toFixed(2)),
          dmc_code: item.dmc_code,
          hex: item.hex,
        };
      });

      // Add pre-filled row for fabric (Aida cloth) in LKR
      const fabricDetails = details.fabric_details || {};
      const fabricCount = details.fabric_count || fabricDetails.fabric_count || 14;
      const fabricDesc = fabricDetails.fabric_type || `${fabricCount}-Count Aida Cloth`;
      const fabricDimensions = fabricDetails.dimensions_str || (details.size ? `(${details.size})` : '');

      populatedItems.push({
        id: `item_fabric_base`,
        description: `${fabricDesc} ${fabricDimensions}`.trim(),
        reference_qty: 'Fabric base',
        quantity: 1,
        unit: 'pcs',
        unit_price: '2400.00',
        total: 2400.00,
      });

      setQuoteLineItems(populatedItems);
      const isCustomStitched = order.order_type === 'custom_stitched' || (order.title && order.title.toLowerCase().includes('stitched'));
      setCraftingChargeInput(isCustomStitched ? '10500.00' : '0');
      setDeliveryChargeInput('1500.00');
      setAdminNotesInput(
        order.admin_notes ||
        `Custom kit prepared with ${threadReqs.length} DMC stranded floss skeins, premium Zweigart Aida fabric, needle pack & full-color chart guide.`
      );
    } else {
      // 3. Assisted kit or custom keepsake without predefined thread array (LKR amounts)
      const defaultDesc = order.order_type === 'custom_stitched'
        ? 'Handcrafted Bespoke Embroidery Keepsake'
        : order.order_type === 'custom_kit_assisted'
        ? 'Assisted Custom Kit Materials (Floss & Fabric)'
        : 'Embroidery Materials & Supplies';

      const initialPrice = existingQuote?.item_price ?? order.item_price ?? (order.total_amount && order.total_amount > 0 ? order.total_amount : '');
      const numPrice = parseFloat(String(initialPrice)) || 0;

      setQuoteLineItems([
        {
          id: `item_1`,
          description: defaultDesc,
          reference_qty: details.size ? `Size: ${details.size}` : '',
          quantity: 1,
          unit: 'pcs',
          unit_price: initialPrice !== '' ? String(initialPrice) : '',
          total: numPrice,
        },
      ]);
      setCraftingChargeInput(order.order_type === 'custom_stitched' ? (existingQuote?.crafting_charge !== undefined ? String(existingQuote.crafting_charge) : '10500.00') : '0');
      setDeliveryChargeInput(existingQuote?.delivery_charge !== undefined ? String(existingQuote.delivery_charge) : '1500.00');
      setAdminNotesInput(existingQuote?.admin_notes || order.admin_notes || '');
    }
  };

  // Line item helpers for Quote Form
  const handleUpdateLineItem = (index: number, field: string, val: any) => {
    setQuoteLineItems((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: val };
      const qty = parseFloat(String(target.quantity)) || 0;
      const unitP = parseFloat(String(target.unit_price)) || 0;
      target.total = Number((qty * unitP).toFixed(2));
      next[index] = target;
      return next;
    });
  };

  const handleAddLineItem = () => {
    setQuoteLineItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        description: '',
        reference_qty: '',
        quantity: 1,
        unit: 'pcs',
        unit_price: '',
        total: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setQuoteLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Customer profile and effective tier for the currently selected quote order
  const selectedQuoteProfile = useMemo(() => {
    if (!selectedQuoteOrder) return null;
    const details = selectedQuoteOrder.request_details || {};
    const userKey = String(selectedQuoteOrder.user_id || details.customer_email || details.email || '').toLowerCase();
    return (
      profiles.find((p) => 
        (p.id && String(p.id).toLowerCase() === userKey) ||
        (p.user_id && String(p.user_id).toLowerCase() === userKey) ||
        (p.email && String(p.email).toLowerCase() === userKey)
      ) ||
      profiles.find((p) => p.id && String(p.id).toLowerCase() === String(selectedQuoteOrder.user_id || '').toLowerCase()) ||
      profiles.find((p) => p.email && String(p.email).toLowerCase() === String(selectedQuoteOrder.customer_email || details.customer_email || '').toLowerCase()) ||
      null
    );
  }, [selectedQuoteOrder, profiles]);

  const quoteCustomerEffectiveTier = useMemo(() => {
    if (selectedQuoteProfile) {
      return getEffectiveTier(selectedQuoteProfile);
    }
    if (selectedQuoteOrder?.customer_tier) {
      const raw = selectedQuoteOrder.customer_tier.toLowerCase();
      if (raw.includes('studio')) return 'studio';
      if (raw.includes('pro')) return 'pro';
      return 'free';
    }
    return 'free';
  }, [selectedQuoteProfile, selectedQuoteOrder]);

  const isQuoteCustomerStudio = quoteCustomerEffectiveTier === 'studio';

  // Running totals calculations for Quote Modal
  const itemsSubtotal = useMemo(() => {
    return quoteLineItems.reduce((sum, it) => {
      const qty = parseFloat(String(it.quantity)) || 0;
      const unitP = parseFloat(String(it.unit_price)) || 0;
      return sum + (qty * unitP);
    }, 0);
  }, [quoteLineItems]);

  const numCraftingCharge = parseFloat(craftingChargeInput) || 0;
  const numDeliveryCharge = parseFloat(deliveryChargeInput) || 0;
  const discountableAmount = itemsSubtotal + numCraftingCharge;

  const quoteDiscountPercent = isQuoteCustomerStudio ? 15 : 0;
  const quoteDiscountAmount = isQuoteCustomerStudio ? Number((discountableAmount * 0.15).toFixed(2)) : 0;
  const calculatedGrandTotal = Number((discountableAmount - quoteDiscountAmount + numDeliveryCharge).toFixed(2));

  // Submit Quote Form
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteOrder) return;

    if (quoteLineItems.length === 0) {
      alert('Please add at least one line item to the quotation.');
      return;
    }

    const processedLineItems = quoteLineItems.map((it, idx) => {
      const qty = parseFloat(String(it.quantity)) || 0;
      const uPrice = parseFloat(String(it.unit_price)) || 0;
      return {
        id: it.id || `item_${idx + 1}`,
        description: it.description.trim() || 'Material Item',
        reference_qty: it.reference_qty || '',
        quantity: qty,
        unit: it.unit || 'pcs',
        unit_price: uPrice,
        total: Number((qty * uPrice).toFixed(2)),
        dmc_code: it.dmc_code,
        hex: it.hex,
      };
    });

    setIsSubmittingQuote(true);
    try {
      const result = await submitAdminQuote(selectedQuoteOrder.id, {
        currency: 'LKR',
        line_items: processedLineItems,
        items_subtotal: itemsSubtotal,
        crafting_charge: numCraftingCharge,
        discount_percent: quoteDiscountPercent,
        discount_amount: quoteDiscountAmount,
        delivery_charge: numDeliveryCharge,
        total_amount: calculatedGrandTotal,
        admin_notes: adminNotesInput.trim(),
      });

      if (result.success) {
        showToast(`Itemized quote for Order #${selectedQuoteOrder.id} saved & published! (${processedLineItems.length} items, ${formatOrderDualPrice(calculatedGrandTotal)}${quoteDiscountAmount > 0 ? ` incl. 15% Studio discount -${formatOrderDualPrice(quoteDiscountAmount)}` : ''})`);
        setSelectedQuoteOrder(null);
        await loadData(true);
      } else {
        alert('Failed to save quote: ' + (result.error?.message || 'Unknown database error'));
      }
    } catch (err: any) {
      console.error('Exception saving quote:', err);
      alert('An error occurred while saving quote.');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Open Order Edit / Stage Advancement Panel
  const handleOpenOrderEdit = (order: SupabaseStitchOrderRow) => {
    setSelectedOrderForEdit(order);
    setEditStatus(order.fulfillment_status || order.status || 'confirmed');
    setEditProgressPercent(order.progress_percent ?? 0);
    setEditProgressNote(order.progress_note || '');
    setEditTrackingNumber(order.tracking_number || '');
    setEditStatusNote(order.status_note || '');
    setEditAdminNotes(order.admin_notes || order.quote?.admin_notes || '');
    setEditEstimatedCompletion(order.estimated_completion || '');
  };

  // Save Order Stage / Progress / Tracking updates
  const handleSaveOrderEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForEdit) return;

    setIsSavingOrder(true);
    try {
      const updates: Parameters<typeof updateAdminOrderDetails>[1] = {
        fulfillment_status: editStatus,
        status_note: editStatusNote.trim() || undefined,
        admin_notes: editAdminNotes.trim() || undefined,
        estimated_completion: editEstimatedCompletion.trim() || undefined,
      };

      // If shipped, include tracking number
      if (editStatus === 'shipped' || editTrackingNumber.trim()) {
        updates.tracking_number = editTrackingNumber.trim();
      }

      // If custom_stitched and in_production, update progress and progress_updated_at
      if (selectedOrderForEdit.order_type === 'custom_stitched' && (editStatus === 'in_production' || editStatus === 'in_progress')) {
        updates.progress_percent = Math.min(100, Math.max(0, Number(editProgressPercent) || 0));
        updates.progress_note = editProgressNote.trim();
        updates.progress_updated_at = new Date().toISOString();
      }

      const result = await updateAdminOrderDetails(selectedOrderForEdit.id, updates);

      if (result.success) {
        showToast(`Order #${selectedOrderForEdit.id} successfully updated to stage '${editStatus}'!`);
        setSelectedOrderForEdit(null);
        await loadData(true);
      } else {
        alert('Failed to update order: ' + (result.error?.message || 'Unknown database error'));
      }
    } catch (err: any) {
      console.error('Exception updating order:', err);
      alert('An error occurred while updating order.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Open Decline Order Modal
  const handleOpenDeclineModal = (order: SupabaseStitchOrderRow) => {
    setDeclineModalOrder(order);
    setDeclineReason('');
  };

  // Submit Decline Order
  const handleSubmitDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineModalOrder) return;
    if (!declineReason.trim()) {
      alert('Please provide a reason for declining this request (visible to the customer).');
      return;
    }

    setIsDeclining(true);
    try {
      const res = await declineAdminOrder(declineModalOrder.id, declineReason.trim());
      if (res.success) {
        showToast(`Order #${declineModalOrder.id} has been declined.`);
        setDeclineModalOrder(null);
        setDeclineReason('');
        await loadData(true);
      } else {
        alert(`Failed to decline order: ${res.message || 'Unknown database error'}`);
      }
    } catch (err: any) {
      console.error('Exception declining order:', err);
      alert('An error occurred while declining order.');
    } finally {
      setIsDeclining(false);
    }
  };

  function getAdminStageRank(status: string, isStore: boolean): number {
    const s = (status || '').toLowerCase().trim();
    if (isStore) {
      if (s === 'delivered' || s.includes('deliver')) return 3;
      if (s === 'shipped' || s.includes('ship')) return 2;
      if (s === 'processing' || s === 'in_progress' || s === 'in_production') return 1;
      return 0;
    } else {
      if (s === 'delivered') return 6;
      if (s === 'shipped') return 5;
      if (s === 'quality_check' || s === 'completed') return 4;
      if (s === 'in_production' || s === 'in_progress') return 3;
      if (s === 'confirmed' || s === 'paid') return 2;
      if (s === 'quoted' || s === 'awaiting_payment' || s === 'revision_requested') return 1;
      return 0;
    }
  }

  const handleOpenManualPaymentModal = (order: SupabaseStitchOrderRow) => {
    const isCustom = order.order_type === 'custom_stitched' ||
      (order.title && order.title.toLowerCase().includes('stitched')) ||
      (order.request_details?.order_type === 'custom_stitched');
    const payStatus = order.payment_status || 'pending_quote';
    
    let defaultWhat: '50% advance' | 'Balance' | 'Paid in full' = 'Paid in full';
    if (isCustom) {
      if (payStatus === 'deposit_paid') {
        defaultWhat = 'Balance';
      } else {
        defaultWhat = '50% advance';
      }
    } else {
      defaultWhat = 'Paid in full';
    }

    const quote = order.quote || order.request_details?.quote;
    const isLegacy = quote && quote.currency && quote.currency !== 'LKR';
    const mult = isLegacy ? (parseFloat(exchangeRateInput) || 300) : 1;
    const totalAmount = Number(quote?.total_amount ?? order.total_amount ?? order.quoted_price ?? order.item_price ?? 0) * mult;
    const totalCents = Math.round(totalAmount * 100);
    const advanceLkr = Math.floor(totalCents / 2) / 100;
    const amountPaid = Number(order.amount_paid_lkr || 0);
    const balanceLkr = Math.max(0, totalAmount - Math.max(amountPaid, advanceLkr));
    const paidInFullLkr = Math.max(0, totalAmount - amountPaid);

    let defaultAmt = advanceLkr;
    if (defaultWhat === 'Balance') defaultAmt = balanceLkr;
    if (defaultWhat === 'Paid in full') defaultAmt = paidInFullLkr;

    setManualPaymentWhat(defaultWhat);
    setManualPaymentAmount(String(defaultAmt));
    setManualPaymentMethod('Bank transfer');
    setManualPaymentRef('');
    setManualPaymentDate(new Date().toISOString().split('T')[0]);
    setIsManualPaymentConfirming(false);
    setIsManualPaymentModalOpen(true);
  };

  const handleWhatChange = (what: '50% advance' | 'Balance' | 'Paid in full') => {
    setManualPaymentWhat(what);
    if (!selectedOrderForEdit) return;
    const quote = selectedOrderForEdit.quote || selectedOrderForEdit.request_details?.quote;
    const isLegacy = quote && quote.currency && quote.currency !== 'LKR';
    const mult = isLegacy ? (parseFloat(exchangeRateInput) || 300) : 1;
    const totalAmount = Number(quote?.total_amount ?? selectedOrderForEdit.total_amount ?? selectedOrderForEdit.quoted_price ?? selectedOrderForEdit.item_price ?? 0) * mult;
    const totalCents = Math.round(totalAmount * 100);
    const advanceLkr = Math.floor(totalCents / 2) / 100;
    const amountPaid = Number(selectedOrderForEdit.amount_paid_lkr || 0);
    const balanceLkr = Math.max(0, totalAmount - Math.max(amountPaid, advanceLkr));
    const paidInFullLkr = Math.max(0, totalAmount - amountPaid);

    let amt = advanceLkr;
    if (what === 'Balance') amt = balanceLkr;
    if (what === 'Paid in full') amt = paidInFullLkr;
    setManualPaymentAmount(String(amt));
  };

  const handleSaveManualPayment = async () => {
    if (!selectedOrderForEdit) return;
    setIsSavingManualPayment(true);
    try {
      const rawId = selectedOrderForEdit.raw_order_id || selectedOrderForEdit.id;
      const currentPaid = Number(selectedOrderForEdit.amount_paid_lkr || 0);
      const enteredAmt = Number(manualPaymentAmount) || 0;
      const nowIso = new Date(`${manualPaymentDate}T${new Date().toTimeString().split(' ')[0]}`).toISOString();

      let newPaymentStatus = selectedOrderForEdit.payment_status || 'pending_quote';
      let newDepositPaidAt = selectedOrderForEdit.deposit_paid_at;
      let newBalancePaidAt = selectedOrderForEdit.balance_paid_at;
      let newAmountPaid = currentPaid;

      const isCustomStitched = selectedOrderForEdit.order_type === 'custom_stitched' ||
        (selectedOrderForEdit.title && selectedOrderForEdit.title.toLowerCase().includes('stitched')) ||
        (selectedOrderForEdit.request_details?.order_type === 'custom_stitched');

      if (manualPaymentWhat === '50% advance') {
        newPaymentStatus = 'deposit_paid';
        newDepositPaidAt = nowIso;
        newAmountPaid = enteredAmt;
      } else if (manualPaymentWhat === 'Balance') {
        newPaymentStatus = 'paid';
        newBalancePaidAt = nowIso;
        newAmountPaid = currentPaid + enteredAmt;
      } else if (manualPaymentWhat === 'Paid in full') {
        newPaymentStatus = 'paid';
        newAmountPaid = currentPaid + enteredAmt;
        if (isCustomStitched && !newDepositPaidAt) {
          newDepositPaidAt = nowIso;
        }
      }

      const wasUnpaid = !selectedOrderForEdit.payment_status || selectedOrderForEdit.payment_status === 'pending_quote' || selectedOrderForEdit.payment_status === 'awaiting_payment';
      const isStore = (selectedOrderForEdit.order_type || '').toLowerCase() === 'store' || (selectedOrderForEdit.request_details?.order_type || '').toLowerCase() === 'store';
      let newFulfillmentStatus = selectedOrderForEdit.fulfillment_status || selectedOrderForEdit.status || 'confirmed';

      if (wasUnpaid && (manualPaymentWhat === '50% advance' || manualPaymentWhat === 'Paid in full')) {
        const targetStatus = isStore ? 'received' : 'confirmed';
        const currentRank = getAdminStageRank(newFulfillmentStatus, isStore);
        const targetRank = getAdminStageRank(targetStatus, isStore);
        if (currentRank < targetRank) {
          newFulfillmentStatus = targetStatus;
        }
      }

      const dateStr = manualPaymentDate;
      const newLine = `${dateStr}: ${manualPaymentWhat} LKR ${enteredAmt.toLocaleString()} received by ${manualPaymentMethod}, ref: ${manualPaymentRef || 'None'}`;
      const existingNotes = selectedOrderForEdit.admin_notes || selectedOrderForEdit.quote?.admin_notes || '';
      const updatedAdminNotes = existingNotes ? `${existingNotes}\n${newLine}` : newLine;

      const payload: Record<string, any> = {
        payment_status: newPaymentStatus,
        amount_paid_lkr: newAmountPaid,
        admin_notes: updatedAdminNotes,
        fulfillment_status: newFulfillmentStatus,
        updated_at: new Date().toISOString(),
      };
      if (newDepositPaidAt) payload.deposit_paid_at = newDepositPaidAt;
      if (newBalancePaidAt) payload.balance_paid_at = newBalancePaidAt;

      const { error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', rawId);

      if (error) {
        alert('Failed to record manual payment: ' + error.message);
      } else {
        showToast(`Successfully recorded manual payment of LKR ${enteredAmt.toLocaleString()}!`);
        setIsManualPaymentModalOpen(false);
        setSelectedOrderForEdit(null);
        setIsManualPaymentConfirming(false);
        await loadData(true);
      }
    } catch (err: any) {
      console.error('Error saving manual payment:', err);
      alert('An error occurred while saving manual payment.');
    } finally {
      setIsSavingManualPayment(false);
    }
  };

  // Switch to All Jobs tab and filter by specific customer
  const handleViewCustomerOrders = (customerEmail: string) => {
    setCustomerOrdersFilterEmail(customerEmail);
    setStatusFilter('all');
    setOrderTypeFilter('all');
    setSearchQuery('');
    setTopLevelTab('jobs');
    setJobsSubTab('all');
  };

  // Render Status Badge helper
  const renderStatusBadge = (status?: string) => {
    const s = (status || 'pending_quote').toLowerCase();
    switch (s) {
      case 'pending_quote':
      case 'received':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-700" /> Pending Quote
          </span>
        );
      case 'revision_requested':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> Revision Requested
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Declined
          </span>
        );
      case 'cancelled':
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-300">
            <X className="w-3.5 h-3.5 text-gray-400" /> Cancelled
          </span>
        );
      case 'quoted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300">
            <DollarSign className="w-3.5 h-3.5 text-blue-700" /> Quoted
          </span>
        );
      case 'awaiting_payment':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-300">
            <CreditCard className="w-3.5 h-3.5 text-purple-700" /> Awaiting Payment
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Confirmed
          </span>
        );
      case 'in_production':
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-300 animate-pulse">
            <Activity className="w-3.5 h-3.5 text-indigo-700" /> In Production
          </span>
        );
      case 'quality_check':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-900 border border-teal-300">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" /> Quality Check
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-900 border border-orange-300">
            <Truck className="w-3.5 h-3.5 text-orange-700" /> Shipped
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-950 border border-emerald-400">
            <Check className="w-3.5 h-3.5 text-emerald-800" /> Delivered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">
            {s.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  // Render Effective Tier badge
  const renderTierBadge = (tier?: string) => {
    const t = (tier || 'free').toLowerCase();
    if (t.includes('studio')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E06C38]/15 text-[#E06C38] border border-[#E06C38]/30">
          <Sparkles className="w-3 h-3 text-[#E06C38]" /> Studio
        </span>
      );
    }
    if (t.includes('pro')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2D5A43]/15 text-[#2D5A43] border border-[#2D5A43]/30">
          <Award className="w-3 h-3 text-[#2D5A43]" /> Pro Crafter
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        Free
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#1D231E]">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-[#1D231E] text-white px-5 py-3 rounded-xl shadow-2xl border border-white/20 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Admin Header */}
      <div className="bg-[#1D231E] text-white border-b border-white/10 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E06C38] flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white font-serif">
                    Thread Artisan Admin Studio
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Role: Administrator
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  Signed in as <span className="text-white font-medium">{user?.email}</span> — Real-time order fulfillment & pricing desk
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/15 disabled:opacity-50"
                title="Refresh orders and profiles from Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#E06C38]' : ''}`} />
                {isRefreshing ? 'Syncing...' : 'Sync Supabase'}
              </button>

              <button
                onClick={onGoHome}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium transition-colors border border-white/10"
              >
                Exit to Website
              </button>
            </div>
          </div>

          {/* TOP-LEVEL NAVIGATION TABS: Jobs and Blogs (with Customers) */}
          <div className="flex items-center gap-1 border-t border-white/10 pt-1 -mb-px overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                setTopLevelTab('jobs');
              }}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                topLevelTab === 'jobs'
                  ? 'border-[#E06C38] text-white bg-white/10 shadow-inner'
                  : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Package className="w-4 h-4 text-[#E06C38]" />
              <span>Jobs</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white">
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => {
                setTopLevelTab('blogs');
                setCustomerOrdersFilterEmail(null);
              }}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                topLevelTab === 'blogs'
                  ? 'border-[#E06C38] text-white bg-white/10 shadow-inner'
                  : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#E06C38]" />
              <span>Blogs</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white">
                {blogPosts.length}
              </span>
            </button>

            <button
              onClick={() => {
                setTopLevelTab('store');
                setCustomerOrdersFilterEmail(null);
              }}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                topLevelTab === 'store'
                  ? 'border-[#E06C38] text-white bg-white/10 shadow-inner'
                  : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Store className="w-4 h-4 text-[#E06C38]" />
              <span>Store</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white">
                {products.length}
              </span>
            </button>

            <button
              onClick={() => {
                setTopLevelTab('customers');
                setCustomerOrdersFilterEmail(null);
              }}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                topLevelTab === 'customers'
                  ? 'border-[#E06C38] text-white bg-white/10 shadow-inner'
                  : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4 text-[#E06C38]" />
              <span>Customers</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white">
                {profiles.length}
              </span>
            </button>

            <button
              onClick={() => {
                setTopLevelTab('messages');
                setCustomerOrdersFilterEmail(null);
              }}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                topLevelTab === 'messages'
                  ? 'border-[#E06C38] text-white bg-white/10 shadow-inner'
                  : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#E06C38]" />
              <span>Messages</span>
              {unreadMessagesCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E06C38] text-white animate-pulse">
                  {unreadMessagesCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white">
                  {contactMessages.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setTopLevelTab('settings');
                setCustomerOrdersFilterEmail(null);
              }}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                topLevelTab === 'settings'
                  ? 'border-[#E06C38] text-white bg-white/10 shadow-inner'
                  : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4 text-[#E06C38]" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Error Loading Admin Data</p>
              <p className="text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 border-4 border-[#E06C38]/20 border-t-[#E06C38] rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-[#1D231E]">Loading Admin Records...</h3>
            <p className="text-sm text-[#1D231E]/60 max-w-sm">
              Fetching orders and customer accounts from Supabase.
            </p>
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* TOP-LEVEL TAB 1: JOBS MANAGEMENT */}
            {/* ========================================================================= */}
            {topLevelTab === 'jobs' && (
              <JobsTab
                orders={orders}
                jobsSubTab={jobsSubTab}
                setJobsSubTab={setJobsSubTab}
                filteredAllOrders={filteredAllOrders}
                pendingQuoteOrders={pendingQuoteOrders}
                pendingConfirmationOrders={pendingConfirmationOrders}
                confirmedOrders={confirmedOrders}
                inProductionOrders={inProductionOrders}
                completedOrders={completedOrders}
                shippedOrders={shippedOrders}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                orderTypeFilter={orderTypeFilter}
                setOrderTypeFilter={setOrderTypeFilter}
                inProgressSearchQuery={inProgressSearchQuery}
                setInProgressSearchQuery={setInProgressSearchQuery}
                customerOrdersFilterEmail={customerOrdersFilterEmail}
                setCustomerOrdersFilterEmail={setCustomerOrdersFilterEmail}
                onOpenEdit={handleOpenOrderEdit}
                onOpenQuote={handleOpenQuoteForm}
                onOpenDecline={handleOpenDeclineModal}
                onOpenConverter={handleOpenConverterForOrder}
                onOpenStitchTracker={handleOpenStitchTracker}
                onPreviewImage={setPreviewImageModal}
                onViewCustomerHistory={handleViewCustomerOrders}
                renderStatusBadge={renderStatusBadge}
                renderTierBadge={renderTierBadge}
              />
            )}



            {/* ========================================================================= */}
            {/* TOP-LEVEL TAB 2: BLOGS MANAGEMENT */}
            {/* ========================================================================= */}
            {topLevelTab === 'blogs' && (
              <BlogPostsTab
                posts={blogPosts}
                isLoading={isLoading}
                onRefresh={() => loadData(true)}
                onOpenNewPost={() => {
                  setSelectedPostForEdit(null);
                  setIsBlogEditorOpen(true);
                }}
                onEditPost={(post) => {
                  setSelectedPostForEdit(post);
                  setIsBlogEditorOpen(true);
                }}
                showToast={showToast}
              />
            )}

            {/* ========================================================================= */}
            {/* TOP-LEVEL TAB 3: STORE PRODUCTS & ORDERS MANAGEMENT */}
            {/* ========================================================================= */}
            {topLevelTab === 'store' && (
              <div className="space-y-6">
                {/* Store Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-[#E8E1D2] pb-3">
                  <button
                    onClick={() => setStoreSubTab('products')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      storeSubTab === 'products'
                        ? 'bg-[#1D231E] text-white shadow-sm'
                        : 'bg-white text-[#5A6659] hover:bg-[#FAF6EE] border border-[#E8E1D2]'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5 text-[#E06C38]" />
                    <span>Products Catalog</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      storeSubTab === 'products' ? 'bg-white/20 text-white' : 'bg-[#FAF6EE] text-[#5A6659]'
                    }`}>
                      {products.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setStoreSubTab('orders')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      storeSubTab === 'orders'
                        ? 'bg-[#1D231E] text-white shadow-sm'
                        : 'bg-white text-[#5A6659] hover:bg-[#FAF6EE] border border-[#E8E1D2]'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-[#E06C38]" />
                    <span>Store Orders & Tracking</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      storeSubTab === 'orders' ? 'bg-white/20 text-white' : 'bg-[#FAF6EE] text-[#5A6659]'
                    }`}>
                      {storeOrders.length}
                    </span>
                  </button>
                </div>

                {/* Sub-Tab 1: Products */}
                {storeSubTab === 'products' && (
                  <StoreProductsTab
                    products={products}
                    isLoading={isLoading}
                    onRefresh={() => loadData(true)}
                    onOpenNewProduct={() => {
                      setSelectedProductForEdit(null);
                      setIsProductEditorOpen(true);
                    }}
                    onEditProduct={(prod) => {
                      setSelectedProductForEdit(prod);
                      setIsProductEditorOpen(true);
                    }}
                    showToast={showToast}
                  />
                )}

                {/* Sub-Tab 2: Orders & 4-Stage Fulfillment Lifecycle */}
                {storeSubTab === 'orders' && (
                  <StoreOrdersTab
                    orders={storeOrders}
                    isLoading={isLoading}
                    onRefresh={() => loadData(true)}
                    onUpdateOrder={async (orderId, updates) => {
                      return await updateAdminOrderDetails(orderId, updates);
                    }}
                    showToast={showToast}
                    renderStatusBadge={renderStatusBadge}
                  />
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TOP-LEVEL TAB 4: CUSTOMERS DIRECTORY */}
            {/* ========================================================================= */}
            {topLevelTab === 'customers' && (
              <CustomersTab
                filteredProfiles={filteredProfiles}
                customerSearchQuery={customerSearchQuery}
                setCustomerSearchQuery={setCustomerSearchQuery}
                customerTierFilter={customerTierFilter}
                setCustomerTierFilter={setCustomerTierFilter}
                ordersCountByCustomer={ordersCountByCustomer}
                getEffectiveTier={getEffectiveTier}
                renderTierBadge={renderTierBadge}
                onViewCustomerOrders={handleViewCustomerOrders}
              />
            )}

            {/* ========================================================================= */}
            {/* TOP-LEVEL TAB 5: CONTACT MESSAGES & INQUIRIES */}
            {/* ========================================================================= */}
            {topLevelTab === 'messages' && (
              <MessagesTab
                messages={contactMessages}
                isLoading={isLoading}
                onRefresh={() => loadData(true)}
                onUpdateStatus={async (id, status) => {
                  const res = await updateContactMessageStatus(id, status);
                  if (res.success) {
                    setContactMessages((prev) =>
                      prev.map((m) => (m.id === id ? { ...m, status } : m))
                    );
                  }
                  return res;
                }}
                onDeleteMessage={async (id) => {
                  const res = await deleteContactMessage(id);
                  if (res.success) {
                    setContactMessages((prev) => prev.filter((m) => m.id !== id));
                  }
                  return res;
                }}
                showToast={showToast}
              />
            )}

            {/* ========================================================================= */}
            {/* TOP-LEVEL TAB 6: SETTINGS & EXCHANGE RATE */}
            {/* ========================================================================= */}
            {topLevelTab === 'settings' && (
              <AdminSettingsTab
                currentRateInput={exchangeRateInput}
                onRateInputChange={setExchangeRateInput}
                onSaveRate={handleSaveExchangeRate}
                isSavingRate={isSavingExchangeRate}
                lastUpdatedAt={rateLastUpdatedAt}
                rateError={rateFetchError}
                onRefresh={loadExchangeRate}
              />
            )}
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SET ITEMIZE PRICING QUOTE FORM */}
      {/* ========================================================================= */}
      {selectedQuoteOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#1D231E]/10 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#1D231E]/10 p-5 sm:p-6 bg-white shrink-0 sticky top-0 z-20">
              <div>
                <h3 className="text-xl font-bold text-[#1D231E] font-serif flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#E06C38]" /> Set Itemized Pricing Quote
                </h3>
                <p className="text-xs text-[#1D231E]/60 mt-0.5">
                  Order #{selectedQuoteOrder.id} • {selectedQuoteOrder.customer_name || 'Customer'}
                </p>
              </div>
              <button
                onClick={() => setSelectedQuoteOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 overscroll-contain">
              {/* Customer Revision Feedback Prompt if revision requested */}
              {(selectedQuoteOrder.fulfillment_status === 'revision_requested' || selectedQuoteOrder.customer_feedback) && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    <span>Customer Revision Request</span>
                  </div>
                  {selectedQuoteOrder.customer_feedback ? (
                    <p className="text-xs text-amber-900 font-medium leading-relaxed">
                      "{selectedQuoteOrder.customer_feedback}"
                    </p>
                  ) : (
                    <p className="text-xs text-amber-800 italic">
                      Customer requested adjustments to the price or materials.
                    </p>
                  )}
                  {selectedQuoteOrder.quote_history && selectedQuoteOrder.quote_history.length > 0 && (() => {
                    const lastPrev = selectedQuoteOrder.quote_history[selectedQuoteOrder.quote_history.length - 1];
                    const isPrevLegacy = lastPrev.currency !== 'LKR';
                    const prevTotal = (Number(lastPrev.total_amount) || Number(lastPrev.quoted_price) || 0) * (isPrevLegacy ? (parseFloat(exchangeRateInput) || 300) : 1);
                    return (
                      <p className="text-[11px] text-amber-800/80 pt-1 border-t border-amber-200">
                        Previous quote of {formatOrderDualPrice(prevTotal)} is archived in history.
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* Legacy Quote Badge in Admin Quote Form */}
              {selectedQuoteOrder.quote && selectedQuoteOrder.quote.currency !== 'LKR' && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>This quote was created prior to LKR migration. Saving will republish it as LKR.</span>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                    Legacy quote, needs re-quote
                  </span>
                </div>
              )}

              {/* Customer summary block */}
              <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-[#1D231E]/5 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#1D231E]/60">Customer:</span>
                    <span className="font-semibold text-[#1D231E]">
                      {selectedQuoteOrder.customer_name || 'Customer'}
                    </span>
                    <span className="text-[#1D231E]/40 font-mono">
                      ({selectedQuoteOrder.customer_email || selectedQuoteOrder.user_id})
                    </span>
                  </div>
                  <div>{renderTierBadge(quoteCustomerEffectiveTier || selectedQuoteOrder.customer_tier)}</div>
                </div>

                {/* Studio Tier Discount Eligibility Banner */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                  isQuoteCustomerStudio
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                    : 'bg-[#FAF6EE] border-[#1D231E]/10 text-[#1D231E]/70'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {isQuoteCustomerStudio ? (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                    <span>
                      {isQuoteCustomerStudio ? (
                        <>
                          <strong className="text-emerald-800 font-bold">Customer is on Studio plan</strong> — 15% discount will be applied automatically
                        </>
                      ) : (
                        <span>Not eligible for a discount</span>
                      )}
                    </span>
                  </div>
                  {isQuoteCustomerStudio && quoteDiscountAmount > 0 && (
                    <span className="font-mono font-bold text-xs text-emerald-700 shrink-0">
                      -<LkrPriceDisplay priceLkr={quoteDiscountAmount} layout="inline" lkrClassName="font-mono font-bold text-xs text-emerald-700" usdClassName="text-[10px] text-emerald-600" /> (15% OFF)
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#1D231E]/5">
                  <span className="text-[#1D231E]/60">Order Type:</span>
                  <span className="font-semibold text-[#1D231E]">
                    {selectedQuoteOrder.order_type === 'custom_kit_converter'
                      ? 'Custom Kit (Photo Converter)'
                      : selectedQuoteOrder.order_type === 'custom_kit_assisted'
                      ? 'Assisted Kit Request'
                      : selectedQuoteOrder.order_type === 'custom_stitched'
                      ? 'Custom Stitched Keepsake'
                      : selectedQuoteOrder.order_type || 'Custom Order'}
                  </span>
                </div>
                {selectedQuoteOrder.request_details?.size && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#1D231E]/60">Pattern Specs:</span>
                    <span className="font-medium text-[#1D231E]">
                      {selectedQuoteOrder.request_details.size}
                    </span>
                  </div>
                )}
              </div>

              {/* LINE ITEMS TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#1D231E] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#E06C38]" /> Quote Line Items ({quoteLineItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-3 py-1 bg-[#2D5A43] hover:bg-[#234735] text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="border border-[#1D231E]/15 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-[#FAF6EE] border-b border-[#1D231E]/10 z-10">
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-[#1D231E]/70">
                          <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                          <th className="py-2.5 px-2 min-w-[110px]">Reference</th>
                          <th className="py-2.5 px-2 w-20">Qty</th>
                          <th className="py-2.5 px-2 w-20">Unit</th>
                          <th className="py-2.5 px-2 w-28">Unit (LKR)</th>
                          <th className="py-2.5 px-3 w-32 text-right">Total</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1D231E]/10 bg-white">
                        {quoteLineItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-xs text-[#1D231E]/40 italic">
                              No line items added. Click "+ Add Item" above.
                            </td>
                          </tr>
                        ) : (
                          quoteLineItems.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-[#FAF6EE]/40 transition-colors">
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  {item.hex && (
                                    <span
                                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20"
                                      style={{ backgroundColor: item.hex }}
                                      title={item.dmc_code ? `DMC #${item.dmc_code}` : undefined}
                                    />
                                  )}
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. DMC 310 - Black"
                                    value={item.description}
                                    onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                                    className="w-full p-1.5 bg-[#FAF6EE] border border-[#1D231E]/10 rounded-lg text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-1 focus:ring-[#E06C38]"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  placeholder="e.g. 1,240 sts"
                                  value={item.reference_qty || ''}
                                  onChange={(e) => handleUpdateLineItem(idx, 'reference_qty', e.target.value)}
                                  className="w-full p-1.5 bg-[#FAF6EE] border border-[#1D231E]/10 rounded-lg text-[11px] font-mono text-[#1D231E]/70 focus:outline-none focus:ring-1 focus:ring-[#E06C38]"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  required
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                                  className="w-full p-1.5 bg-[#FAF6EE] border border-[#1D231E]/10 rounded-lg text-xs text-center font-bold text-[#1D231E] focus:outline-none focus:ring-1 focus:ring-[#E06C38]"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={item.unit || 'pcs'}
                                  onChange={(e) => handleUpdateLineItem(idx, 'unit', e.target.value)}
                                  className="w-full p-1.5 bg-[#FAF6EE] border border-[#1D231E]/10 rounded-lg text-xs text-center text-[#1D231E]/80 focus:outline-none focus:ring-1 focus:ring-[#E06C38]"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  required
                                  placeholder="0.00"
                                  value={item.unit_price}
                                  onChange={(e) => handleUpdateLineItem(idx, 'unit_price', e.target.value)}
                                  className="w-full p-1.5 bg-[#FAF6EE] border border-[#1D231E]/10 rounded-lg text-xs font-mono font-bold text-[#1D231E] focus:outline-none focus:ring-1 focus:ring-[#E06C38]"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <LkrPriceDisplay
                                  priceLkr={item.total || 0}
                                  layout="inline"
                                  lkrClassName="font-bold text-xs font-mono text-[#1D231E]"
                                  usdClassName="text-[10px] text-[#5A6659]"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineItem(idx)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* CRAFTING & DELIVERY CHARGES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1D231E] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-[#2D5A43]" /> Crafting / Artisan Charge (LKR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                      LKR
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={craftingChargeInput}
                      onChange={(e) => setCraftingChargeInput(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl text-sm font-bold text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1D231E] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#E06C38]" /> Delivery / Shipping Charge (LKR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                      LKR
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="1500.00"
                      value={deliveryChargeInput}
                      onChange={(e) => setDeliveryChargeInput(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl text-sm font-bold text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                    />
                  </div>
                </div>
              </div>

              {/* AUTO-CALCULATED RUNNING TOTAL PREVIEW */}
              <div className="bg-[#1D231E] text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/70 block font-medium">Total Quoted Amount</span>
                    {isQuoteCustomerStudio && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        15% Studio Tier Applied
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60 font-mono">
                    <span>Items (<LkrPriceDisplay priceLkr={itemsSubtotal} layout="inline" lkrClassName="font-bold text-white font-mono" usdClassName="text-[10px] text-white/70" />)</span>
                    <span>+</span>
                    <span>Crafting (<LkrPriceDisplay priceLkr={numCraftingCharge} layout="inline" lkrClassName="font-bold text-white font-mono" usdClassName="text-[10px] text-white/70" />)</span>
                    {isQuoteCustomerStudio && quoteDiscountAmount > 0 && (
                      <>
                        <span className="text-emerald-400 font-bold">-</span>
                        <span className="text-emerald-400 font-bold">Studio 15% (-<LkrPriceDisplay priceLkr={quoteDiscountAmount} layout="inline" lkrClassName="font-bold text-emerald-400 font-mono" usdClassName="text-[10px] text-emerald-300" />)</span>
                      </>
                    )}
                    <span>+</span>
                    <span>Shipping (<LkrPriceDisplay priceLkr={numDeliveryCharge} layout="inline" lkrClassName="font-bold text-white font-mono" usdClassName="text-[10px] text-white/70" />)</span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <LkrPriceDisplay
                    priceLkr={calculatedGrandTotal}
                    layout="inline"
                    lkrClassName="text-xl sm:text-2xl font-bold font-serif text-[#E06C38]"
                    usdClassName="text-xs text-white/70"
                  />
                </div>
              </div>

              {/* ADMIN NOTES FIELD */}
              <div>
                <label className="block text-xs font-bold text-[#1D231E] uppercase tracking-wider mb-1.5">
                  Admin Notes & Artisan Details (Shown to Customer)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Includes premium DMC stranded floss, 14ct Zweigart Aida cloth, needle pack & full-color chart guide."
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  className="w-full p-3 bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                />
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1D231E]/10">
                <button
                  type="button"
                  onClick={() => setSelectedQuoteOrder(null)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="px-6 py-2.5 rounded-xl bg-[#E06C38] hover:bg-[#c95927] text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingQuote ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Publishing Itemized Quote...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save & Publish Quote ({formatOrderDualPrice(calculatedGrandTotal)})
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ORDER MANAGEMENT / STAGE ADVANCEMENT PANEL */}
      {/* ========================================================================= */}
      {selectedOrderForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#1D231E]/10 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#1D231E]/10 p-5 sm:p-6 bg-white shrink-0 sticky top-0 z-20">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-[#1D231E] font-serif">
                    Manage Order #{selectedOrderForEdit.id}
                  </h3>
                  {renderStatusBadge(editStatus)}
                </div>
                <p className="text-xs text-[#1D231E]/60 mt-0.5">
                  Customer:{' '}
                  <span className="font-semibold text-[#1D231E]">
                    {selectedOrderForEdit.customer_name || 'Customer'}
                  </span>{' '}
                  ({selectedOrderForEdit.customer_email || selectedOrderForEdit.user_id})
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderForEdit(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1 overscroll-contain">
            {/* Customer & Order Details Summary */}
            {(() => {
              const editDetails = selectedOrderForEdit.request_details || {};
              const editAddress = editDetails.delivery_address || editDetails.address;
              const editPhone = editDetails.phone || editDetails.delivery_phone || editDetails.customer_phone;
              const editNotes = editDetails.customer_notes || editDetails.instructions || editDetails.notes || editDetails.special_instructions;

              return (
                <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-[#1D231E]/10 mb-5 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1D231E] uppercase tracking-wider text-[10px]">
                      Customer & Shipping Details
                    </span>
                    {renderTierBadge(selectedOrderForEdit.customer_tier)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-[#1D231E]/10">
                      <span className="text-[#1D231E]/50 block text-[10px] font-semibold uppercase">Customer</span>
                      <p className="font-semibold text-[#1D231E] mt-0.5">
                        {selectedOrderForEdit.customer_name || editDetails.customer_name || 'Customer'}
                      </p>
                      <p className="text-[11px] text-[#1D231E]/60 truncate">
                        {selectedOrderForEdit.customer_email || editDetails.customer_email || selectedOrderForEdit.user_id}
                      </p>
                      {editPhone && (
                        <p className="text-[11px] text-[#1D231E]/70 font-mono mt-1">
                          Tel: {editPhone}
                        </p>
                      )}
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-[#1D231E]/10">
                      <span className="text-[#1D231E]/50 block text-[10px] font-semibold uppercase flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#1D231E]/40" /> Destination
                      </span>
                      {editAddress ? (
                        <p className="font-semibold text-[#1D231E] mt-0.5 text-[11px]">
                          {editAddress}
                        </p>
                      ) : (
                        <p className="text-[#1D231E]/40 italic text-[11px] mt-0.5">No shipping address recorded</p>
                      )}
                      {editDetails.size && (
                        <p className="text-[10px] text-[#1D231E]/60 mt-1">
                          Specs: {editDetails.size} {editDetails.framing_option ? `• ${editDetails.framing_option}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payment Breakdown & Manual Payment Action Card */}
                  {(() => {
                    const quote = selectedOrderForEdit.quote || selectedOrderForEdit.request_details?.quote;
                    const isLegacy = quote && quote.currency && quote.currency !== 'LKR';
                    const mult = isLegacy ? (parseFloat(exchangeRateInput) || 300) : 1;
                    const totalAmount = Number(quote?.total_amount ?? selectedOrderForEdit.total_amount ?? selectedOrderForEdit.quoted_price ?? selectedOrderForEdit.item_price ?? 0) * mult;
                    const amountPaid = Number(selectedOrderForEdit.amount_paid_lkr || 0);
                    const remaining = Math.max(0, totalAmount - amountPaid);
                    const payStatus = selectedOrderForEdit.payment_status || 'pending_quote';

                    return (
                      <div className="bg-white p-3.5 rounded-xl border border-[#1D231E]/10 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#1D231E]/10 pb-1.5 flex-wrap gap-2">
                          <span className="font-bold text-[#1D231E] flex items-center gap-1.5 text-xs">
                            <CreditCard className="w-3.5 h-3.5 text-[#2D5A43]" /> Payment Breakdown & Status
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            payStatus === 'paid' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                            payStatus === 'deposit_paid' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {payStatus === 'paid' ? 'Paid in Full' : payStatus === 'deposit_paid' ? 'Deposit Paid (50%)' : 'Unpaid / Pending'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          <div className="bg-[#FAF6EE] p-2.5 rounded-lg border border-[#1D231E]/5">
                            <span className="text-[10px] text-[#1D231E]/50 uppercase font-bold block">Total Amount</span>
                            <span className="font-bold text-[#1D231E] font-mono mt-0.5 block">
                              <LkrPriceDisplay priceLkr={totalAmount} layout="inline" />
                            </span>
                          </div>
                          <div className="bg-[#FAF6EE] p-2.5 rounded-lg border border-[#1D231E]/5">
                            <span className="text-[10px] text-[#1D231E]/50 uppercase font-bold block">Paid So Far</span>
                            <span className="font-bold text-emerald-700 font-mono mt-0.5 block">
                              <LkrPriceDisplay priceLkr={amountPaid} layout="inline" />
                            </span>
                          </div>
                          <div className="bg-[#FAF6EE] p-2.5 rounded-lg border border-[#1D231E]/5">
                            <span className="text-[10px] text-[#1D231E]/50 uppercase font-bold block">Remaining</span>
                            <span className="font-bold text-[#E06C38] font-mono mt-0.5 block">
                              <LkrPriceDisplay priceLkr={remaining} layout="inline" />
                            </span>
                          </div>
                        </div>

                        {(selectedOrderForEdit.deposit_paid_at || selectedOrderForEdit.balance_paid_at) && (
                          <div className="text-[11px] text-[#1D231E]/70 flex flex-wrap gap-x-3 gap-y-0.5 pt-1">
                            {selectedOrderForEdit.deposit_paid_at && (
                              <span>Deposit paid: {new Date(selectedOrderForEdit.deposit_paid_at).toLocaleString()}</span>
                            )}
                            {selectedOrderForEdit.balance_paid_at && (
                              <span>Balance paid: {new Date(selectedOrderForEdit.balance_paid_at).toLocaleString()}</span>
                            )}
                          </div>
                        )}

                        {payStatus !== 'paid' && (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const ord = selectedOrderForEdit;
                                handleOpenManualPaymentModal(ord);
                              }}
                              className="px-4 py-2 bg-[#2D5A43] hover:bg-[#234734] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-[#E06C38]" />
                              <span>Record manual payment</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Itemized Quotation Breakdown Card if Quote exists */}
                  {selectedOrderForEdit.quote && (
                    <div className="bg-white p-3.5 rounded-xl border border-[#1D231E]/10 space-y-2">
                      <div className="flex items-center justify-between border-b border-[#1D231E]/10 pb-1.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1D231E] flex items-center gap-1.5 text-xs">
                            <DollarSign className="w-3.5 h-3.5 text-[#E06C38]" /> Itemized Studio Quotation
                          </span>
                          {selectedOrderForEdit.quote.currency !== 'LKR' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              Legacy quote, needs re-quote
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const ord = selectedOrderForEdit;
                            setSelectedOrderForEdit(null);
                            handleOpenQuoteForm(ord);
                          }}
                          className="text-[11px] text-[#E06C38] font-bold hover:underline"
                        >
                          Edit Quotation →
                        </button>
                      </div>

                      {selectedOrderForEdit.quote.line_items && selectedOrderForEdit.quote.line_items.length > 0 ? (
                        <div className="space-y-1.5">
                          <div className="max-h-36 overflow-y-auto divide-y divide-[#1D231E]/5 text-[11px]">
                            {selectedOrderForEdit.quote.line_items.map((it: any, idx: number) => {
                              const isLegacy = selectedOrderForEdit.quote.currency !== 'LKR';
                              const mult = isLegacy ? (parseFloat(exchangeRateInput) || 300) : 1;
                              const unitPriceLkr = (Number(it.unit_price) || 0) * mult;
                              const totalLkr = (Number(it.total) || 0) * mult;
                              return (
                                <div key={it.id || idx} className="py-1 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    {it.hex && (
                                      <span
                                        className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                                        style={{ backgroundColor: it.hex }}
                                      />
                                    )}
                                    <span className="font-medium text-[#1D231E]">{it.description}</span>
                                    <span className="text-[#1D231E]/50">
                                      ({it.quantity} {it.unit || 'pcs'} @ <LkrPriceDisplay priceLkr={unitPriceLkr} layout="inline" lkrClassName="font-medium text-[#1D231E]" usdClassName="text-[10px] text-[#5A6659]" />)
                                    </span>
                                  </div>
                                  <LkrPriceDisplay priceLkr={totalLkr} layout="inline" lkrClassName="font-mono font-bold text-[#1D231E]" usdClassName="text-[10px] text-[#5A6659]" />
                                </div>
                              );
                            })}
                          </div>
                          {(() => {
                            const isLegacy = selectedOrderForEdit.quote.currency !== 'LKR';
                            const mult = isLegacy ? (parseFloat(exchangeRateInput) || 300) : 1;
                            const itemsSubtotalLkr = (Number(selectedOrderForEdit.quote.items_subtotal) || 0) * mult;
                            const craftingChargeLkr = (Number(selectedOrderForEdit.quote.crafting_charge) || 0) * mult;
                            const discountAmountLkr = (Number(selectedOrderForEdit.quote.discount_amount) || 0) * mult;
                            const deliveryChargeLkr = (Number(selectedOrderForEdit.quote.delivery_charge) || 0) * mult;
                            const totalAmountLkr = (Number(selectedOrderForEdit.quote.total_amount) || 0) * mult;
                            return (
                              <div className="pt-1.5 border-t border-[#1D231E]/10 flex flex-wrap items-center justify-between text-[11px] font-medium text-[#1D231E]/70 gap-2">
                                <span>Subtotal: <LkrPriceDisplay priceLkr={itemsSubtotalLkr} layout="inline" lkrClassName="font-semibold text-[#1D231E]" usdClassName="text-[10px] text-[#5A6659]" /></span>
                                {craftingChargeLkr > 0 && (
                                  <span>Crafting: <LkrPriceDisplay priceLkr={craftingChargeLkr} layout="inline" lkrClassName="font-semibold text-[#1D231E]" usdClassName="text-[10px] text-[#5A6659]" /></span>
                                )}
                                {discountAmountLkr > 0 && (
                                  <span className="text-emerald-700 font-bold">
                                    Studio ({selectedOrderForEdit.quote.discount_percent || 15}%): -<LkrPriceDisplay priceLkr={discountAmountLkr} layout="inline" lkrClassName="font-bold text-emerald-700" usdClassName="text-[10px] text-emerald-600" />
                                  </span>
                                )}
                                <span>Ship: <LkrPriceDisplay priceLkr={deliveryChargeLkr} layout="inline" lkrClassName="font-semibold text-[#1D231E]" usdClassName="text-[10px] text-[#5A6659]" /></span>
                                <span className="font-bold text-[#E06C38] text-xs">
                                  Total: <LkrPriceDisplay priceLkr={totalAmountLkr} layout="inline" lkrClassName="font-bold text-[#E06C38] text-xs" usdClassName="text-[10px] text-[#8A9588]" />
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          {(() => {
                            const isLegacy = selectedOrderForEdit.quote.currency !== 'LKR';
                            const mult = isLegacy ? (parseFloat(exchangeRateInput) || 300) : 1;
                            const itemPriceLkr = (Number(selectedOrderForEdit.quote.item_price) || 0) * mult;
                            const deliveryLkr = (Number(selectedOrderForEdit.quote.delivery_charge) || 0) * mult;
                            const totalLkr = (Number(selectedOrderForEdit.quote.total_amount) || 0) * mult;
                            return (
                              <>
                                <span className="text-[#1D231E]/70">
                                  Item: <LkrPriceDisplay priceLkr={itemPriceLkr} layout="inline" /> + Ship: <LkrPriceDisplay priceLkr={deliveryLkr} layout="inline" />
                                </span>
                                <span className="font-bold text-[#E06C38]">
                                  Total: <LkrPriceDisplay priceLkr={totalLkr} layout="inline" lkrClassName="font-bold text-[#E06C38]" usdClassName="text-[10px] text-[#8A9588]" />
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedOrderForEdit.customer_feedback && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-950 space-y-1">
                      <span className="font-bold flex items-center gap-1 text-[11px] text-amber-900">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> Customer Revision Feedback:
                      </span>
                      <p className="font-medium text-[11px] text-amber-950">"{selectedOrderForEdit.customer_feedback}"</p>
                    </div>
                  )}

                  {editNotes && (
                    <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-950">
                      <span className="font-bold flex items-center gap-1 text-[11px] text-amber-800">
                        <MessageSquare className="w-3 h-3 text-amber-700" /> Customer Instructions:
                      </span>
                      <p className="italic text-[11px] mt-0.5 text-amber-900">"{editNotes}"</p>
                    </div>
                  )}

                  {/* CUSTOM PATTERN STUDIO & CONVERTER SECTION */}
                  {(() => {
                    const sourcePhoto = selectedOrderForEdit.image_url || editDetails.photo_url || editDetails.pattern_result_url;
                    const hasThreadReqs = (editDetails.thread_requirements && editDetails.thread_requirements.length > 0) || (selectedOrderForEdit.thread_requirements && selectedOrderForEdit.thread_requirements.length > 0);
                    const threadCount = editDetails.thread_requirements?.length || selectedOrderForEdit.thread_requirements?.length || 0;
                    const pdfUrl = selectedOrderForEdit.pattern_pdf_url || editDetails.pattern_pdf_url;

                    return (
                      <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 p-4 rounded-2xl border border-purple-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span className="font-bold text-[#1D231E] text-xs uppercase tracking-wider">
                              Custom Pattern & Studio Converter
                            </span>
                          </div>
                          {hasThreadReqs ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Pattern Configured ({threadCount} DMC Colors)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Pattern Pending Generation
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          {sourcePhoto ? (
                            <div className="relative group w-20 h-20 rounded-xl overflow-hidden bg-black/10 border border-purple-200 shrink-0">
                              <img
                                src={sourcePhoto}
                                alt="Order Source Photo"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImageModal({
                                    url: sourcePhoto,
                                    title: `Source Photo (#${selectedOrderForEdit.id})`,
                                  })
                                }
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                title="Zoom photo"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 shrink-0">
                              <ImageIcon className="w-5 h-5 opacity-40" />
                              <span className="text-[9px] mt-1">No Image</span>
                            </div>
                          )}

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <p className="text-[11px] text-[#1D231E]/80 leading-relaxed">
                              {hasThreadReqs
                                ? `Configured with ${threadCount} DMC floss colors. You can open in converter to adjust grid dimensions or floss palette, then re-save directly to this order.`
                                : sourcePhoto
                                ? 'Customer supplied a source photo. Open in Converter to generate custom grid, reduce color count, and calculate required floss skeins.'
                                : 'Open Converter to upload or adjust customer reference artwork.'}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const ord = selectedOrderForEdit;
                                  handleOpenConverterForOrder(ord);
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Open in Converter</span>
                              </button>

                              {pdfUrl && (
                                <a
                                  href={pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={`pattern_order_${selectedOrderForEdit.id}.pdf`}
                                  className="px-3 py-1.5 bg-white hover:bg-gray-50 text-[#1D231E] border border-gray-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                                >
                                  <Download className="w-3.5 h-3.5 text-[#E06C38]" />
                                  <span>Download Pattern PDF</span>
                                </a>
                              )}

                              {sourcePhoto && (
                                <a
                                  href={sourcePhoto}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={`order_${selectedOrderForEdit.id}_original.jpg`}
                                  className="px-3 py-1.5 bg-white hover:bg-gray-50 text-[#1D231E]/80 border border-gray-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                                >
                                  <Download className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Original Photo</span>
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  const ord = selectedOrderForEdit;
                                  setSelectedOrderForEdit(null);
                                  handleOpenQuoteForm(ord);
                                }}
                                className="px-3 py-1.5 bg-[#E06C38] hover:bg-[#c95927] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>{selectedOrderForEdit.quote ? 'Edit Quotation' : 'Create Quotation'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            <form onSubmit={handleSaveOrderEdit} className="space-y-5">
              {/* Stage Selection Buttons & Dropdown */}
              {(() => {
                const origStatus = (selectedOrderForEdit.fulfillment_status || selectedOrderForEdit.status || '').toLowerCase();
                const isTerminal = ['declined', 'cancelled', 'canceled'].includes(origStatus);
                const isDeclined = origStatus === 'declined';

                if (isTerminal) {
                  return (
                    <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDeclined ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-gray-100 border-gray-200 text-gray-800'
                    }`}>
                      <div className="flex items-center gap-3">
                        {isDeclined ? (
                          <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                            <XCircle className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 shrink-0">
                            <X className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-[10px] text-gray-500">
                            Fulfillment Stage (Terminal State)
                          </span>
                          <span className="font-bold text-sm capitalize text-[#1D231E]">
                            {origStatus === 'declined' ? 'Request Declined' : 'Order Cancelled'}
                          </span>
                        </div>
                      </div>
                      <span className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/90 font-bold text-[11px] text-gray-600 border border-black/10 shadow-2xs">
                        Status is Read-Only
                      </span>
                    </div>
                  );
                }

                // Stage Progression Hierarchy (Forward-only past Quality Check/Completed)
                let allowedStages = [
                  { id: 'confirmed', label: '1. Confirmed', icon: CheckCircle2 },
                  { id: 'in_production', label: '2. In Production', icon: Activity },
                  { id: 'quality_check', label: '3. Quality Check', icon: ShieldCheck },
                  { id: 'shipped', label: '4. Shipped', icon: Truck },
                  { id: 'delivered', label: '5. Delivered', icon: Check },
                ];

                if (origStatus === 'delivered') {
                  allowedStages = [
                    { id: 'delivered', label: '5. Delivered (Completed)', icon: Check },
                  ];
                } else if (origStatus === 'shipped') {
                  allowedStages = [
                    { id: 'shipped', label: '4. Shipped', icon: Truck },
                    { id: 'delivered', label: '5. Delivered', icon: Check },
                  ];
                } else if (origStatus === 'quality_check' || origStatus === 'completed') {
                  // Forward progression only: Completed/Quality Check -> Shipped -> Delivered (no setting back to in_production or confirmed)
                  allowedStages = [
                    { id: 'quality_check', label: '3. Quality Check (Completed)', icon: ShieldCheck },
                    { id: 'shipped', label: '4. Shipped', icon: Truck },
                    { id: 'delivered', label: '5. Delivered', icon: Check },
                  ];
                }

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-[#1D231E] uppercase tracking-wider">
                        Fulfillment Stage Advancement
                      </label>
                      {(origStatus === 'quality_check' || origStatus === 'completed' || origStatus === 'shipped') && (
                        <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Forward progression only
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allowedStages.map((stage) => {
                        const Icon = stage.icon;
                        const isSelected = editStatus === stage.id;
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={() => setEditStatus(stage.id)}
                            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                              isSelected
                                ? 'bg-[#1D231E] text-white border-[#1D231E] shadow-sm ring-2 ring-[#E06C38]/40'
                                : 'bg-[#FAF6EE] text-[#1D231E]/80 border-[#1D231E]/15 hover:bg-white'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#E06C38]' : 'text-gray-400'}`} />
                            <span>{stage.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* CONDITIONAL PROGRESS FIELDS:
                  ONLY if order_type === 'custom_stitched' AND fulfillment_status is 'in_production' or later (quality_check, shipped, delivered) */}
              {selectedOrderForEdit.order_type === 'custom_stitched' &&
                ['in_production', 'in_progress', 'quality_check', 'completed', 'shipped', 'delivered'].includes(editStatus) && (
                  <div className="bg-indigo-50/70 p-5 rounded-2xl border border-indigo-200/80 space-y-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 uppercase tracking-wider">
                        <Scissors className="w-4 h-4 text-indigo-600" />
                        Hand-Stitching Workshop Progress
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-indigo-900 bg-white px-3 py-1 rounded-lg border border-indigo-200">
                          {editProgressPercent}% Complete
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const ord = selectedOrderForEdit;
                            setSelectedOrderForEdit(null);
                            handleOpenStitchTracker(ord);
                          }}
                          className="px-3 py-1.5 bg-[#2D5A43] hover:bg-[#234734] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Scissors className="w-3.5 h-3.5 text-[#E06C38]" />
                          <span>Interactive Stitch Tracker →</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={editProgressPercent}
                        onChange={(e) => setEditProgressPercent(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-2 bg-indigo-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-indigo-900 mb-1">
                        Progress Note for Customer
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Face and background complete, framing underway"
                        value={editProgressNote}
                        onChange={(e) => setEditProgressNote(e.target.value)}
                        className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {selectedOrderForEdit.progress_updated_at && (
                      <p className="text-[11px] text-indigo-700">
                        Last progress update:{' '}
                        {new Date(selectedOrderForEdit.progress_updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

              {/* CONDITIONAL TRACKING NUMBER FIELD:
                  If fulfillment_status === 'shipped' (or tracking number is entered) */}
              {(editStatus === 'shipped' || editStatus === 'delivered' || editTrackingNumber.trim()) && (
                <div className="bg-orange-50/70 p-5 rounded-2xl border border-orange-200/80 space-y-3 animate-fade-in">
                  <label className="block text-xs font-bold text-orange-950 uppercase tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4 text-orange-600" /> Shipping Tracking Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. USPS 9400 1000 0000 0000 0000 00 or DHL Express #84930219"
                    value={editTrackingNumber}
                    onChange={(e) => setEditTrackingNumber(e.target.value)}
                    className="w-full p-2.5 bg-white border border-orange-200 rounded-xl text-xs font-mono text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-[11px] text-orange-800">
                    The tracking number will be displayed on the customer's dashboard card with direct carrier tracking.
                  </p>
                </div>
              )}

              {/* Status Note / Message */}
              <div>
                <label className="block text-xs font-bold text-[#1D231E] uppercase tracking-wider mb-1.5">
                  Public Status Message (Shown on Customer Card)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tensioning complete, preparing custom parcel packaging."
                  value={editStatusNote}
                  onChange={(e) => setEditStatusNote(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                />
              </div>

              {/* Estimated Completion Date */}
              <div>
                <label className="block text-xs font-bold text-[#1D231E] uppercase tracking-wider mb-1.5">
                  Estimated Completion / Delivery Window
                </label>
                <input
                  type="text"
                  placeholder="e.g. Oct 24 - Oct 28, 2026"
                  value={editEstimatedCompletion}
                  onChange={(e) => setEditEstimatedCompletion(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1D231E]/10">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForEdit(null)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOrder}
                  className="px-6 py-2.5 rounded-xl bg-[#2D5A43] hover:bg-[#234634] text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingOrder ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving Updates...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save Order Updates
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: FULLSCREEN IMAGE PREVIEW */}
      {/* ========================================================================= */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent flex flex-col items-center">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 text-sm font-semibold flex items-center gap-1.5"
            >
              <X className="w-5 h-5" /> Close Preview
            </button>
            <img
              src={previewImageModal.url}
              alt={previewImageModal.title}
              className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/20"
              referrerPolicy="no-referrer"
            />
            <p className="text-white/80 text-sm mt-3 font-medium text-center">
              {previewImageModal.title}
            </p>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 4: BLOG POST EDITOR MODAL */}
      {/* ========================================================================= */}
      {isBlogEditorOpen && (
        <BlogEditorModal
          isOpen={isBlogEditorOpen}
          post={selectedPostForEdit}
          onClose={() => {
            setIsBlogEditorOpen(false);
            setSelectedPostForEdit(null);
          }}
          onSaved={async (savedPost, isPublished) => {
            showToast(`Article "${savedPost.title}" ${isPublished ? 'published' : 'saved as draft'} successfully!`);
            await loadData(true);
          }}
          currentUserName={user?.name || user?.email || 'Elena Rostova'}
          currentUserAvatar={user?.avatar_url || ''}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4.5: STORE PRODUCT EDITOR MODAL */}
      {/* ========================================================================= */}
      {isProductEditorOpen && (
        <ProductEditorModal
          isOpen={isProductEditorOpen}
          product={selectedProductForEdit}
          onClose={() => {
            setIsProductEditorOpen(false);
            setSelectedProductForEdit(null);
          }}
          onSaved={async (savedProduct) => {
            showToast(`Product "${savedProduct.name}" saved successfully!`);
            await loadData(true);
          }}
          existingCategories={Array.from(new Set(products.map((p) => p.category).filter(Boolean)))}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DECLINE ORDER MODAL */}
      {/* ========================================================================= */}
      {declineModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col p-6 sm:p-7 shadow-2xl border border-[#1D231E]/10 animate-scale-up overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between border-b border-[#1D231E]/10 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1D231E] font-serif">
                    Decline Order #{declineModalOrder.id}
                  </h3>
                  <p className="text-xs text-[#1D231E]/60">
                    Customer: <span className="font-semibold text-[#1D231E]">{declineModalOrder.customer_name || 'Customer'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeclineModalOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDecline} className="space-y-4">
              <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200/80 text-xs text-rose-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  This action is permanent and will notify the customer.
                </p>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Declining will set the order status to <strong>Declined</strong>, terminate quotation revisions, and display your provided explanation to the customer in their dashboard.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1D231E] uppercase tracking-wider mb-1.5">
                  Reason for declining (visible to customer) <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. We are currently at maximum studio capacity for complex multi-canvas commissions, or the uploaded artwork contains fine details beyond the resolution possible with 14ct Aida cloth."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full p-3 bg-[#FAF6EE] border border-[#1D231E]/15 rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1D231E]/10">
                <button
                  type="button"
                  onClick={() => setDeclineModalOrder(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeclining || !declineReason.trim()}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeclining ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Declining Request...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" /> Confirm Decline
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STITCH TRACKER MODAL (ADMIN EDITABLE MODE) */}
      {/* ========================================================================= */}
      {isStitchTrackerOpen && selectedStitchTrackerOrder && (
        <StitchTrackerModal
          isOpen={isStitchTrackerOpen}
          mode="admin-editable"
          order={selectedStitchTrackerOrder}
          onProgressSaved={(progressPercent, cells, info) => {
            if (info?.autoAdvancedToQualityCheck) {
              showToast("All stitches marked complete — order automatically moved to Completed/Quality Check.");
              setOrders(prev => prev.map(o => {
                if (o.id === selectedStitchTrackerOrder.id || o.raw_order_id === selectedStitchTrackerOrder.raw_order_id) {
                  return {
                    ...o,
                    fulfillment_status: 'quality_check',
                    status: 'quality_check',
                    progress_percent: progressPercent,
                    stitch_progress_cells: cells,
                    progress_updated_at: new Date().toISOString(),
                  };
                }
                return o;
              }));
            }
          }}
          onOpenConverter={(ord) => {
            setIsStitchTrackerOpen(false);
            setSelectedStitchTrackerOrder(null);
            handleOpenConverterForOrder(ord);
          }}
          onClose={() => {
            setIsStitchTrackerOpen(false);
            setSelectedStitchTrackerOrder(null);
            loadData(true);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* PHOTO CONVERTER MODAL (ADMIN ORDER PATTERN STUDIO MODE) */}
      {/* ========================================================================= */}
      {selectedOrderForConverter && (
        <PhotoConverterModal
          isOpen={Boolean(selectedOrderForConverter)}
          adminOrder={selectedOrderForConverter}
          onClose={() => setSelectedOrderForConverter(null)}
          onAdminPatternSaved={(updatedOrder) => {
            loadData(true);
            setSelectedOrderForEdit(updatedOrder);
            setSuccessToast(`Pattern successfully generated and saved directly to Order #${updatedOrder.id}!`);
            setTimeout(() => setSuccessToast(null), 5000);
          }}
        />
      )}
      {/* ========================================================================= */}
      {/* MANUAL PAYMENT MODAL */}
      {/* ========================================================================= */}
      {isManualPaymentModalOpen && selectedOrderForEdit && (() => {
        const quote = selectedOrderForEdit.quote || selectedOrderForEdit.request_details?.quote;
        const isLegacy = quote && quote.currency && quote.currency !== 'LKR';
        const mult = isLegacy ? (parseFloat(exchangeRateInput) || 300) : 1;
        const totalAmount = Number(quote?.total_amount ?? selectedOrderForEdit.total_amount ?? selectedOrderForEdit.quoted_price ?? selectedOrderForEdit.item_price ?? 0) * mult;
        const totalCents = Math.round(totalAmount * 100);
        const advanceLkr = Math.floor(totalCents / 2) / 100;
        const amountPaid = Number(selectedOrderForEdit.amount_paid_lkr || 0);
        const balanceLkr = Math.max(0, totalAmount - Math.max(amountPaid, advanceLkr));
        const paidInFullLkr = Math.max(0, totalAmount - amountPaid);

        let expectedAmt = advanceLkr;
        if (manualPaymentWhat === 'Balance') expectedAmt = balanceLkr;
        if (manualPaymentWhat === 'Paid in full') expectedAmt = paidInFullLkr;

        const enteredAmt = Number(manualPaymentAmount) || 0;
        const hasAmountDifference = Math.abs(enteredAmt - expectedAmt) > 0.01;

        const isCustom = selectedOrderForEdit.order_type === 'custom_stitched' ||
          (selectedOrderForEdit.title && selectedOrderForEdit.title.toLowerCase().includes('stitched')) ||
          (selectedOrderForEdit.request_details?.order_type === 'custom_stitched');
        const payStatus = selectedOrderForEdit.payment_status || 'pending_quote';

        const whatOptions = isCustom
          ? (payStatus === 'deposit_paid' ? ['Balance'] : ['50% advance', 'Paid in full'])
          : ['Paid in full'];

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#1D231E]/10 overflow-hidden animate-scale-up">
              <div className="flex items-center justify-between border-b border-[#1D231E]/10 p-5 bg-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1D231E]">
                      Record Manual Payment
                    </h3>
                    <p className="text-xs text-[#1D231E]/60">
                      Order #{selectedOrderForEdit.id} • {selectedOrderForEdit.customer_name || 'Customer'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsManualPaymentModalOpen(false);
                    setIsManualPaymentConfirming(false);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs">
                {!isManualPaymentConfirming ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="block font-bold text-[#1D231E]">What was received?</label>
                      <div className="grid grid-cols-2 gap-2">
                        {whatOptions.map((opt: any) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleWhatChange(opt)}
                            className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                              manualPaymentWhat === opt
                                ? 'bg-[#1D231E] text-white border-[#1D231E]'
                                : 'bg-[#FAF6EE] text-[#1D231E]/80 border-[#1D231E]/15 hover:bg-white'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-bold text-[#1D231E]">Amount Received (LKR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={manualPaymentAmount}
                        onChange={(e) => setManualPaymentAmount(e.target.value)}
                        className="w-full p-3 bg-white border border-[#1D231E]/20 rounded-xl font-mono font-bold text-sm text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                      />
                      <p className="text-[11px] text-[#1D231E]/50">
                        Expected amount for {manualPaymentWhat}: <strong className="font-mono">LKR {expectedAmt.toLocaleString()}</strong> (Total: LKR {totalAmount.toLocaleString()})
                      </p>
                      {hasAmountDifference && (
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-[11px] font-medium flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Note: Entered amount (LKR {enteredAmt.toLocaleString()}) differs from expected amount (LKR {expectedAmt.toLocaleString()}).</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-bold text-[#1D231E]">Payment Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Bank transfer', 'Cash', 'Other'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setManualPaymentMethod(m)}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                              manualPaymentMethod === m
                                ? 'bg-[#2D5A43] text-white border-[#2D5A43]'
                                : 'bg-[#FAF6EE] text-[#1D231E]/80 border-[#1D231E]/15 hover:bg-white'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-bold text-[#1D231E]">Reference / Transaction Note</label>
                      <input
                        type="text"
                        placeholder="e.g. Bank Ref #TRF-9921 or receipt number"
                        value={manualPaymentRef}
                        onChange={(e) => setManualPaymentRef(e.target.value)}
                        className="w-full p-3 bg-white border border-[#1D231E]/20 rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-bold text-[#1D231E]">Date Received</label>
                      <input
                        type="date"
                        value={manualPaymentDate}
                        onChange={(e) => setManualPaymentDate(e.target.value)}
                        className="w-full p-3 bg-white border border-[#1D231E]/20 rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsManualPaymentModalOpen(false)}
                        className="px-4 py-2.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsManualPaymentConfirming(true)}
                        className="px-6 py-2.5 bg-[#2D5A43] hover:bg-[#234734] text-white text-xs font-bold rounded-full transition-all shadow-xs cursor-pointer"
                      >
                        Review & Confirm Payment →
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-emerald-950">
                      <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Confirm Manual Payment Entry
                      </h4>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Please review the details below before recording this payment to order #{selectedOrderForEdit.id}.
                      </p>
                      <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1.5 text-xs text-[#1D231E]">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Payment For:</span>
                          <span className="font-bold">{manualPaymentWhat}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Amount:</span>
                          <span className="font-bold font-mono text-emerald-700">LKR {enteredAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Method:</span>
                          <span className="font-semibold">{manualPaymentMethod}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Reference:</span>
                          <span className="font-mono">{manualPaymentRef || 'None'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date Received:</span>
                          <span className="font-medium">{manualPaymentDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsManualPaymentConfirming(false)}
                        disabled={isSavingManualPayment}
                        className="px-4 py-2.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                      >
                        ← Back to Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveManualPayment}
                        disabled={isSavingManualPayment}
                        className="px-6 py-2.5 bg-[#2D5A43] hover:bg-[#234734] text-white text-xs font-bold rounded-full transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSavingManualPayment ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Recording Payment...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#E06C38]" />
                            <span>Save & Record Payment</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default AdminPage;
