import { createClient } from '@supabase/supabase-js';
import { BlogPost, BlogPostSection, ContactMessage, ContentSection, Product } from '../types';
import { createScaledThumbnail, PatternConfig } from '../utils/patternEngine';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://flwkfgtjkgcluuphibyp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsd2tmZ3Rqa2djbHV1cGhpYnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODA0MzgsImV4cCI6MjEwMTc1NjQzOH0.5OCxUr0IU_TSSVuNSHS7UAe-7kFoPEdl77pYWLT4Ir0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface SupabaseBlogPostRow {
  id: string | number;
  title: string;
  excerpt: string;
  category: string;
  read_time: string;
  published_at?: string | null;
  published?: boolean;
  cover_image_url: string;
  author: {
    name: string;
    avatarUrl: string;
  } | string;
  content_sections?: ContentSection[];
  created_at?: string;
  [key: string]: any;
}

export function mapRowToBlogPost(row: SupabaseBlogPostRow): BlogPost {
  let dateFormatted = row.published_at || '';
  if (row.published_at) {
    try {
      const d = new Date(row.published_at);
      if (!isNaN(d.getTime())) {
        dateFormatted = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      dateFormatted = row.published_at;
    }
  }

  const authorObj = typeof row.author === 'string' 
    ? (() => { try { return JSON.parse(row.author); } catch { return { name: row.author, avatarUrl: '' }; } })()
    : row.author || { name: 'Elena Rostova', avatarUrl: '' };

  const rawSections = row.content_sections || (row as any).contentSections;
  const contentSections = Array.isArray(rawSections) ? rawSections : [];

  // Determine published state: if row.published is explicitly boolean use it; otherwise true if published_at is set
  const isPublished = typeof row.published === 'boolean' 
    ? row.published 
    : Boolean(row.published_at && row.published_at !== '');

  return {
    id: String(row.id),
    slug: String(row.id),
    title: row.title || '',
    excerpt: row.excerpt || '',
    category: row.category || 'Guide & Tips',
    readTime: row.read_time || (row as any).readTime || '',
    date: dateFormatted,
    published_at: row.published_at || null,
    published: isPublished,
    imageUrl: row.cover_image_url || (row as any).imageUrl || '',
    author: {
      name: authorObj?.name || 'Author',
      avatarUrl: authorObj?.avatarUrl || '',
    },
    contentSections: contentSections,
  };
}

/**
 * Fetches public blog posts (published only).
 */
export async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching blog_posts from Supabase:', error);
      return [];
    }

    const allMapped = (data || []).map(mapRowToBlogPost);
    // Return only published posts on the public blog
    return allMapped.filter((p) => p.published !== false && p.date);
  } catch (err) {
    console.error('Unexpected error fetching public blog posts:', err);
    return [];
  }
}

/**
 * Fetches all blog posts for the Admin panel (both published & drafts).
 */
export async function fetchAllAdminBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching admin blog_posts from Supabase:', error);
      throw error;
    }

    return (data || []).map(mapRowToBlogPost);
  } catch (err) {
    console.error('Unexpected error in fetchAllAdminBlogPosts:', err);
    throw err;
  }
}

export async function fetchBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching blog_post by id from Supabase:', error);
      return null;
    }

    return mapRowToBlogPost(data);
  } catch (err) {
    console.error('Unexpected error fetching blog post by id:', err);
    return null;
  }
}

/**
 * Upserts a blog post in Supabase blog_posts table.
 */
export async function upsertBlogPost(payload: {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  read_time: string;
  published_at: string | null;
  cover_image_url: string;
  author: { name: string; avatarUrl: string };
  content_sections: BlogPostSection[];
  published?: boolean;
}): Promise<{ success: boolean; data?: BlogPost; error?: any }> {
  try {
    const rowPayload: any = {
      id: payload.id.trim(),
      title: payload.title.trim(),
      excerpt: payload.excerpt.trim(),
      category: payload.category.trim(),
      read_time: payload.read_time.trim(),
      published_at: payload.published_at,
      cover_image_url: payload.cover_image_url.trim(),
      author: payload.author,
      content_sections: payload.content_sections,
    };

    if (typeof payload.published === 'boolean') {
      rowPayload.published = payload.published;
    }

    // Try upsert with all fields
    let { data, error } = await supabase
      .from('blog_posts')
      .upsert(rowPayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    // If 'published' column does not exist (error 42703), retry without 'published' field
    if (error && (error.code === '42703' || String(error.message).includes('published'))) {
      console.warn('Column "published" not found in blog_posts schema, retrying without it...');
      delete rowPayload.published;
      const retry = await supabase
        .from('blog_posts')
        .upsert(rowPayload, { onConflict: 'id' })
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('[upsertBlogPost] Supabase error:', error);
      return { success: false, error };
    }

    const mapped = data ? mapRowToBlogPost(data) : {
      id: rowPayload.id,
      title: rowPayload.title,
      excerpt: rowPayload.excerpt,
      category: rowPayload.category,
      readTime: rowPayload.read_time,
      date: rowPayload.published_at ? new Date(rowPayload.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Draft',
      published_at: rowPayload.published_at,
      published: payload.published !== false && Boolean(rowPayload.published_at),
      imageUrl: rowPayload.cover_image_url,
      author: rowPayload.author,
      contentSections: rowPayload.content_sections,
    };

    return { success: true, data: mapped };
  } catch (err: any) {
    console.error('[upsertBlogPost] Exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Deletes a blog post by its id/slug.
 */
export async function deleteBlogPost(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[deleteBlogPost] Supabase delete error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[deleteBlogPost] Exception deleting blog post:', err);
    return { success: false, error: err };
  }
}

/**
 * Uploads an image to the blog storage bucket under a folder named after the post's slug.
 * Sets up fallback to data URL if bucket permissions are restricted.
 */
export async function uploadBlogImageToSupabase(
  file: File | Blob,
  slug: string,
  prefix: string = 'img'
): Promise<string> {
  const cleanSlug = (slug || 'untitled-post').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${cleanSlug}/${prefix}_${Date.now()}.${extension}`;

  const targetBuckets = ['blog-images', 'blog_images', 'images', 'public'];

  for (const bucketName of targetBuckets) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          console.log(`[uploadBlogImageToSupabase] Uploaded to bucket "${bucketName}":`, publicUrlData.publicUrl);
          return publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn(`[uploadBlogImageToSupabase] Failed upload to bucket "${bucketName}":`, e);
    }
  }

  // Fallback to Base64 Data URL if storage bucket fails
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

export interface SupabaseProductRow {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  status: string;
  images: string[] | string | null;
  created_at?: string;
  updated_at?: string;
}

export function mapRowToProduct(row: any): Product {
  let images: string[] = [];
  if (Array.isArray(row.images)) {
    images = row.images;
  } else if (typeof row.images === 'string') {
    try {
      const parsed = JSON.parse(row.images);
      if (Array.isArray(parsed)) images = parsed;
      else if (typeof parsed === 'string' && parsed) images = [parsed];
    } catch {
      if (row.images) images = [row.images];
    }
  }

  return {
    id: String(row.id),
    name: row.name || 'Untitled Product',
    description: row.description || '',
    price: typeof row.price === 'number' ? row.price : parseFloat(row.price) || 0,
    category: row.category || 'General',
    status: row.status || 'Draft',
    images: images,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const LOCAL_STORAGE_PRODUCTS_KEY = 'thread_artisan_admin_products';

function getLocalProducts(): Product[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalProducts(products: Product[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(products));
  } catch (err) {
    console.warn('Failed to save products to localStorage:', err);
  }
}

/**
 * Uploads a product image to Supabase Storage bucket.
 * Reuses the pattern from blog-images / conversion-results with public URL retrieval
 * and a robust Data URL fallback.
 */
export async function uploadProductImageToSupabase(
  file: File | Blob,
  productName: string = 'product',
  prefix: string = 'prod'
): Promise<string> {
  const cleanName = (productName || 'product').toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 30);
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${cleanName}/${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;

  const targetBuckets = ['product-images', 'product_images', 'products', 'blog-images', 'conversion-results', 'images', 'public'];

  for (const bucketName of targetBuckets) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          console.log(`[uploadProductImageToSupabase] Uploaded to bucket "${bucketName}":`, publicUrlData.publicUrl);
          return publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn(`[uploadProductImageToSupabase] Failed upload to bucket "${bucketName}":`, e);
    }
  }

  // Fallback to Base64 Data URL if storage bucket fails
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Fetches all products from Supabase products table (and syncs with local cache).
 */
export async function fetchAllAdminProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching products from Supabase:', error);
      // Fallback to local products
      return getLocalProducts();
    }

    const mapped = (data || []).map(mapRowToProduct);
    
    // Merge any locally created items that might not have synced due to RLS
    const local = getLocalProducts();
    const serverIds = new Set(mapped.map((p) => p.id));
    const unsyncedLocal = local.filter((p) => !serverIds.has(p.id));
    const combined = [...unsyncedLocal, ...mapped];
    
    // Update local cache
    saveLocalProducts(combined);
    return combined;
  } catch (err) {
    console.error('Unexpected error in fetchAllAdminProducts:', err);
    return getLocalProducts();
  }
}

/**
 * Upserts a product into the Supabase products table.
 */
export async function upsertProduct(payload: {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  status: string;
  images: string[];
}): Promise<{ success: boolean; data?: Product; error?: any }> {
  try {
    const productId = payload.id && payload.id.trim() ? payload.id.trim() : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const nowIso = new Date().toISOString();

    const rowPayload: any = {
      id: productId,
      name: payload.name.trim(),
      description: payload.description.trim(),
      price: Number(payload.price) || 0,
      category: payload.category.trim() || 'General',
      status: payload.status.trim() || 'Draft',
      images: payload.images || [],
      updated_at: nowIso,
    };

    let { data, error } = await supabase
      .from('products')
      .upsert(rowPayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[upsertProduct] Supabase upsert error:', error);
      // If RLS blocked, try insert or fallback
      const insertResult = await supabase
        .from('products')
        .insert(rowPayload)
        .select()
        .maybeSingle();

      if (!insertResult.error) {
        data = insertResult.data;
        error = null;
      }
    }

    const finalProduct: Product = data ? mapRowToProduct(data) : {
      id: productId,
      name: rowPayload.name,
      description: rowPayload.description,
      price: rowPayload.price,
      category: rowPayload.category,
      status: rowPayload.status,
      images: rowPayload.images,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Update local cache
    const currentLocal = getLocalProducts();
    const existingIdx = currentLocal.findIndex((p) => p.id === finalProduct.id);
    if (existingIdx >= 0) {
      currentLocal[existingIdx] = finalProduct;
    } else {
      currentLocal.unshift(finalProduct);
    }
    saveLocalProducts(currentLocal);

    return { success: true, data: finalProduct };
  } catch (err: any) {
    console.error('[upsertProduct] Exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Deletes a product from the Supabase products table.
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[deleteProduct] Supabase delete error:', error);
    }

    // Always update local cache
    const currentLocal = getLocalProducts();
    const filtered = currentLocal.filter((p) => p.id !== id);
    saveLocalProducts(filtered);

    return { success: true };
  } catch (err: any) {
    console.error('[deleteProduct] Exception deleting product:', err);
    return { success: false, error: err };
  }
}

export interface SupabaseConversionJobRow {
  id: string | number;
  user_id: string;
  title?: string;
  filename?: string;
  thumbnail_url?: string;
  original_image_url?: string;
  pattern_pdf_url?: string;
  pattern_preview_url?: string;
  pattern_config?: PatternConfig | any;
  status: 'complete' | 'processing' | 'failed' | 'pending' | string;
  created_at: string;
  grid_width?: number;
  grid_height?: number;
  colors_count?: number;
  [key: string]: any;
}

/**
 * Resolve the PatternConfig object for a given conversion job.
 * Checks job.pattern_config, then localStorage fallback, then returns sane defaults.
 */
export function getJobPatternConfig(job: SupabaseConversionJobRow): PatternConfig {
  let rawConfig = job.pattern_config;
  if (typeof rawConfig === 'string') {
    try {
      rawConfig = JSON.parse(rawConfig);
    } catch {}
  }

  if (!rawConfig || typeof rawConfig !== 'object') {
    try {
      const cached = localStorage.getItem(`user_pattern_config_${job.title}`);
      if (cached) rawConfig = JSON.parse(cached);
    } catch {}
  }

  return {
    gridWidth: rawConfig?.gridWidth || job.grid_width || 60,
    fabricCount: rawConfig?.fabricCount || 14,
    colorLimit: rawConfig?.colorLimit || job.colors_count || 18,
    dithering: rawConfig?.dithering || 'floyd-steinberg',
    brightness: rawConfig?.brightness ?? 0,
    contrast: rawConfig?.contrast ?? 0,
    saturation: rawConfig?.saturation ?? 0,
    showGridLines: rawConfig?.showGridLines ?? true,
    showSymbols: rawConfig?.showSymbols ?? true,
    brand: rawConfig?.brand || 'DMC',
    isAdFree: rawConfig?.isAdFree ?? true,
    planTier: rawConfig?.planTier || 'studio',
  };
}

export async function fetchUserConversionJobs(
  userId?: string,
  userEmail?: string,
  page: number = 0,
  pageSize: number = 10
): Promise<{ jobs: SupabaseConversionJobRow[]; totalCount: number }> {
  const fromIndex = page * pageSize;
  const toIndex = fromIndex + pageSize - 1;

  let supabaseJobs: SupabaseConversionJobRow[] = [];
  let count = 0;

  try {
    let query = supabase
      .from('conversion_jobs')
      .select('*', { count: 'exact' });

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (userEmail) {
      query = query.eq('user_id', userEmail);
    }

    query = query.order('created_at', { ascending: false }).range(fromIndex, toIndex);

    const res = await query;
    if (res.data && Array.isArray(res.data)) {
      supabaseJobs = res.data as SupabaseConversionJobRow[];
      count = res.count || supabaseJobs.length;
    }
  } catch (err) {
    console.error('Error querying Supabase conversion_jobs:', err);
  }

  return {
    jobs: supabaseJobs,
    totalCount: count,
  };
}

export async function saveUserConversionJob(jobData: {
  user_id: string;
  title: string;
  status?: string;
  grid_width?: number;
  grid_height?: number;
  colors_count?: number;
  photo_url?: string;
  thumbnail_url?: string;
  original_image_url?: string;
  pattern_pdf_url?: string;
  pattern_preview_url?: string;
  [key: string]: any;
}): Promise<boolean> {
  console.log('[saveUserConversionJob] Function invoked with data:', {
    user_id: jobData.user_id,
    title: jobData.title,
    status: jobData.status,
    grid: `${jobData.grid_width}x${jobData.grid_height}`,
    colors_count: jobData.colors_count,
  });

  // Guest users conversions should not be saved; only logged-in users' conversions get saved directly to Supabase
  if (!jobData.user_id || jobData.user_id === 'guest') {
    console.log('[saveUserConversionJob] Guest user session - conversion not saved to account.');
    return false;
  }

  const rawPhoto = jobData.photo_url || jobData.thumbnail_url || jobData.original_image_url || '';
  let compactThumbnail = jobData.thumbnail_url || '';
  let mediumPhoto = jobData.photo_url || '';

  // 1. Generate compact thumbnail (250px) for fast card display
  try {
    if (rawPhoto) {
      if (rawPhoto.startsWith('data:image/') || rawPhoto.startsWith('blob:') || rawPhoto.length > 5000) {
        compactThumbnail = await createScaledThumbnail(rawPhoto, 250);
      } else {
        compactThumbnail = rawPhoto;
      }
    }
  } catch (e) {
    console.error('[saveUserConversionJob] Failed to generate compact thumbnail:', e);
    compactThumbnail = rawPhoto;
  }

  // 2. Generate medium scaled photo (600px) so blob: URLs or large files persist reliably
  try {
    if (rawPhoto) {
      if (rawPhoto.startsWith('blob:') || rawPhoto.length > 100000) {
        mediumPhoto = await createScaledThumbnail(rawPhoto, 600);
      } else {
        mediumPhoto = rawPhoto;
      }
    }
  } catch (e) {
    console.error('[saveUserConversionJob] Failed to generate medium photo:', e);
    mediumPhoto = compactThumbnail || rawPhoto;
  }

  const finalThumb = compactThumbnail || mediumPhoto;
  const finalPhoto = mediumPhoto || finalThumb;

  // Retrieve current active Supabase Auth session right before insert
  const { data: { session } } = await supabase.auth.getSession();
  const effectiveUserId = session?.user?.id || (jobData.user_id !== 'guest' ? jobData.user_id : null);

  if (!effectiveUserId) {
    console.warn('[saveUserConversionJob] No active user ID found, skipping Supabase save.');
    return false;
  }

  const insertPayload = {
    user_id: effectiveUserId,
    title: jobData.title || 'Converted Pattern',
    status: jobData.status || 'complete',
    grid_width: jobData.grid_width || 60,
    grid_height: jobData.grid_height || 60,
    colors_count: jobData.colors_count || 18,
    photo_url: finalPhoto.length < 250000 ? finalPhoto : '',
    thumbnail_url: jobData.thumbnail_url || (finalThumb.length < 100000 ? finalThumb : ''),
    original_image_url: jobData.original_image_url || '',
    pattern_pdf_url: jobData.pattern_pdf_url || '',
    pattern_preview_url: jobData.pattern_preview_url || '',
    pattern_config: jobData.pattern_config || null,
    created_at: new Date().toISOString(),
  };

  console.log('[saveUserConversionJob] Executing Supabase insert for conversion_jobs:', insertPayload);

  // Persist directly to Supabase conversion_jobs table
  try {
    const { data, error } = await supabase.from('conversion_jobs').insert([insertPayload]).select();

    if (error) {
      console.error('[saveUserConversionJob] Supabase insert error for conversion_jobs:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return false;
    } else {
      console.log('[saveUserConversionJob] Supabase insert succeeded for conversion_jobs:', data);
    }
  } catch (err) {
    console.error('[saveUserConversionJob] Supabase insert exception:', err);
    return false;
  }

  try {
    window.dispatchEvent(new CustomEvent('patternSaved'));
  } catch {}

  return true;
}

export async function migrateGuestConversionJobs(_userId: string): Promise<void> {
  // Deprecated: Guest conversions are no longer cached or reassigned across sessions.
  return;
}

export interface OrderItem {
  name?: string;
  title?: string;
  price?: string | number;
  quantity?: number;
  [key: string]: any;
}

export interface SupabaseOrderRow {
  id: string | number;
  user_id: string;
  order_type: string;
  items?: OrderItem[] | OrderItem | string | any;
  request_details?: {
    photo_url?: string;
    pattern_result_url?: string;
    size?: string;
    color_count?: number | string;
    stitch_count?: number | string | null;
    delivery_address?: string;
    customer_notes?: string;
    phone?: string;
    product_style?: string;
    is_framed?: boolean;
    framing_option?: string;
    customer_name?: string;
    customer_email?: string;
    [key: string]: any;
  };
  fulfillment_status?: string;
  created_at: string;
  total_amount?: number | string;
  payment_status?: string;
  [key: string]: any;
}

export async function fetchUserStoreOrders(
  userId?: string,
  userEmail?: string
): Promise<SupabaseOrderRow[]> {
  try {
    let query = supabase
      .from('orders')
      .select('*')
      .eq('order_type', 'store');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (userEmail) {
      query = query.eq('user_id', userEmail);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P17') {
        console.warn('[fetchUserStoreOrders] Supabase RLS policy recursion on profiles/orders relation (42P17). Handled gracefully.');
      } else {
        console.warn('[fetchUserStoreOrders] Notice fetching store orders:', error.message || error);
      }
      return [];
    }

    return (data || []) as SupabaseOrderRow[];
  } catch (err: any) {
    console.warn('[fetchUserStoreOrders] Unexpected exception fetching store orders:', err?.message || err);
    return [];
  }
}

export const STORE_ORDER_STAGES_DEF = [
  { id: 'received', label: 'Received', description: 'Order & payment received' },
  { id: 'processing', label: 'Processing', description: 'Items being prepared & packaged' },
  { id: 'shipped', label: 'Shipped', description: 'Dispatched with tracking' },
  { id: 'delivered', label: 'Delivered', description: 'Delivered to customer' },
] as const;

export function getStoreStageIndex(statusRaw?: string): number {
  if (!statusRaw) return 0;
  const s = statusRaw.toLowerCase().trim();
  if (s === 'delivered' || s.includes('deliver') || s.includes('complete')) return 3;
  if (s === 'shipped' || s.includes('ship') || s.includes('transit') || s.includes('dispatch')) return 2;
  if (s === 'processing' || s === 'in_progress' || s === 'preparing' || s.includes('process')) return 1;
  return 0; // received
}

export interface CreateStoreOrderParams {
  userId?: string;
  userEmail?: string;
  items: Array<{
    id?: string | number;
    title: string;
    price: number;
    quantity: number;
    image_url?: string;
    category?: string;
    variant?: string;
    details?: any;
  }>;
  totalAmount: number;
  customerDetails: {
    customer_name?: string;
    customer_email?: string;
    delivery_address?: string;
    phone?: string;
    notes?: string;
  };
}

export async function createStoreOrder(params: CreateStoreOrderParams): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const effectiveUserId = session?.user?.id || params.userId || session?.user?.email || params.userEmail;

    if (!effectiveUserId) {
      return { success: false, error: new Error('User must be identified to place a store order.') };
    }

    const payload: Record<string, any> = {
      user_id: effectiveUserId,
      order_type: 'store',
      items: params.items,
      request_details: {
        ...params.customerDetails,
        order_type: 'store',
        items: params.items,
      },
      fulfillment_status: 'received',
      payment_status: 'paid',
      total_amount: params.totalAmount,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([payload])
      .select();

    if (error) {
      console.error('[createStoreOrder] Error:', error);
      return { success: false, error };
    }

    try {
      window.dispatchEvent(new CustomEvent('orderCreated', { detail: { orderType: 'store' } }));
    } catch {}

    return { success: true, data };
  } catch (err: any) {
    console.error('[createStoreOrder] Exception:', err);
    return { success: false, error: err };
  }
}


export interface CreateOrderRequestParams {
  userId?: string;
  userEmail?: string;
  orderType: 'custom_kit_converter' | 'custom_kit_assisted' | 'custom_stitched' | string;
  requestDetails: {
    photo_url?: string;
    pattern_result_url?: string;
    size?: string;
    color_count?: number | string;
    stitch_count?: number | string | null;
    delivery_address?: string;
    customer_notes?: string;
    phone?: string;
    product_style?: string;
    framed?: boolean;
    is_framed?: boolean;
    framing_option?: string;
    customer_name?: string;
    customer_email?: string;
    [key: string]: any;
  };
}

export async function createOrderRequest(params: CreateOrderRequestParams): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const effectiveUserId = session?.user?.id || params.userId || session?.user?.email || params.userEmail;

    if (!effectiveUserId) {
      console.warn('[createOrderRequest] No logged in user session or user ID provided.');
      return { success: false, error: new Error('User must be logged in to submit an order.') };
    }

    const payload: Record<string, any> = {
      user_id: effectiveUserId,
      order_type: params.orderType,
      request_details: params.requestDetails,
      fulfillment_status: 'pending_quote',
      payment_status: 'pending_quote',
      total_amount: 0,
      created_at: new Date().toISOString(),
    };

    console.log('[createOrderRequest] Submitting row to Supabase orders table:', payload);

    const { data, error } = await supabase
      .from('orders')
      .insert([payload])
      .select();

    if (error) {
      console.error('[createOrderRequest] Supabase orders table insert error:', error);
      
      // Attempt fallback insert with stringified request_details if jsonb typing differed
      try {
        const fallbackPayload = {
          ...payload,
          request_details: JSON.stringify(params.requestDetails),
          items: [{
            title: params.orderType === 'custom_kit_converter' ? 'Converter Custom Kit' :
                   params.orderType === 'custom_kit_assisted' ? 'Assisted Custom Kit' : 'Custom Stitched Product',
            price: 0,
            quantity: 1,
            details: params.requestDetails,
          }],
        };
        const fallbackRes = await supabase.from('orders').insert([fallbackPayload]).select();
        if (!fallbackRes.error) {
          console.log('[createOrderRequest] Fallback insert succeeded:', fallbackRes.data);
          return { success: true, data: fallbackRes.data };
        }
      } catch (fallbackErr) {
        console.warn('[createOrderRequest] Fallback insert exception:', fallbackErr);
      }

      return { success: false, error };
    }

    console.log('[createOrderRequest] Order successfully saved to Supabase orders:', data);

    try {
      window.dispatchEvent(new CustomEvent('orderCreated', { detail: { orderType: params.orderType } }));
    } catch {}

    return { success: true, data };
  } catch (err: any) {
    console.error('[createOrderRequest] Unexpected exception:', err);
    return { success: false, error: err };
  }
}

export interface AdminQuoteLineItem {
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

export interface AdminQuoteData {
  line_items?: AdminQuoteLineItem[];
  items_subtotal?: number;
  crafting_charge?: number;
  discount_percent?: number;
  discount_amount?: number;
  delivery_charge: number;
  total_amount: number;
  admin_notes: string;
  quoted_at?: string;
  item_price?: number; // legacy fallback
}

export interface ArchivedQuote extends AdminQuoteData {
  superseded_at?: string;
  reason?: string;
  quoted_price?: number;
  [key: string]: any;
}

export interface SupabaseStitchOrderRow {
  id: string | number;
  raw_order_id?: string | number;
  user_id: string;
  title?: string;
  title_name?: string;
  image_url?: string;
  status: string; // 'pending_quote' | 'quoted' | 'revision_requested' | 'awaiting_payment' | 'confirmed' | 'in_progress' | 'in_production' | 'quality_check' | 'shipped' | 'delivered' | 'cancelled'
  fulfillment_status?: string;
  payment_status?: string;
  quote?: AdminQuoteData;
  quote_history?: ArchivedQuote[];
  customer_feedback?: string;
  item_price?: number;
  delivery_charge?: number;
  quoted_price?: number;
  total_amount?: number;
  status_note?: string;
  admin_notes?: string;
  estimated_completion?: string;
  tracking_number?: string;
  progress_percent?: number;
  progress_note?: string;
  progress_updated_at?: string;
  pattern_config?: any;
  pattern_pdf_url?: string;
  pattern_preview_url?: string;
  thread_requirements?: any[];
  stitch_progress_cells?: string[];
  created_at?: string;
  updated_at?: string;
  order_type?: string;
  request_details?: any;
  items?: any;
  // Joined/derived customer info
  customer_name?: string;
  customer_email?: string;
  customer_tier?: string;
  customer_tier_label?: string;
  customer_avatar?: string;
  [key: string]: any;
}

export async function fetchUserStitchOrders(
  userId?: string,
  userEmail?: string
): Promise<SupabaseStitchOrderRow[]> {
  const allResults: SupabaseStitchOrderRow[] = [];
  const seenIds = new Set<string>();

  // Fetch from orders table (including custom orders and store orders)
  try {
    let orderQuery = supabase
      .from('orders')
      .select('*');

    if (userId) {
      orderQuery = orderQuery.eq('user_id', userId);
    } else if (userEmail) {
      orderQuery = orderQuery.eq('user_id', userEmail);
    }

    orderQuery = orderQuery.order('created_at', { ascending: false });

    const { data: orderRows, error: orderErr } = await orderQuery;
    if (!orderErr && orderRows && Array.isArray(orderRows)) {
      for (const row of orderRows) {
        const details = typeof row.request_details === 'string'
          ? (() => { try { return JSON.parse(row.request_details); } catch { return {}; } })()
          : row.request_details || {};

        const quoteObj = typeof row.quote === 'string'
          ? (() => { try { return JSON.parse(row.quote); } catch { return undefined; } })()
          : row.quote || details.quote || undefined;

        let title = 'Custom Quote Request';
        if (row.order_type === 'custom_kit_converter') title = `Custom Kit (Converter) - ${details.size || 'Standard'}`;
        else if (row.order_type === 'custom_kit_assisted') title = `Assisted Kit - ${details.size || 'Standard'}`;
        else if (row.order_type === 'custom_stitched') title = `Custom Stitched Keepsake - ${details.size || 'Standard'}`;
        else if (row.order_type === 'store') {
          const firstItem = Array.isArray(row.items) && row.items[0] ? row.items[0] : (details.items && Array.isArray(details.items) ? details.items[0] : null);
          const itemName = firstItem?.title || firstItem?.name || details.product_name || details.title;
          title = itemName ? `Store Purchase: ${itemName}` : (row.title || 'Store Purchase');
        }
        else if (row.title) title = row.title;
        else if (row.order_type) title = `${row.order_type.replace(/_/g, ' ')}`;

        const firstItemImg = (Array.isArray(row.items) && (row.items[0]?.image || row.items[0]?.image_url || row.items[0]?.images?.[0])) ||
          (details.items && Array.isArray(details.items) && (details.items[0]?.image || details.items[0]?.image_url || details.items[0]?.images?.[0])) ||
          (Array.isArray(details.images) && details.images[0]) || '';

        const resolvedImageUrl = details.photo_url || details.pattern_result_url || row.image_url || firstItemImg || '';

        const quoteHistoryRaw = row.quote_history || details.quote_history || [];
        const quoteHistoryArr: ArchivedQuote[] = Array.isArray(quoteHistoryRaw)
          ? quoteHistoryRaw
          : (typeof quoteHistoryRaw === 'string' ? (() => { try { return JSON.parse(quoteHistoryRaw); } catch { return []; } })() : []);

        const customerFeedbackStr = row.customer_feedback || details.customer_feedback || '';

        const rawStatus = row.fulfillment_status || row.status || 'pending_quote';
        let defaultNote = '';
        if (rawStatus === 'pending_quote' || rawStatus === 'received') {
          defaultNote = "Order received — we'll confirm final pricing and delivery charges in your dashboard within 24-48 hours.";
        } else if (rawStatus === 'quoted') {
          defaultNote = quoteObj?.admin_notes || row.admin_notes || "Your custom quote is ready! Review the quote details and click Confirm Order to proceed.";
        } else if (rawStatus === 'revision_requested') {
          defaultNote = customerFeedbackStr 
            ? `Revision requested: "${customerFeedbackStr}" — Studio artisan is reviewing your notes.`
            : "Revision requested — Studio artisan is reviewing your requested modifications.";
        } else if (rawStatus === 'cancelled' || rawStatus === 'canceled') {
          defaultNote = "This order has been cancelled.";
        } else if (rawStatus === 'awaiting_payment') {
          defaultNote = "Quote confirmed. Awaiting payment processing before crafting begins.";
        } else if (rawStatus === 'confirmed') {
          defaultNote = "Payment confirmed. Your project has entered our artisan workshop queue.";
        } else if (rawStatus === 'in_progress' || rawStatus === 'in_production') {
          defaultNote = row.progress_note || details.progress_note || "Artisan stitching and material preparation is actively in progress.";
        } else if (rawStatus === 'quality_check') {
          defaultNote = "Undergoing master embroiderer tensioning, mounting & final quality inspection.";
        } else if (rawStatus === 'shipped') {
          defaultNote = row.tracking_number ? `Order dispatched with tracking: ${row.tracking_number}` : "Order dispatched with tracking.";
        } else if (rawStatus === 'delivered') {
          defaultNote = "Order delivered to your destination. Thank you for stitching with us!";
        }

        const totalAmountVal = row.total_amount ?? quoteObj?.total_amount ?? row.quoted_price ?? (details.quoted_price ?? 0);
        const itemPriceVal = quoteObj?.item_price ?? row.item_price ?? details.item_price ?? (totalAmountVal > 0 ? totalAmountVal : undefined);
        const deliveryChargeVal = quoteObj?.delivery_charge ?? row.delivery_charge ?? details.delivery_charge ?? 0;

        const mapped: SupabaseStitchOrderRow = {
          id: `order_${row.id}`,
          raw_order_id: row.id,
          user_id: row.user_id,
          title: title,
          image_url: resolvedImageUrl,
          status: rawStatus,
          fulfillment_status: rawStatus,
          payment_status: row.payment_status || details.payment_status || 'pending_quote',
          quote: quoteObj,
          quote_history: quoteHistoryArr,
          customer_feedback: customerFeedbackStr,
          item_price: itemPriceVal,
          delivery_charge: deliveryChargeVal,
          quoted_price: totalAmountVal > 0 ? totalAmountVal : undefined,
          total_amount: totalAmountVal,
          status_note: row.status_note || details.status_note || defaultNote,
          admin_notes: quoteObj?.admin_notes || row.admin_notes || details.admin_notes || '',
          estimated_completion: row.estimated_completion || details.estimated_completion || '',
          tracking_number: row.tracking_number || details.tracking_number || '',
          progress_percent: row.progress_percent !== undefined ? row.progress_percent : details.progress_percent,
          progress_note: row.progress_note || details.progress_note || '',
          progress_updated_at: row.progress_updated_at || details.progress_updated_at || '',
          pattern_config: row.pattern_config || details.pattern_config || null,
          pattern_pdf_url: row.pattern_pdf_url || details.pattern_pdf_url || '',
          pattern_preview_url: row.pattern_preview_url || details.pattern_preview_url || '',
          thread_requirements: row.thread_requirements || details.thread_requirements || [],
          stitch_progress_cells: row.stitch_progress_cells || details.stitch_progress_cells || [],
          created_at: row.created_at,
          updated_at: row.updated_at,
          order_type: row.order_type,
          request_details: details,
        };
        seenIds.add(String(mapped.id));
        allResults.push(mapped);
      }
    }
  } catch (err: any) {
    if (err?.code === '42P17') {
      console.warn('[fetchUserStitchOrders] RLS recursion on orders table (42P17). Handled gracefully.');
    } else {
      console.warn('[fetchUserStitchOrders] Notice fetching custom orders from orders table:', err?.message || err);
    }
  }

  // Sort newest first
  allResults.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });

  return allResults;
}

export async function fetchAllAdminOrders(): Promise<SupabaseStitchOrderRow[]> {
  const allResults: SupabaseStitchOrderRow[] = [];
  const seenIds = new Set<string>();

  // First, fetch all profiles to build lookup map
  const profileMap = new Map<string, SupabaseProfileRow>();
  try {
    const profiles = await fetchAllProfiles();
    for (const p of profiles) {
      if (p.id) profileMap.set(String(p.id).toLowerCase(), p);
      if (p.user_id) profileMap.set(String(p.user_id).toLowerCase(), p);
      if (p.email) profileMap.set(String(p.email).toLowerCase(), p);
    }
  } catch (err) {
    console.warn('[fetchAllAdminOrders] Profiles pre-fetch warning:', err);
  }

  try {
    const { data: orderRows, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!orderErr && orderRows && Array.isArray(orderRows)) {
      for (const row of orderRows) {
        const details = typeof row.request_details === 'string'
          ? (() => { try { return JSON.parse(row.request_details); } catch { return {}; } })()
          : row.request_details || {};

        const quoteObj = typeof row.quote === 'string'
          ? (() => { try { return JSON.parse(row.quote); } catch { return undefined; } })()
          : row.quote || details.quote || undefined;

        let title = 'Custom Quote Request';
        if (row.order_type === 'custom_kit_converter') title = `Custom Kit (Converter) - ${details.size || 'Standard'}`;
        else if (row.order_type === 'custom_kit_assisted') title = `Assisted Kit - ${details.size || 'Standard'}`;
        else if (row.order_type === 'custom_stitched') title = `Custom Stitched Keepsake - ${details.size || 'Standard'}`;
        else if (row.order_type === 'store') {
          const firstItem = Array.isArray(row.items) && row.items[0] ? row.items[0] : (details.items && Array.isArray(details.items) ? details.items[0] : null);
          const itemName = firstItem?.title || firstItem?.name || details.product_name || details.title;
          title = itemName ? `Store Purchase: ${itemName}` : (row.title || 'Store Purchase');
        }
        else if (row.title) title = row.title;
        else if (row.order_type) title = `${row.order_type.replace(/_/g, ' ')}`;

        const firstItemImg = (Array.isArray(row.items) && (row.items[0]?.image || row.items[0]?.image_url || row.items[0]?.images?.[0])) ||
          (details.items && Array.isArray(details.items) && (details.items[0]?.image || details.items[0]?.image_url || details.items[0]?.images?.[0])) ||
          (Array.isArray(details.images) && details.images[0]) || '';

        const resolvedImageUrl = details.photo_url || details.pattern_result_url || row.image_url || firstItemImg || '';

        const quoteHistoryRaw = row.quote_history || details.quote_history || [];
        const quoteHistoryArr: ArchivedQuote[] = Array.isArray(quoteHistoryRaw)
          ? quoteHistoryRaw
          : (typeof quoteHistoryRaw === 'string' ? (() => { try { return JSON.parse(quoteHistoryRaw); } catch { return []; } })() : []);

        const customerFeedbackStr = row.customer_feedback || details.customer_feedback || '';

        const rawStatus = row.fulfillment_status || 'pending_quote';

        // Match customer profile
        const userKey = String(row.user_id || details.customer_email || details.email || '').toLowerCase();
        const matchedProfile = profileMap.get(userKey) || 
          profileMap.get(String(row.user_id || '').toLowerCase()) || 
          profileMap.get(String(details.customer_email || '').toLowerCase());

        const customerTier = getEffectiveTier(matchedProfile);
        const customerTierLabel = getEffectiveTierLabel(matchedProfile);

        const customerName = matchedProfile?.display_name || 
          matchedProfile?.name || 
          details.customer_name || 
          details.name || 
          (row.user_id?.includes('@') ? row.user_id.split('@')[0] : 'Customer');

        const customerEmail = matchedProfile?.email || 
          details.customer_email || 
          details.email || 
          (row.user_id?.includes('@') ? row.user_id : '');

        const totalAmountVal = row.total_amount ?? quoteObj?.total_amount ?? row.quoted_price ?? (details.quoted_price ?? 0);
        const itemPriceVal = quoteObj?.item_price ?? row.item_price ?? details.item_price ?? (totalAmountVal > 0 ? totalAmountVal : undefined);
        const deliveryChargeVal = quoteObj?.delivery_charge ?? row.delivery_charge ?? details.delivery_charge ?? 0;

        const mapped: SupabaseStitchOrderRow = {
          id: `order_${row.id}`,
          raw_order_id: row.id,
          user_id: row.user_id,
          title: title,
          image_url: resolvedImageUrl,
          status: rawStatus,
          fulfillment_status: rawStatus,
          payment_status: row.payment_status || details.payment_status || 'pending_quote',
          quote: quoteObj,
          quote_history: quoteHistoryArr,
          customer_feedback: customerFeedbackStr,
          item_price: itemPriceVal,
          delivery_charge: deliveryChargeVal,
          quoted_price: totalAmountVal > 0 ? totalAmountVal : undefined,
          total_amount: totalAmountVal,
          status_note: row.status_note || details.status_note || '',
          admin_notes: quoteObj?.admin_notes || row.admin_notes || details.admin_notes || '',
          estimated_completion: row.estimated_completion || details.estimated_completion || '',
          tracking_number: row.tracking_number || details.tracking_number || '',
          progress_percent: row.progress_percent ?? details.progress_percent,
          progress_note: row.progress_note || details.progress_note || '',
          progress_updated_at: row.progress_updated_at || details.progress_updated_at || '',
          pattern_config: row.pattern_config || details.pattern_config || null,
          pattern_pdf_url: row.pattern_pdf_url || details.pattern_pdf_url || '',
          pattern_preview_url: row.pattern_preview_url || details.pattern_preview_url || '',
          thread_requirements: row.thread_requirements || details.thread_requirements || [],
          stitch_progress_cells: row.stitch_progress_cells || details.stitch_progress_cells || [],
          created_at: row.created_at,
          updated_at: row.updated_at,
          order_type: row.order_type,
          request_details: details,
          items: row.items,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_tier: customerTier,
          customer_tier_label: customerTierLabel,
          customer_avatar: matchedProfile?.avatar_url,
          customer_role: matchedProfile?.role || 'user',
        };
        seenIds.add(String(mapped.id));
        allResults.push(mapped);
      }
    }
  } catch (err: any) {
    if (err?.code === '42P17') {
      console.warn('[fetchAllAdminOrders] Supabase orders table RLS recursion (42P17). Handled gracefully.');
    } else {
      console.warn('[fetchAllAdminOrders] Notice fetching admin orders:', err?.message || err);
    }
  }

  allResults.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });

  return allResults;
}

/**
 * Submits pricing quote for an order:
 *  - updates quote jsonb field with item_price, delivery_charge, total_amount, admin_notes
 *  - sets fulfillment_status = 'quoted'
 *  - writes directly to Supabase orders table
 */
export async function submitAdminQuote(
  orderId: string | number,
  quoteData: {
    line_items?: AdminQuoteLineItem[];
    items_subtotal?: number;
    crafting_charge?: number;
    discount_percent?: number;
    discount_amount?: number;
    delivery_charge: number;
    total_amount: number;
    admin_notes: string;
    item_price?: number;
  }
): Promise<{ success: boolean; error?: any }> {
  try {
    const rawId = typeof orderId === 'string' && orderId.startsWith('order_')
      ? orderId.replace('order_', '')
      : orderId;

    const normalizedLineItems = (quoteData.line_items || []).map((item, idx) => {
      const q = typeof item.quantity === 'number' ? item.quantity : (parseFloat(String(item.quantity)) || 0);
      const up = typeof item.unit_price === 'number' ? item.unit_price : (parseFloat(String(item.unit_price)) || 0);
      return {
        id: item.id || `item_${idx + 1}`,
        description: item.description || 'Item',
        reference_qty: item.reference_qty || '',
        quantity: q,
        unit: item.unit || 'pcs',
        unit_price: up,
        total: item.total !== undefined ? Number(item.total) : Number((q * up).toFixed(2)),
        dmc_code: item.dmc_code,
        hex: item.hex,
      };
    });

    const itemsSubtotal = quoteData.items_subtotal !== undefined
      ? Number(quoteData.items_subtotal)
      : normalizedLineItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

    const craftingCharge = Number(quoteData.crafting_charge) || 0;
    const discountPercent = Number(quoteData.discount_percent) || 0;
    const discountableAmount = itemsSubtotal + craftingCharge;
    const discountAmount = quoteData.discount_amount !== undefined
      ? Number(quoteData.discount_amount)
      : (discountPercent > 0 ? Number((discountableAmount * (discountPercent / 100)).toFixed(2)) : 0);
    const deliveryCharge = Number(quoteData.delivery_charge) || 0;
    const calculatedTotal = quoteData.total_amount !== undefined
      ? Number(quoteData.total_amount)
      : Number((discountableAmount - discountAmount + deliveryCharge).toFixed(2));

    const quoteJson = {
      line_items: normalizedLineItems,
      items_subtotal: Number(itemsSubtotal.toFixed(2)),
      crafting_charge: Number(craftingCharge.toFixed(2)),
      discount_percent: discountPercent,
      discount_amount: Number(discountAmount.toFixed(2)),
      delivery_charge: Number(deliveryCharge.toFixed(2)),
      total_amount: Number(calculatedTotal.toFixed(2)),
      item_price: Number((itemsSubtotal + craftingCharge).toFixed(2)), // legacy fallback
      admin_notes: quoteData.admin_notes || '',
      quoted_at: new Date().toISOString(),
    };

    const statusNoteText = quoteData.admin_notes
      ? `Quote Ready: ${quoteData.admin_notes}`
      : 'Your custom quote is ready! Review the quote details and click Confirm Order to proceed.';

    const payload: Record<string, any> = {
      quote: quoteJson,
      quoted_price: Number(calculatedTotal.toFixed(2)),
      total_amount: Number(calculatedTotal.toFixed(2)),
      fulfillment_status: 'quoted',
      status_note: statusNoteText,
      admin_notes: quoteData.admin_notes || '',
      updated_at: new Date().toISOString(),
    };

    const updateResponse = await supabase
      .from('orders')
      .update(payload)
      .eq('id', rawId)
      .select();

    console.log('[submitAdminQuote] Full Supabase Response:', {
      orderId,
      rawId,
      payload,
      data: updateResponse.data,
      error: updateResponse.error,
      status: updateResponse.status,
      statusText: updateResponse.statusText,
      count: updateResponse.count,
    });

    if (updateResponse.error) {
      console.error('[submitAdminQuote] Supabase orders update error:', updateResponse.error);
      return { success: false, error: updateResponse.error };
    }

    // Trigger local events
    try {
      window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { orderId, quoteData } }));
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[submitAdminQuote] Exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Updates full admin order details including stage advancement,
 * progress tracking for custom_stitched, and tracking number.
 */
export async function updateAdminOrderDetails(
  orderId: string | number,
  updates: {
    fulfillment_status?: string;
    payment_status?: string;
    progress_percent?: number;
    progress_note?: string;
    progress_updated_at?: string;
    tracking_number?: string;
    status_note?: string;
    admin_notes?: string;
    estimated_completion?: string;
    quoted_price?: number;
    total_amount?: number;
  }
): Promise<{ success: boolean; error?: any }> {
  try {
    const rawId = typeof orderId === 'string' && orderId.startsWith('order_')
      ? orderId.replace('order_', '')
      : orderId;

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.fulfillment_status) payload.fulfillment_status = updates.fulfillment_status;
    if (updates.payment_status) payload.payment_status = updates.payment_status;
    if (updates.progress_percent !== undefined) payload.progress_percent = Number(updates.progress_percent);
    if (updates.progress_note !== undefined) payload.progress_note = updates.progress_note;
    if (updates.progress_updated_at !== undefined) payload.progress_updated_at = updates.progress_updated_at;
    if (updates.tracking_number !== undefined) payload.tracking_number = updates.tracking_number;
    if (updates.status_note !== undefined) payload.status_note = updates.status_note;
    if (updates.admin_notes !== undefined) payload.admin_notes = updates.admin_notes;
    if (updates.estimated_completion !== undefined) payload.estimated_completion = updates.estimated_completion;
    if (updates.quoted_price !== undefined) payload.quoted_price = Number(updates.quoted_price);
    if (updates.total_amount !== undefined) payload.total_amount = Number(updates.total_amount);

    const { error: orderError } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', rawId);

    if (orderError) {
      console.error('[updateAdminOrderDetails] Supabase orders table update error:', orderError);
      return { success: false, error: orderError };
    }

    // Trigger local events
    try {
      window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { orderId, updates } }));
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[updateAdminOrderDetails] Exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Saves pattern configuration for an order (used by Admin Stitch Tracker).
 */
export async function saveOrderPatternConfig(
  orderId: string | number,
  patternConfig: any
): Promise<{ success: boolean; error?: any }> {
  try {
    const rawId = typeof orderId === 'string' && orderId.startsWith('order_')
      ? orderId.replace('order_', '')
      : orderId;

    const { data: existing } = await supabase.from('orders').select('request_details').eq('id', rawId).maybeSingle();
    let currentDetails = typeof existing?.request_details === 'string'
      ? (() => { try { return JSON.parse(existing.request_details); } catch { return {}; } })()
      : existing?.request_details || {};

    currentDetails = {
      ...currentDetails,
      pattern_config: patternConfig,
    };

    const payload: Record<string, any> = {
      pattern_config: patternConfig,
      request_details: currentDetails,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('orders').update(payload).eq('id', rawId);
    if (error) {
      // Fallback update for databases without dedicated pattern_config column
      const fallback = await supabase.from('orders').update({
        request_details: currentDetails,
        updated_at: new Date().toISOString(),
      }).eq('id', rawId);

      if (fallback.error) {
        console.error('[saveOrderPatternConfig] Error updating order:', fallback.error);
        return { success: false, error: fallback.error };
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { orderId, patternConfig } }));
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[saveOrderPatternConfig] Exception:', err);
    return { success: false, error: err };
  }
}

export interface AdminOrderPatternSavePayload {
  pattern_config: any;
  pattern_pdf_url?: string;
  pattern_preview_url?: string;
  thread_requirements?: any[];
  fabric_details?: any;
  size?: string;
  color_count?: number;
  stitch_count?: number;
  photo_url?: string;
  original_photo_url?: string;
}

/**
 * Admin: Saves a pattern generated directly inside the Admin Order Converter Mode
 * into the target order row (without touching conversion_jobs or creating any cross-account jobs).
 */
export async function saveAdminOrderGeneratedPattern(
  orderId: string | number,
  payload: AdminOrderPatternSavePayload
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const rawId = typeof orderId === 'string' && orderId.startsWith('order_')
      ? orderId.replace('order_', '')
      : orderId;

    // Fetch existing request_details first so we don't overwrite other fields (address, phone, notes)
    let currentDetails: Record<string, any> = {};
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', rawId)
      .maybeSingle();

    if (existingOrder?.request_details && typeof existingOrder.request_details === 'object') {
      currentDetails = { ...existingOrder.request_details };
    } else {
      // Try custom_orders table as well
      const { data: existingCustom } = await supabase
        .from('custom_orders')
        .select('*')
        .eq('id', rawId)
        .maybeSingle();
      if (existingCustom?.request_details && typeof existingCustom.request_details === 'object') {
        currentDetails = { ...existingCustom.request_details };
      }
    }

    const updatedDetails = {
      ...currentDetails,
      pattern_config: payload.pattern_config,
      pattern_pdf_url: payload.pattern_pdf_url || currentDetails.pattern_pdf_url || '',
      pattern_preview_url: payload.pattern_preview_url || currentDetails.pattern_preview_url || '',
      thread_requirements: payload.thread_requirements || currentDetails.thread_requirements || [],
      fabric_details: payload.fabric_details || currentDetails.fabric_details,
      size: payload.size || currentDetails.size,
      color_count: payload.color_count || currentDetails.color_count,
      stitch_count: payload.stitch_count || currentDetails.stitch_count,
      photo_url: payload.photo_url || currentDetails.photo_url || existingOrder?.image_url,
      original_photo_url: payload.original_photo_url || currentDetails.original_photo_url,
      updated_by_admin: true,
      pattern_generated_at: new Date().toISOString(),
    };

    // Attempt direct columns update + request_details merge
    const updateObj: Record<string, any> = {
      request_details: updatedDetails,
      updated_at: new Date().toISOString(),
    };

    if (payload.pattern_config) updateObj.pattern_config = payload.pattern_config;
    if (payload.pattern_pdf_url) updateObj.pattern_pdf_url = payload.pattern_pdf_url;
    if (payload.pattern_preview_url) updateObj.pattern_preview_url = payload.pattern_preview_url;
    if (payload.thread_requirements) updateObj.thread_requirements = payload.thread_requirements;

    // 1. Update in 'orders' table
    const { error: ordersErr } = await supabase
      .from('orders')
      .update(updateObj)
      .eq('id', rawId);

    if (ordersErr) {
      // If columns like pattern_pdf_url don't exist as dedicated columns, fallback to request_details only
      console.warn('[saveAdminOrderGeneratedPattern] Retrying with request_details fallback:', ordersErr.message);
      const { error: fallbackErr } = await supabase
        .from('orders')
        .update({
          request_details: updatedDetails,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rawId);

      if (fallbackErr) {
        // Also try custom_orders
        await supabase
          .from('custom_orders')
          .update({
            request_details: updatedDetails,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rawId);
      }
    } else {
      // Also sync custom_orders table if row exists
      try {
        await supabase
          .from('custom_orders')
          .update({
            request_details: updatedDetails,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rawId);
      } catch {}
    }

    try {
      window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { orderId: rawId, pattern_config: payload.pattern_config } }));
    } catch {}

    return { success: true, data: { orderId: rawId, details: updatedDetails } };
  } catch (err: any) {
    console.error('[saveAdminOrderGeneratedPattern] Exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Saves interactive stitch progress cells and recalculates progress_percent for an order.
 * If progress_percent reaches 100% for a custom_stitched order currently in 'in_production'
 * (or 'in_progress'), automatically advances fulfillment_status to 'quality_check'.
 */
export async function saveOrderStitchProgress(
  orderId: string | number,
  cells: string[],
  progressPercent: number
): Promise<{ success: boolean; autoAdvancedToQualityCheck?: boolean; newStatus?: string; error?: any }> {
  try {
    const rawId = typeof orderId === 'string' && orderId.startsWith('order_')
      ? orderId.replace('order_', '')
      : orderId;

    const roundedPercent = Math.min(100, Math.max(0, Math.round(progressPercent)));
    const nowIso = new Date().toISOString();

    const { data: existing } = await supabase.from('orders').select('*').eq('id', rawId).maybeSingle();
    let currentDetails = typeof existing?.request_details === 'string'
      ? (() => { try { return JSON.parse(existing.request_details); } catch { return {}; } })()
      : existing?.request_details || {};

    const existingStatus = (existing?.fulfillment_status || existing?.status || currentDetails.fulfillment_status || currentDetails.status || '').toLowerCase();
    const orderType = existing?.order_type || currentDetails.order_type || '';

    // Only auto-advance if it is a custom_stitched order, currently in 'in_production' / 'in_progress', and reaches 100%
    const isCustomStitched = orderType === 'custom_stitched' || String(orderId).toLowerCase().includes('custom_stitched');
    const isInProduction = existingStatus === 'in_production' || existingStatus === 'in_progress';
    const isReaching100 = roundedPercent >= 100;
    const shouldAutoAdvance = isCustomStitched && isInProduction && isReaching100;

    currentDetails = {
      ...currentDetails,
      stitch_progress_cells: cells,
      progress_percent: roundedPercent,
      progress_updated_at: nowIso,
      ...(shouldAutoAdvance ? {
        fulfillment_status: 'quality_check',
        status_note: 'All stitches marked complete (100%). Order moved to Quality Check.',
      } : {}),
    };

    const payload: Record<string, any> = {
      stitch_progress_cells: cells,
      progress_percent: roundedPercent,
      progress_updated_at: nowIso,
      request_details: currentDetails,
      updated_at: nowIso,
    };

    if (shouldAutoAdvance) {
      payload.fulfillment_status = 'quality_check';
      payload.status_note = 'All stitches marked complete (100%). Order moved to Quality Check.';
    }

    const { error } = await supabase.from('orders').update(payload).eq('id', rawId);
    if (error) {
      // Fallback update without stitch_progress_cells top-level column
      const fallbackPayload: Record<string, any> = {
        progress_percent: roundedPercent,
        progress_updated_at: nowIso,
        request_details: currentDetails,
        updated_at: nowIso,
      };
      if (shouldAutoAdvance) {
        fallbackPayload.fulfillment_status = 'quality_check';
        fallbackPayload.status_note = 'All stitches marked complete (100%). Order moved to Quality Check.';
      }
      const fallback = await supabase.from('orders').update(fallbackPayload).eq('id', rawId);

      if (fallback.error) {
        console.error('[saveOrderStitchProgress] Error updating stitch progress:', fallback.error);
        return { success: false, error: fallback.error };
      }
    }

    // Also sync custom_orders table if row exists
    try {
      const customPayload: Record<string, any> = {
        request_details: currentDetails,
        updated_at: nowIso,
      };
      if (shouldAutoAdvance) {
        customPayload.fulfillment_status = 'quality_check';
      }
      await supabase.from('custom_orders').update(customPayload).eq('id', rawId);
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent('orderUpdated', {
        detail: {
          orderId,
          progressPercent: roundedPercent,
          cells,
          autoAdvancedToQualityCheck: shouldAutoAdvance,
          newStatus: shouldAutoAdvance ? 'quality_check' : undefined,
        }
      }));
    } catch {}

    return {
      success: true,
      autoAdvancedToQualityCheck: shouldAutoAdvance,
      newStatus: shouldAutoAdvance ? 'quality_check' : undefined,
    };
  } catch (err: any) {
    console.error('[saveOrderStitchProgress] Exception:', err);
    return { success: false, error: err };
  }
}

export async function updateAdminOrderStatus(
  orderId: string | number,
  updates: {
    fulfillment_status?: string;
    payment_status?: string;
    quoted_price?: number;
    total_amount?: number;
    status_note?: string;
    estimated_completion?: string;
    tracking_number?: string;
  }
): Promise<{ success: boolean; error?: any }> {
  return updateAdminOrderDetails(orderId, updates);
}

/**
 * Customer confirms quote -> Moves fulfillment_status to 'awaiting_payment'
 */
export async function acceptCustomerQuote(orderId: string | number): Promise<{ success: boolean; error?: any }> {
  return updateAdminOrderStatus(orderId, {
    fulfillment_status: 'awaiting_payment',
    payment_status: 'awaiting_payment',
    status_note: 'Quote confirmed by customer. Awaiting payment confirmation before crafting begins.',
  });
}

/**
 * Admin declines order when unable to fulfill (from pending_quote or revision_requested):
 * - Updates fulfillment_status = 'declined'
 * - Updates status_note = reason entered by admin
 * - Updates updated_at = now()
 */
export async function declineAdminOrder(
  orderId: string | number,
  reason: string
): Promise<{ success: boolean; error?: any; message?: string }> {
  try {
    const rawId = typeof orderId === 'string' && orderId.startsWith('order_')
      ? orderId.replace('order_', '')
      : orderId;

    const trimmedReason = (reason || '').trim();
    const payload = {
      fulfillment_status: 'declined',
      status_note: trimmedReason,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', rawId);

    if (error) {
      console.error('[declineAdminOrder] Supabase update error:', error);
      return { success: false, error, message: error.message };
    }

    try {
      window.dispatchEvent(
        new CustomEvent('orderUpdated', {
          detail: { orderId, status: 'declined', reason: trimmedReason },
        })
      );
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[declineAdminOrder] Exception:', err);
    return { success: false, error: err, message: err?.message };
  }
}

/**
 * Customer requests revision on quote via secure database function:
 * - Calls supabase.rpc('request_quote_revision', { p_order_id, p_feedback })
 * - The database function handles archiving quote_history, setting status, and updating feedback internally.
 */
export async function requestQuoteRevision(
  orderId: string | number,
  feedback: string,
  _currentQuote?: AdminQuoteData,
  _existingHistory?: ArchivedQuote[]
): Promise<{ success: boolean; data?: any; error?: any; message?: string }> {
  try {
    const rawId = typeof orderId === 'string' && orderId.startsWith('order_')
      ? orderId.replace('order_', '')
      : orderId;

    const trimmedFeedback = (feedback || '').trim();

    const { data, error } = await supabase.rpc('request_quote_revision', {
      p_order_id: rawId,
      p_feedback: trimmedFeedback,
    });

    if (error) {
      console.error('[requestQuoteRevision] Supabase RPC error:', error);
      return {
        success: false,
        error,
        message: error.message || 'Unable to submit revision request. Please try again.',
      };
    }

    try {
      window.dispatchEvent(
        new CustomEvent('orderUpdated', {
          detail: { orderId, status: 'revision_requested', feedback: trimmedFeedback },
        })
      );
    } catch {}

    return { success: true, data };
  } catch (err: any) {
    console.error('[requestQuoteRevision] Exception:', err);
    return {
      success: false,
      error: err,
      message: err?.message || 'Unable to submit revision request. Please try again.',
    };
  }
}

/**
 * Customer cancels order via secure database function:
 * - Calls supabase.rpc('cancel_customer_order', { p_order_id, p_reason })
 * - The database function validates order state, permissions, and updates status internally.
 */
export async function cancelCustomerOrder(
  orderId: string | number,
  reason?: string
): Promise<{ success: boolean; data?: any; error?: any; message?: string }> {
  try {
    const rawId = typeof orderId === 'string' && orderId.startsWith('order_')
      ? orderId.replace('order_', '')
      : orderId;

    const { data, error } = await supabase.rpc('cancel_customer_order', {
      p_order_id: rawId,
      p_reason: reason || 'Cancelled by customer from dashboard',
    });

    if (error) {
      console.error('[cancelCustomerOrder] Supabase RPC error:', error);
      return {
        success: false,
        error,
        message: error.message || 'Unable to cancel order. Please try again.',
      };
    }

    try {
      window.dispatchEvent(
        new CustomEvent('orderUpdated', {
          detail: { orderId, status: 'cancelled' },
        })
      );
    } catch {}

    return { success: true, data };
  } catch (err: any) {
    console.error('[cancelCustomerOrder] Exception:', err);
    return {
      success: false,
      error: err,
      message: err?.message || 'Unable to cancel order. Please try again.',
    };
  }
}

/**
 * Manual test action for admin to mark an order as paid -> Moves fulfillment_status to 'confirmed'
 */
export async function markOrderAsPaidTest(orderId: string | number): Promise<{ success: boolean; error?: any }> {
  return updateAdminOrderStatus(orderId, {
    fulfillment_status: 'confirmed',
    payment_status: 'paid',
    status_note: 'Payment received (Test Mode). Order confirmed and queued for production.',
  });
}

export async function createCustomStitchOrder(params: {
  userId?: string;
  userEmail: string;
  customerName: string;
  title: string;
  description: string;
  estimatedPrice?: number;
  sourceImageUrl?: string;
}): Promise<boolean> {
  const res = await createOrderRequest({
    userId: params.userId,
    userEmail: params.userEmail,
    orderType: 'custom_stitched',
    requestDetails: {
      title: params.title,
      notes: params.description,
      photo_url: params.sourceImageUrl,
      customer_name: params.customerName,
      customer_email: params.userEmail,
    },
  });
  return res.success;
}

export interface SupabaseProfileRow {
  id?: string;
  user_id?: string;
  display_name?: string;
  name?: string;
  avatar_url?: string;
  role?: string; // 'admin' | 'user' | string
  payment_brand?: string;
  payment_last4?: string;
  subscription_tier?: string;
  subscription_status?: string;
  subscription_period_end?: string | null;
  access_until?: string;
  email?: string;
  created_at?: string;
  has_selected_plan?: boolean;
  [key: string]: any;
}

export async function fetchAllProfiles(): Promise<SupabaseProfileRow[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[fetchAllProfiles] Supabase profiles query warning:', error);
      return [];
    }
    return (data as SupabaseProfileRow[]) || [];
  } catch (err) {
    console.error('[fetchAllProfiles] Exception fetching profiles:', err);
    return [];
  }
}

export type EffectiveTier = 'free' | 'pro' | 'studio';

/**
 * Derives the effective subscription tier for feature gating across the app.
 * Access to paid features requires BOTH:
 *  1. subscription_tier matching 'pro' or 'studio'
 *  2. subscription_status === 'active'
 *  3. subscription_period_end (if set) is not in the past
 *
 * If subscription_status is 'inactive', 'canceled', 'canceling', 'past_due', missing,
 * or the subscription period has expired without renewal, this returns 'free'
 * so all paid pro/studio features remain securely locked.
 */
export function getEffectiveTier(
  profile?: { 
    subscription_tier?: string | null; 
    subscription_status?: string | null;
    subscription_period_end?: string | null;
  } | null
): EffectiveTier {
  if (!profile) return 'free';

  const rawTier = (profile.subscription_tier || '').toLowerCase().trim();
  const rawStatus = (profile.subscription_status || '').toLowerCase().trim();

  // If tier is explicitly free, empty, or missing, always 'free'
  if (!rawTier || rawTier === 'free') {
    return 'free';
  }

  // Paid tier strictly requires subscription_status === 'active'
  if (rawStatus !== 'active') {
    return 'free';
  }

  // If a subscription_period_end timestamp is populated (e.g. via PayHere webhooks) and has expired,
  // automatically downgrade effective tier to 'free'.
  if (profile.subscription_period_end) {
    try {
      const periodEnd = new Date(profile.subscription_period_end);
      if (!isNaN(periodEnd.getTime()) && periodEnd.getTime() < Date.now()) {
        return 'free';
      }
    } catch {
      // Ignore invalid date format and proceed
    }
  }

  if (rawTier.includes('studio')) {
    return 'studio';
  }
  if (rawTier.includes('pro')) {
    return 'pro';
  }

  return 'free';
}

/**
 * Returns a human-friendly display label based on the effective active tier.
 */
export function getEffectiveTierLabel(
  profile?: { subscription_tier?: string | null; subscription_status?: string | null } | null
): string {
  const tier = getEffectiveTier(profile);
  if (tier === 'studio') return 'Studio Plan';
  if (tier === 'pro') return 'Pro Crafter';
  return 'Free Crafter';
}

export async function cancelSubscription(): Promise<{ success: boolean; message?: string }> {
  // Placeholder function for cancelling subscription
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, message: 'Subscription cancellation request received.' });
    }, 1500);
  });
}

export function resizeImageClientSide(file: File, maxPx: number = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxPx || height > maxPx) {
          if (width > height) {
            height = Math.round((height * maxPx) / width);
            width = maxPx;
          } else {
            width = Math.round((width * maxPx) / height);
            height = maxPx;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

export async function uploadAvatarToSupabase(file: File, userId: string): Promise<string | null> {
  try {
    const resizedBlob = await resizeImageClientSide(file, 400);
    const cleanUserId = (userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanUserId}_${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, resizedBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase storage upload error (profile-pictures):', error);
      // Create local object URL / data URL as fallback if storage bucket fails
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(resizedBlob);
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('Error in uploadAvatarToSupabase:', err);
    return null;
  }
}

export async function uploadPDFToSupabase(pdfBlob: Blob, fileName: string, userId: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[uploadPDFToSupabase] Supabase Auth Session before upload:', {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      sessionUserEmail: session?.user?.email,
      hasAccessToken: !!session?.access_token,
      paramUserId: userId,
    });

    const effectiveUserId = session?.user?.id || userId;
    const cleanUserId = (effectiveUserId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFileName = (fileName || 'pattern').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${cleanUserId}_${cleanFileName}_${Date.now()}.pdf`;

    const { data, error } = await supabase.storage
      .from('conversion-results')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error('[uploadPDFToSupabase] Supabase storage upload error (conversion-results):', {
        error,
        code: (error as any).statusCode || (error as any).code,
        message: error.message,
      });
      return null;
    }

    console.log('[uploadPDFToSupabase] Storage upload succeeded:', data);

    const { data: publicUrlData } = supabase.storage
      .from('conversion-results')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('[uploadPDFToSupabase] Exception during PDF upload:', err);
    return null;
  }
}

export async function uploadThumbnailToSupabase(imageSrc: string, fileName: string, userId: string): Promise<string | null> {
  try {
    if (!imageSrc) return null;
    let blob: Blob;
    if (imageSrc.startsWith('data:')) {
      const resp = await fetch(imageSrc);
      blob = await resp.blob();
    } else if (imageSrc.startsWith('blob:')) {
      const resp = await fetch(imageSrc);
      blob = await resp.blob();
    } else if (imageSrc.startsWith('http')) {
      return imageSrc;
    } else {
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    console.log('[uploadThumbnailToSupabase] Supabase Auth Session before upload:', {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      sessionUserEmail: session?.user?.email,
      hasAccessToken: !!session?.access_token,
      paramUserId: userId,
    });

    const effectiveUserId = session?.user?.id || userId;
    const cleanUserId = (effectiveUserId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFileName = (fileName || 'thumb').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${cleanUserId}_${cleanFileName}_thumb_${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('conversion-results')
      .upload(filePath, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('[uploadThumbnailToSupabase] Supabase storage upload error for thumbnail:', {
        error,
        code: (error as any).statusCode || (error as any).code,
        message: error.message,
      });
      return null;
    }

    console.log('[uploadThumbnailToSupabase] Storage upload succeeded:', data);

    const { data: publicUrlData } = supabase.storage
      .from('conversion-results')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('[uploadThumbnailToSupabase] Exception during thumbnail upload:', err);
    return null;
  }
}

export async function uploadOriginalPhotoToSupabase(imageSrc: string, fileName: string, userId: string): Promise<string | null> {
  try {
    if (!imageSrc) return null;
    let blob: Blob;
    if (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:') || imageSrc.startsWith('http')) {
      const resp = await fetch(imageSrc);
      blob = await resp.blob();
    } else {
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    console.log('[uploadOriginalPhotoToSupabase] Supabase Auth Session before upload:', {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      sessionUserEmail: session?.user?.email,
      hasAccessToken: !!session?.access_token,
      paramUserId: userId,
    });

    const effectiveUserId = session?.user?.id || userId;
    const cleanUserId = (effectiveUserId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFileName = (fileName || 'original').replace(/[^a-zA-Z0-9_-]/g, '_');

    let fileExt = 'jpg';
    if (blob.type === 'image/png') fileExt = 'png';
    else if (blob.type === 'image/webp') fileExt = 'webp';
    else if (blob.type === 'image/gif') fileExt = 'gif';

    const filePath = `${cleanUserId}_${cleanFileName}_original_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('conversion-results')
      .upload(filePath, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('[uploadOriginalPhotoToSupabase] Supabase storage upload error for original photo:', {
        error,
        code: (error as any).statusCode || (error as any).code,
        message: error.message,
      });
      return null;
    }

    console.log('[uploadOriginalPhotoToSupabase] Storage upload succeeded:', data);

    const { data: publicUrlData } = supabase.storage
      .from('conversion-results')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('[uploadOriginalPhotoToSupabase] Exception during original photo upload:', err);
    return null;
  }
}

export async function uploadPatternPreviewToSupabase(imageSrc: string | Blob, fileName: string, userId: string): Promise<string | null> {
  try {
    if (!imageSrc) return null;
    let blob: Blob;
    if (imageSrc instanceof Blob) {
      blob = imageSrc;
    } else if (typeof imageSrc === 'string' && (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:') || imageSrc.startsWith('http'))) {
      const resp = await fetch(imageSrc);
      blob = await resp.blob();
    } else {
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    console.log('[uploadPatternPreviewToSupabase] Supabase Auth Session before upload:', {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      sessionUserEmail: session?.user?.email,
      hasAccessToken: !!session?.access_token,
      paramUserId: userId,
    });

    const effectiveUserId = session?.user?.id || userId;
    const cleanUserId = (effectiveUserId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFileName = (fileName || 'pattern_preview').replace(/[^a-zA-Z0-9_-]/g, '_');

    let fileExt = 'png';
    if (blob.type === 'image/jpeg') fileExt = 'jpg';
    else if (blob.type === 'image/webp') fileExt = 'webp';

    const filePath = `${cleanUserId}_${cleanFileName}_preview_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('conversion-results')
      .upload(filePath, blob, {
        contentType: blob.type || 'image/png',
        upsert: true,
      });

    if (error) {
      console.error('[uploadPatternPreviewToSupabase] Supabase storage upload error for pattern preview:', {
        error,
        code: (error as any).statusCode || (error as any).code,
        message: error.message,
      });
      return null;
    }

    console.log('[uploadPatternPreviewToSupabase] Storage upload succeeded:', data);

    const { data: publicUrlData } = supabase.storage
      .from('conversion-results')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('[uploadPatternPreviewToSupabase] Exception during pattern preview upload:', err);
    return null;
  }
}

export async function fetchUserProfile(userId?: string, _userEmail?: string): Promise<SupabaseProfileRow | null> {
  if (!userId) return null;
  let profile: SupabaseProfileRow | null = null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role, subscription_tier, subscription_status, has_selected_plan, avatar_url, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      profile = data as SupabaseProfileRow;
    }
  } catch (err: any) {
    if (err?.code === '42P17') {
      console.warn('[fetchUserProfile] Supabase profiles RLS recursion (42P17). Returning profile fallback safely.');
    } else {
      console.warn('[fetchUserProfile] Notice fetching profile:', err?.message || err);
    }
  }

  if (profile) {
    profile.has_selected_plan = profile.has_selected_plan === true;
  }

  return profile;
}

export async function updateUserProfile(
  userId: string,
  _userEmail: string,
  updates: { display_name?: string; avatar_url?: string; has_selected_plan?: boolean }
): Promise<boolean> {
  if (!userId) return false;

  const validUpdates: Record<string, any> = {};
  if (updates.display_name !== undefined) validUpdates.display_name = updates.display_name;
  if (updates.avatar_url !== undefined) validUpdates.avatar_url = updates.avatar_url;
  if (updates.has_selected_plan !== undefined) validUpdates.has_selected_plan = updates.has_selected_plan;

  try {
    const { error: updateError } = await supabase
      .from('profiles')
      .update(validUpdates)
      .eq('id', userId);

    if (updateError) {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: updates.display_name || 'Crafter',
          role: 'user',
          subscription_tier: 'free',
          subscription_status: 'active',
          ...validUpdates,
        });

      if (upsertError) {
        console.error('[updateUserProfile] Error upserting profile:', upsertError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('[updateUserProfile] Exception:', err);
    return false;
  }
}

/**
 * Updates the user's plan selection status strictly in Supabase profiles table.
 * Profiles table is the single source of truth.
 */
export async function updateUserPlanSelection(
  userId?: string,
  _userEmail?: string,
  hasSelected: boolean = true
): Promise<boolean> {
  if (!userId) return false;

  // Fire local event so UI reacts immediately without waiting on network
  window.dispatchEvent(new CustomEvent('plan-selection-changed', { detail: { hasSelected } }));

  try {
    const updatePayload = {
      has_selected_plan: hasSelected,
      subscription_tier: 'free',
      subscription_status: 'active',
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (updateError) {
      console.warn('[updateUserPlanSelection] Update failed, attempting upsert:', updateError.message);
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          role: 'user',
          ...updatePayload,
        });

      if (upsertError) {
        console.error('[updateUserPlanSelection] Error upserting profile in Supabase:', upsertError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('[updateUserPlanSelection] Error:', err);
    return false;
  }
}

export async function updateUserTier(
  userId: string,
  _userEmail: string,
  tier: 'free' | 'pro' | 'studio',
  _periodEnd?: string | null
): Promise<boolean> {
  window.dispatchEvent(new CustomEvent('dev-tier-changed', { detail: tier }));
  window.dispatchEvent(new CustomEvent('tierChanged', { detail: { tier } }));
  window.dispatchEvent(new CustomEvent('plan-selection-changed', { detail: { hasSelected: true } }));

  if (!userId) return false;

  try {
    const updatePayload = {
      subscription_tier: tier,
      subscription_status: 'active',
      has_selected_plan: true,
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (updateError) {
      console.warn('[updateUserTier] Update failed, attempting upsert:', updateError.message);
      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          role: 'user',
          ...updatePayload,
        });
    }
  } catch (err) {
    console.error('Error updating tier in Supabase:', err);
  }

  return true;
}

/**
 * Inserts a new contact inquiry into the Supabase contact_messages table.
 * Also attempts to invoke notify-contact-message Edge Function if available.
 */
export async function submitContactMessage(messageData: {
  name: string;
  email: string;
  inquiry_type: string;
  subject?: string;
  message: string;
}): Promise<{ success: boolean; data?: ContactMessage; error?: any }> {
  try {
    const payload = {
      name: messageData.name.trim(),
      email: messageData.email.trim(),
      inquiry_type: messageData.inquiry_type || 'General Inquiry',
      subject: messageData.subject?.trim() || '',
      message: messageData.message.trim(),
      status: 'new',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contact_messages')
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) {
      console.error('[submitContactMessage] Supabase error:', error);
      return { success: false, error };
    }

    const inserted: ContactMessage = data || {
      id: `msg_${Date.now()}`,
      ...payload,
    };

    // Attempt triggering the notification edge function as well (in case DB webhook is not active)
    try {
      supabase.functions.invoke('notify-contact-message', {
        body: { record: inserted },
      }).catch((e) => {
        console.info('[submitContactMessage] Note on edge function invocation:', e);
      });
    } catch {}

    return { success: true, data: inserted };
  } catch (err: any) {
    console.error('[submitContactMessage] Exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Fetches all contact messages from Supabase contact_messages table (most recent first).
 */
export async function fetchAllContactMessages(): Promise<ContactMessage[]> {
  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[fetchAllContactMessages] Error fetching contact_messages:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.id),
      name: row.name || 'Anonymous',
      email: row.email || '',
      inquiry_type: row.inquiry_type || row.inquiryType || 'General Inquiry',
      subject: row.subject || '',
      message: row.message || '',
      status: (row.status || 'new').toLowerCase(),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.error('[fetchAllContactMessages] Exception:', err);
    return [];
  }
}

/**
 * Updates the status of a contact message ('new' | 'read' | 'replied').
 */
export async function updateContactMessageStatus(
  id: string,
  status: 'new' | 'read' | 'replied'
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('contact_messages')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[updateContactMessageStatus] Supabase error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[updateContactMessageStatus] Exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Deletes a contact message by id.
 */
export async function deleteContactMessage(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[deleteContactMessage] Supabase error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[deleteContactMessage] Exception:', err);
    return { success: false, error: err };
  }
}





