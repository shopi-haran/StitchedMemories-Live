export interface BlogPostSection {
  type: 'paragraph' | 'heading2' | 'heading3' | 'list' | 'bulletList' | 'image' | 'callout' | 'quote' | 'faq' | 'cta' | string;
  content?: string;
  text?: string;
  title?: string;
  items?: string[];
  imageUrl?: string;
  imageCaption?: string;
  author?: string;
  faqs?: { question: string; answer: string }[];
  ctaText?: string;
  ctaAction?: 'converter' | 'shop' | string;
}

export type ContentSection = BlogPostSection;

export interface BlogPost {
  id: string;
  slug?: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  published_at?: string | null;
  published?: boolean;
  imageUrl: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  contentSections?: BlogPostSection[];
}

export interface GalleryItem {
  id: string;
  title: string;
  author: string;
  originalImage: string;
  stitchedImage: string;
  stitchesCount: string;
  colorsCount: number;
  timeSpent: string;
}

export interface ShopKit {
  id: string;
  title: string;
  category: 'Full Kit' | 'Curated Design' | 'Threads' | 'Fabrics' | 'Notions' | string;
  price: string;
  numericPrice: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  imageUrl: string;
  status: 'In Stock' | 'Popular' | 'Best Seller' | 'Limited Stock';
  rating?: number;
  reviewsCount?: number;
  description?: string;
  includes: string[];
  dimensions?: string;
  threadBrand?: string;
  clothType?: string;
}

export interface DMCColor {
  code: string;
  name: string;
  hex: string;
}

export interface ThreadRequirement {
  dmc_code: string;
  color_name: string;
  hex?: string;
  stitch_count: number;
  skeins_needed?: number;
}

export interface FabricRequirement {
  fabric_count?: number;
  fabric_type?: string;
  width_inches?: number;
  height_inches?: number;
  dimensions_str?: string;
}

export interface QuoteLineItem {
  id?: string;
  description: string;
  reference_qty?: string;
  quantity: number | string;
  unit?: string;
  unit_price: number | string;
  total: number;
  dmc_code?: string;
  hex?: string;
}

export interface OrderQuoteData {
  line_items?: QuoteLineItem[];
  items_subtotal?: number;
  crafting_charge?: number;
  delivery_charge: number;
  total_amount: number;
  admin_notes?: string;
  quoted_at?: string;
  item_price?: number; // for legacy backward-compatibility
}

export interface ArchivedQuote extends OrderQuoteData {
  superseded_at?: string;
  reason?: string;
  quoted_price?: number;
  [key: string]: any;
}

export type ProductStatus = 'Draft' | 'Active' | 'Sold Out' | 'Archived' | 'draft' | 'active' | 'sold_out' | 'archived';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  status: 'Draft' | 'Active' | 'Sold Out' | 'Archived' | string;
  images: string[];
  created_at?: string;
  updated_at?: string;
}

export type StoreOrderStatus = 'received' | 'processing' | 'shipped' | 'delivered';

export interface StoreOrderItem {
  id?: string | number;
  product_id?: string;
  title: string;
  name?: string;
  price: number;
  quantity: number;
  image?: string;
  image_url?: string;
  images?: string[];
  category?: string;
  variant?: string;
  [key: string]: any;
}

export type ContactMessageStatus = 'new' | 'read' | 'replied';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  inquiry_type: string;
  subject?: string;
  message: string;
  status: ContactMessageStatus | string;
  created_at?: string;
  updated_at?: string;
}

