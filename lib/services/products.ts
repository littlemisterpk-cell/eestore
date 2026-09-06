'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Product, ProductImage, ProductVariant, ProductModifier, Category, ProductCategoryRelation } from '@/lib/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidateProduct } from '@/lib/revalidate';
import { getSettings } from './settings';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const staticSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } });

interface DBProductImage {
  id: string;
  product_id: string;
  url: string;
  alt?: string | null;
  sort_order?: number | null;
  is_primary?: boolean | null;
  size?: number | null;
  mime_type?: string | null;
  created_at: string;
}

interface DBProductVariant {
  id: string;
  product_id: string;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  custom_option?: string | null;
  custom_value?: string | null;
  color_hex?: string | null;
  price?: string | number | null;
  compare_price?: string | number | null;
  stock?: number | null;
  sku?: string | null;
  image_url?: string | null;
  show_image_swatch?: boolean | null;
  active?: boolean | null;
  sort_order?: number | null;
  inventory_threshold?: number | null;
}

interface DBProductModifier {
  id: string;
  product_id: string;
  name: string;
  price?: string | number | null;
  active?: boolean | null;
  sort_order?: number | null;
}

interface DBCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
  created_at: string;
  updated_at: string;
}

interface DBProductRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  price: string | number;
  compare_price?: string | number | null;
  cost?: string | number | null;
  sku?: string | null;
  category_id?: string | null;
  categories?: DBCategory | null;
  stock?: number | null;
  has_variants?: boolean | null;
  is_service?: boolean | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
  enable_swatches?: boolean | null;
  show_swatches_on_archive?: boolean | null;
  tags?: string[] | null;
  rating?: number | string | null;
  reviews_count?: number | null;
  product_images?: DBProductImage[] | null;
  product_variants?: DBProductVariant[] | null;
  product_modifiers?: DBProductModifier[] | null;
  custom_badge_id?: string | null;
  badge_enabled?: boolean | null;
  badges?: any | null;
  size_guide_id?: string | null;
  size_guides?: any | null;
  frequently_bought_together_ids?: string[] | null;
  flash_sale_enabled?: boolean | null;
  flash_sale_start_date?: string | null;
  flash_sale_end_date?: string | null;
  flash_sale_discount_type?: string | null;
  flash_sale_discount_value?: number | string | null;
  sort_order?: number | null;
  meta_sync_status?: string | null;
  meta_sync_error?: string | null;
  meta_last_synced_at?: string | null;
  inventory_threshold?: number | null;
  variation_order?: string[] | null;
  product_categories?: any[] | null;

  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

const mapProduct = (row: DBProductRow): Product => {
  const images: ProductImage[] = (row.product_images ?? []).map((img: DBProductImage) => ({
    id: img.id,
    productId: img.product_id,
    url: img.url,
    alt: img.alt || undefined,
    sortOrder: img.sort_order || 0,
    isPrimary: img.is_primary ?? false,
    size: img.size || undefined,
    mimeType: img.mime_type || undefined,
    createdAt: img.created_at
  })).sort((a: ProductImage, b: ProductImage) => a.sortOrder - b.sortOrder)
    .map((img, idx) => ({ ...img, isPrimary: idx === 0 }));

  const variants: ProductVariant[] = (row.product_variants ?? []).map((v: DBProductVariant) => ({
    id: v.id,
    productId: v.product_id,
    color: v.color || undefined,
    size: v.size || undefined,
    material: v.material || undefined,
    customOption: v.custom_option || undefined,
    customValue: v.custom_value || undefined,
    colorHex: v.color_hex || undefined,
    price: v.price ? parseFloat(v.price.toString()) : undefined,
    comparePrice: v.compare_price ? parseFloat(v.compare_price.toString()) : undefined,
    stock: v.stock || 0,
    sku: v.sku || undefined,
    imageUrl: v.image_url || undefined,
    showImageSwatch: v.show_image_swatch ?? false,
    active: v.active ?? true,
    sortOrder: v.sort_order || 0,
    inventoryThreshold: v.inventory_threshold || 0
  })).sort((a: ProductVariant, b: ProductVariant) => a.sortOrder - b.sortOrder);

  const modifiers: ProductModifier[] = (row.product_modifiers ?? []).map((m: DBProductModifier) => ({
    id: m.id,
    productId: m.product_id,
    name: m.name,
    price: m.price ? parseFloat(m.price.toString()) : 0,
    active: m.active ?? true,
    sortOrder: m.sort_order || 0
  })).sort((a: ProductModifier, b: ProductModifier) => a.sortOrder - b.sortOrder);

  const category: Category | undefined = row.categories ? {
    id: row.categories.id,
    name: row.categories.name,
    slug: row.categories.slug,
    description: row.categories.description || undefined,
    imageUrl: row.categories.image_url || undefined,
    sortOrder: row.categories.sort_order || 0,
    active: row.categories.active ?? true,
    createdAt: row.categories.created_at,
    updatedAt: row.categories.updated_at
  } : undefined;

  const productCategories: ProductCategoryRelation[] = (row.product_categories ?? []).map((pc: any) => ({
    productId: pc.product_id,
    categoryId: pc.category_id,
    category: pc.categories ? {
      id: pc.categories.id,
      name: pc.categories.name,
      slug: pc.categories.slug,
      description: pc.categories.description || undefined,
      imageUrl: pc.categories.image_url || undefined,
      sortOrder: pc.categories.sort_order || 0,
      active: pc.categories.active ?? true,
      createdAt: pc.categories.created_at,
      updatedAt: pc.categories.updated_at
    } : undefined
  }));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    shortDescription: row.short_description || undefined,
    price: row.price ? parseFloat(row.price.toString()) : 0,
    comparePrice: row.compare_price ? parseFloat(row.compare_price.toString()) : undefined,
    cost: row.cost ? parseFloat(row.cost.toString()) : undefined,
    sku: row.sku || undefined,
    categoryId: row.category_id || undefined,
    category,
    stock: row.stock || 0,
    hasVariants: row.has_variants ?? false,
    isService: row.is_service ?? false,
    isFeatured: row.is_featured ?? false,
    isActive: row.is_active ?? true,
    enableSwatches: row.enable_swatches ?? true,
    showSwatchesOnArchive: row.show_swatches_on_archive ?? true,
    customBadgeId: row.custom_badge_id || undefined,
    badgeEnabled: row.badge_enabled ?? true,
    customBadge: row.badges ? {
      id: row.badges.id,
      name: row.badges.name,
      bgColor: row.badges.bg_color,
      textColor: row.badges.text_color
    } : undefined,
    sizeGuideId: row.size_guide_id || undefined,
    sizeGuide: row.size_guides ? {
      id: row.size_guides.id,
      name: row.size_guides.name,
      chart_data: Array.isArray(row.size_guides.chart_data) ? row.size_guides.chart_data : [],
      imageUrl: row.size_guides.image_url || undefined
    } : undefined,
    frequentlyBoughtTogetherIds: row.frequently_bought_together_ids || [],
    flashSaleEnabled: row.flash_sale_enabled ?? false,
    flashSaleStartDate: row.flash_sale_start_date || undefined,
    flashSaleEndDate: row.flash_sale_end_date || undefined,
    flashSaleDiscountType: (row.flash_sale_discount_type as any) || 'fixed',
    flashSaleDiscountValue: row.flash_sale_discount_value ? parseFloat(row.flash_sale_discount_value.toString()) : 0,
    tags: row.tags ?? [],
    images,
    variants,
    modifiers,
    rating: row.rating ? parseFloat(row.rating.toString()) : undefined,
    reviewsCount: row.reviews_count !== null && row.reviews_count !== undefined ? row.reviews_count : undefined,
    meta_sync_status: row.meta_sync_status as any || 'pending',
    meta_sync_error: row.meta_sync_error || undefined,
    meta_last_synced_at: row.meta_last_synced_at || undefined,
    sortOrder: row.sort_order || 0,
    deletedAt: row.deleted_at || undefined,
    inventoryThreshold: row.inventory_threshold || 0,
    productCategories,
    variationOrder: row.variation_order || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const applyFlashSaleDiscounts = async (products: Product[]): Promise<Product[]> => {
  try {
    const settings = await getSettings();
    if (settings && settings.flash_sale_enabled === false) {
      return products;
    }
    const { getHomepageSections } = await import('./sections');
    const allSections = await getHomepageSections(true);
    const sections = allSections.filter(sec => sec.section_type === 'flash_sale');

    const now = Date.now();

    let isGlobalFlashSaleActive = false;
    if (settings && settings.flash_sale_enabled) {
      const gStart = settings.flash_sale_start_date ? new Date(settings.flash_sale_start_date).getTime() : 0;
      const gEnd = settings.flash_sale_end_date ? new Date(settings.flash_sale_end_date).getTime() : 0;

      const isStarted = !settings.flash_sale_start_date || gStart <= now;
      const isEnded = gEnd && gEnd < now;
      if (isStarted && !isEnded) {
        isGlobalFlashSaleActive = true;
      }
    }

    // Check if any homepage flash sale section is active (including infinite if dates are empty)
    const activeFlashSales = (sections || []).filter(sec => {
      const startStr = sec.settings?.startTime;
      const endStr = sec.settings?.endTime;

      if (!startStr && !endStr) {
        return true;
      }

      const start = startStr ? new Date(startStr).getTime() : 0;
      const end = endStr ? new Date(endStr).getTime() : 0;

      const isStarted = !startStr || start <= now;
      const isEnded = endStr && end < now;
      return isStarted && !isEnded;
    });

    return products.map(product => {
      // 0. Global Flash Sale (highest priority, overrides and holds individual settings)
      if (isGlobalFlashSaleActive && settings) {
        const discountType = settings.globalFlashSaleDiscountType || 'percentage';
        const discountVal = settings.globalFlashSaleDiscountValue || 0;

        if (discountVal > 0) {
          const currentPrice = product.price;
          const baseComparePrice = product.comparePrice || product.price;
          let discountPrice = currentPrice;

          if (discountType === 'percentage') {
            discountPrice = Math.round(currentPrice * (1 - discountVal / 100));
          } else if (discountType === 'fixed') {
            discountPrice = Math.max(0, currentPrice - discountVal);
          }

          if (discountPrice < currentPrice) {
            const updatedVariants = product.variants.map(v => {
              if (v.price) {
                const varCurrentPrice = v.price;
                const varComparePrice = v.comparePrice || (product.comparePrice ? Math.round(product.comparePrice * (v.price / product.price)) : v.price);
                let varDiscountPrice = varCurrentPrice;
                if (discountType === 'percentage') {
                  varDiscountPrice = Math.round(varCurrentPrice * (1 - discountVal / 100));
                } else if (discountType === 'fixed') {
                  varDiscountPrice = Math.max(0, varCurrentPrice - discountVal);
                }
                return {
                  ...v,
                  price: varDiscountPrice,
                  comparePrice: varComparePrice
                };
              }
              return v;
            });

            return {
              ...product,
              price: discountPrice,
              comparePrice: baseComparePrice,
              variants: updatedVariants,
              flashSaleEnabled: true,
              flashSaleEndDate: settings.flash_sale_end_date || undefined,
              flashSaleStartDate: settings.flash_sale_start_date || undefined
            };
          }
        }
      }

      // 1. Homepage manual products overrides (highest priority)
      for (const fs of activeFlashSales) {
        const fsProducts = fs.content_data?.products || [];
        const fsProd = fsProducts.find((p: any) => p?.productId === product.id);

        if (fsProd) {
          const currentPrice = product.price;
          const baseComparePrice = product.comparePrice || product.price;
          const discountPrice = fsProd.discountValue ? parseFloat(fsProd.discountValue.toString()) : product.price;

          if (discountPrice < currentPrice) {
            const ratio = discountPrice / currentPrice;
            const updatedVariants = product.variants.map(v => {
              if (v.price) {
                const varCurrentPrice = v.price;
                const varComparePrice = v.comparePrice || (product.comparePrice ? Math.round(product.comparePrice * (v.price / product.price)) : v.price);
                const newVarPrice = Math.round(varCurrentPrice * ratio);
                return {
                  ...v,
                  price: newVarPrice,
                  comparePrice: varComparePrice
                };
              }
              return v;
            });

            return {
              ...product,
              price: discountPrice,
              comparePrice: baseComparePrice,
              variants: updatedVariants,
              flashSaleEnabled: true,
              flashSaleEndDate: fs.settings?.endTime || undefined,
              flashSaleStartDate: fs.settings?.startTime || undefined
            };
          }
        }
      }

      // 2. Product-level Sale Settings (medium priority)
      if (product.flashSaleEnabled) {
        const pStartStr = product.flashSaleStartDate;
        const pEndStr = product.flashSaleEndDate;

        // Active if infinite (no dates selected) or inside selected timeframe
        const isStarted = !pStartStr || new Date(pStartStr).getTime() <= now;
        const isEnded = pEndStr && new Date(pEndStr).getTime() < now;

        if (isStarted && !isEnded) {
          const discountType = product.flashSaleDiscountType || 'fixed';
          const discountVal = product.flashSaleDiscountValue || 0;

          if (discountVal > 0) {
            const currentPrice = product.price;
            const baseComparePrice = product.comparePrice || product.price;
            let discountPrice = currentPrice;

            if (discountType === 'percentage') {
              discountPrice = Math.round(currentPrice * (1 - discountVal / 100));
            } else if (discountType === 'fixed') {
              discountPrice = Math.max(0, currentPrice - discountVal);
            }

            if (discountPrice < currentPrice) {
              const updatedVariants = product.variants.map(v => {
                if (v.price) {
                  const varCurrentPrice = v.price;
                  const varComparePrice = v.comparePrice || (product.comparePrice ? Math.round(product.comparePrice * (v.price / product.price)) : v.price);
                  let varDiscountPrice = varCurrentPrice;
                  if (discountType === 'percentage') {
                    varDiscountPrice = Math.round(varCurrentPrice * (1 - discountVal / 100));
                  } else if (discountType === 'fixed') {
                    varDiscountPrice = Math.max(0, varCurrentPrice - discountVal);
                  }
                  return {
                    ...v,
                    price: varDiscountPrice,
                    comparePrice: varComparePrice
                  };
                }
                return v;
              });

              return {
                ...product,
                price: discountPrice,
                comparePrice: baseComparePrice,
                variants: updatedVariants,
                flashSaleEnabled: true,
                flashSaleEndDate: product.flashSaleEndDate || undefined,
                flashSaleStartDate: product.flashSaleStartDate || undefined
              };
            }
          }
        }
      }

      // 3. Homepage Category Discounts (lowest priority)
      for (const fs of activeFlashSales) {
        const categoryDiscounts = fs.content_data?.categoryDiscounts || [];
        const fsCat = categoryDiscounts.find((c: any) => c?.categoryId === product.categoryId);

        if (fsCat) {
          const discountVal = parseFloat(fsCat.discountValue) || 0;
          if (discountVal > 0) {
            const currentPrice = product.price;
            const baseComparePrice = product.comparePrice || product.price;
            let discountPrice = currentPrice;

            if (fsCat.discountType === 'percentage') {
              discountPrice = Math.round(currentPrice * (1 - discountVal / 100));
            } else if (fsCat.discountType === 'fixed') {
              discountPrice = Math.max(0, currentPrice - discountVal);
            }

            if (discountPrice < currentPrice) {
              const updatedVariants = product.variants.map(v => {
                if (v.price) {
                  const varCurrentPrice = v.price;
                  const varComparePrice = v.comparePrice || (product.comparePrice ? Math.round(product.comparePrice * (v.price / product.price)) : v.price);
                  let varDiscountPrice = varCurrentPrice;
                  if (fsCat.discountType === 'percentage') {
                    varDiscountPrice = Math.round(varCurrentPrice * (1 - discountVal / 100));
                  } else if (fsCat.discountType === 'fixed') {
                    varDiscountPrice = Math.max(0, varCurrentPrice - discountVal);
                  }
                  return {
                    ...v,
                    price: varDiscountPrice,
                    comparePrice: varComparePrice
                  };
                }
                return v;
              });

              return {
                ...product,
                price: discountPrice,
                comparePrice: baseComparePrice,
                variants: updatedVariants,
                flashSaleEnabled: true,
                flashSaleEndDate: fs.settings?.endTime || undefined,
                flashSaleStartDate: fs.settings?.startTime || undefined
              };
            }
          }
        }
      }

      return product;
    });
  } catch (err) {
    console.error('Error applying flash sale discounts:', err);
    return products;
  }
};

const fetchProducts = async (categoryId?: string, limit?: number): Promise<Product[]> => {
  try {
    let query = staticSupabase
      .from('products')
      .select(`
        *,
        product_images(*),
        product_variants(*),
        product_modifiers(*),
        categories!category_id(*),
        product_categories(*, categories(*)),
        badges(*),
        size_guides(*)
      `)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    let finalQuery = query
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Limit SSR payload to avoid embedding 100+ products in HTML (causes 2MB+ pages)
    if (limit && limit > 0) {
      finalQuery = finalQuery.limit(limit) as typeof finalQuery;
    }

    const { data, error } = await finalQuery;

    if (error) {
      console.error('[Products Error Debug] fetchProducts failed:', error);
      throw error;
    }
    const products = (data ?? []).map(mapProduct);
    return applyFlashSaleDiscounts(products);
  } catch (err) {
    // Fallback: if vertical scoping is unavailable (pre-migration), fetch unfiltered
    try {
      let query = staticSupabase
        .from('products')
        .select(`
          *,
          product_images(*),
          product_variants(*),
          product_modifiers(*),
          categories!category_id(*),
          product_categories(*, categories(*)),
          badges(*),
          size_guides(*)
        `)
        .is('deleted_at', null)
        .eq('is_active', true);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      let finalQuery = query
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (limit && limit > 0) {
        finalQuery = finalQuery.limit(limit) as typeof finalQuery;
      }

      const { data, error } = await finalQuery;
      if (error) throw error;
      const products = (data ?? []).map(mapProduct);
      return applyFlashSaleDiscounts(products);
    } catch (fallbackErr) {
      console.error('[Products Error Debug] fetchProducts caught error, returning empty fallback list:', err);
      return [];
    }
  }
};

// Cache without limit (used internally for full list)
const cachedProducts = unstable_cache(
  async (categoryId?: string) => fetchProducts(categoryId),
  ['products-list-v3'],
  { tags: ['products'] }
);

// Cache WITH limit (used for SSR payload reduction)
const cachedProductsLimited = unstable_cache(
  async (categoryId?: string, limit?: number) => fetchProducts(categoryId, limit),
  ['products-list-limited-v3'],
  { tags: ['products'] }
);

export const getProducts = async (categoryId?: string, limit?: number) => {
  if (limit && limit > 0) {
    return cachedProductsLimited(categoryId, limit);
  }
  return cachedProducts(categoryId);
};


const fetchRelatedProducts = async (productId: string, categoryId?: string, limit = 4): Promise<Product[]> => {
  try {
    let related: DBProductRow[] = [];
    if (categoryId) {
      const { data, error } = await staticSupabase
        .from('products')
        .select('*, product_images(*), product_variants(*), product_modifiers(*), categories!category_id(*), product_categories(*, categories(*)), badges(*), size_guides(*)')
        .is('deleted_at', null)
        .eq('is_active', true)
        .eq('category_id', categoryId)
        .neq('id', productId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) {
        console.error('[Products Error Debug] fetchRelatedProducts failed:', error);
        throw error;
      }
      related = data ?? [];
    }

    if (related.length < limit) {
      const needed = limit - related.length;
      const excludeIds = [productId, ...related.map(r => r.id)];
      const { data, error } = await staticSupabase
        .from('products')
        .select('*, product_images(*), product_variants(*), product_modifiers(*), categories!category_id(*), product_categories(*, categories(*)), badges(*), size_guides(*)')
        .is('deleted_at', null)
        .eq('is_active', true)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(needed);
      if (error) {
        console.error('[Products Error Debug] fetchRelatedProducts fallback failed:', error);
        throw error;
      }
      related = [...related, ...(data ?? [])];
    }

    const products = related.map(mapProduct);
    return applyFlashSaleDiscounts(products);
  } catch (err) {
    console.error('[Products Error Debug] fetchRelatedProducts caught error:', err);
    throw err;
  }
};

const cachedRelatedProducts = (productId: string, categoryId?: string, limit = 4) => unstable_cache(
  async () => fetchRelatedProducts(productId, categoryId, limit),
  [`related-products-${productId}-${categoryId || 'none'}-${limit}`],
  { revalidate: 86400, tags: [`product-${productId}`, 'products'] }
);

export const getRelatedProducts = async (productId: string, categoryId?: string, limit = 4) => {
  return cachedRelatedProducts(productId, categoryId, limit)();
};

const fetchProductBySlug = async (slug: string): Promise<Product | null> => {
  try {
    const { data, error } = await staticSupabase
      .from('products')
      .select('*, product_images(*), product_variants(*), product_modifiers(*), categories!category_id(*), product_categories(*, categories(*)), badges(*), size_guides(*)')
      .eq('slug', slug)
      .is('deleted_at', null)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[Products Error Debug] fetchProductBySlug failed:', error);
      throw error;
    }
    if (!data) return null;
    const product = mapProduct(data);
    const discounted = await applyFlashSaleDiscounts([product]);
    return discounted[0] || null;
  } catch (err) {
    console.error('[Products Error Debug] fetchProductBySlug caught error:', err);
    throw err;
  }
};

const cachedProductBySlug = (slug: string) => unstable_cache(
  async () => fetchProductBySlug(slug),
  [`product-by-slug-${slug}`],
  { revalidate: 86400, tags: [`product-${slug}`, 'products'] }
)();

export const getProductBySlug = async (slug: string) => {
  return cachedProductBySlug(slug);
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, product_images(*), product_variants(*), product_modifiers(*), categories!category_id(*), product_categories(*, categories(*)), badges(*), size_guides(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const product = mapProduct(data);

    // Fetch the latest sync status from meta_sync_log
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('meta_sync_log')
      .select('status, error, created_at')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!logsError && logs && logs.length > 0) {
      const latestLog = logs[0];
      product.meta_sync_status = latestLog.status as any;
      product.meta_sync_error = latestLog.error || undefined;
      product.meta_last_synced_at = latestLog.created_at;
    } else {
      product.meta_sync_status = 'pending';
      product.meta_sync_error = undefined;
      product.meta_last_synced_at = undefined;
    }

    return product;
  } catch (error) {
    console.error('[products] getProductById failed, returning null fallback:', error);
    return null;
  }
};

export const getAllProductsAdmin = async (): Promise<Product[]> => {
  try {
    const supabase = staticSupabase;
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*), product_modifiers(*), categories!category_id(*), product_categories(*, categories(*)), badges(*), size_guides(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const products = (data ?? []).map(mapProduct);

    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      // Fetch latest logs for these products
      const { data: logs, error: logsError } = await supabase
        .from('meta_sync_log')
        .select('product_id, status, error, created_at')
        .in('product_id', productIds)
        .order('created_at', { ascending: true });

      if (!logsError && logs) {
        const latestLogs: Record<string, { status: string; error: string | null; created_at: string }> = {};
        logs.forEach(log => {
          latestLogs[log.product_id] = {
            status: log.status,
            error: log.error,
            created_at: log.created_at
          };
        });

        products.forEach(p => {
          const log = latestLogs[p.id];
          if (log) {
            p.meta_sync_status = log.status as any;
            p.meta_sync_error = log.error || undefined;
            p.meta_last_synced_at = log.created_at;
          } else {
            p.meta_sync_status = 'pending';
            p.meta_sync_error = undefined;
            p.meta_last_synced_at = undefined;
          }
        });
      }
    }

    return products;
  } catch (error) {
    console.error('[products] getAllProductsAdmin failed, returning empty fallback list:', error);
    return [];
  }
};

export const createProduct = async (
  product: Omit<Product, 'id' | 'images' | 'variants' | 'modifiers' | 'category' | 'createdAt' | 'updatedAt'>,
  images: Omit<ProductImage, 'id' | 'productId' | 'createdAt'>[],
  variants: Omit<ProductVariant, 'id' | 'productId'>[],
  modifiers: Omit<ProductModifier, 'id' | 'productId'>[]
): Promise<Product> => {
  try {
    const supabase = staticSupabase;

    // 1. Insert product core
    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .insert({
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: product.shortDescription,
        price: product.price,
        compare_price: product.comparePrice,
        cost: product.cost,
        sku: product.sku,
        category_id: product.categoryId,
        stock: product.stock,
        has_variants: product.hasVariants,
        is_service: product.isService,
        is_featured: product.isFeatured,
        is_active: product.isActive ?? true,
        enable_swatches: product.enableSwatches,
        show_swatches_on_archive: product.showSwatchesOnArchive,
        custom_badge_id: product.customBadgeId || null,
        badge_enabled: product.badgeEnabled ?? true,
        size_guide_id: product.sizeGuideId || null,
        frequently_bought_together_ids: product.frequentlyBoughtTogetherIds || [],
        flash_sale_enabled: product.flashSaleEnabled || false,
        flash_sale_start_date: product.flashSaleStartDate || null,
        flash_sale_end_date: product.flashSaleEndDate || null,
        flash_sale_discount_type: product.flashSaleDiscountType || 'fixed',
        flash_sale_discount_value: product.flashSaleDiscountValue || 0,
        tags: product.tags,
        rating: product.rating,
        reviews_count: product.reviewsCount,
        inventory_threshold: product.inventoryThreshold || 0,
        variation_order: product.variationOrder || null
      })
      .select('*')
      .single();

    if (prodError) throw prodError;
    const productId = prodData.id;

    // 2. Insert Images
    if (images.length > 0) {
      const { error: imgError } = await supabase
        .from('product_images')
        .insert(images.map(img => ({
          product_id: productId,
          url: img.url,
          alt: img.alt,
          sort_order: img.sortOrder,
          is_primary: img.isPrimary
        })));
      if (imgError) throw imgError;
    }

    // 3. Insert Variants
    if (product.hasVariants && variants.length > 0) {
      const { error: varError } = await supabase
        .from('product_variants')
        .insert(variants.map(v => ({
          product_id: productId,
          color: v.color,
          size: v.size,
          material: v.material,
          custom_option: v.customOption,
          custom_value: v.customValue,
          color_hex: v.colorHex,
          price: v.price,
          compare_price: v.comparePrice,
          stock: v.stock,
          sku: v.sku,
          image_url: v.imageUrl,
          show_image_swatch: v.showImageSwatch,
          active: v.active,
          sort_order: v.sortOrder,
          inventory_threshold: v.inventoryThreshold || 0
        })));
      if (varError) throw varError;
    }

    // 4. Insert Modifiers
    if (modifiers.length > 0) {
      const { error: modError } = await supabase
        .from('product_modifiers')
        .insert(modifiers.map(m => ({
          product_id: productId,
          name: m.name,
          price: m.price,
          active: m.active,
          sort_order: m.sortOrder
        })));
      if (modError) throw modError;
    }

    // 4b. Sync Product Category relations
    let categoryIdsToInsert = product.productCategories?.map(pc => pc.categoryId) || [];
    if (categoryIdsToInsert.length === 0 && product.categoryId) {
      categoryIdsToInsert.push(product.categoryId);
    }
    if (!categoryIdsToInsert.includes('00000000-0000-4000-8000-000000000099')) {
      categoryIdsToInsert.push('00000000-0000-4000-8000-000000000099');
    }

    const { error: pcInsErr } = await supabase
      .from('product_categories')
      .insert(categoryIdsToInsert.map(categoryId => ({
        product_id: productId,
        category_id: categoryId
      })));
    if (pcInsErr) throw pcInsErr;

    // 5. Get final updated product structure
    const updatedProduct = await getProductById(productId);
    if (!updatedProduct) throw new Error('Product created but could not be retrieved');
    await revalidateProduct(updatedProduct.slug);
    return updatedProduct;
  } catch (error) {
    console.error('[products] createProduct failed:', error);
    throw error;
  }
};

export const updateProduct = async (
  id: string,
  product: Partial<Omit<Product, 'id' | 'images' | 'variants' | 'modifiers' | 'category' | 'createdAt' | 'updatedAt'>>,
  images: Omit<ProductImage, 'id' | 'productId' | 'createdAt'>[],
  variants: Omit<ProductVariant, 'id' | 'productId'>[],
  modifiers: Omit<ProductModifier, 'id' | 'productId'>[]
): Promise<Product> => {
  try {
    const supabase = staticSupabase;

    // 1. Update product core
    const updatePayload: Record<string, any> = {};
    if (product.name !== undefined) updatePayload.name = product.name;
    if (product.slug !== undefined) updatePayload.slug = product.slug;
    if (product.description !== undefined) updatePayload.description = product.description;
    if (product.shortDescription !== undefined) updatePayload.short_description = product.shortDescription;
    if (product.price !== undefined) updatePayload.price = product.price;
    // Always write compare_price (null when cleared) so admin can remove it from DB
    updatePayload.compare_price = product.comparePrice ?? null;
    if (product.cost !== undefined) updatePayload.cost = product.cost;
    if (product.sku !== undefined) updatePayload.sku = product.sku;
    if (product.categoryId !== undefined) updatePayload.category_id = product.categoryId;

    if (product.stock !== undefined) updatePayload.stock = product.stock;
    if (product.hasVariants !== undefined) updatePayload.has_variants = product.hasVariants;
    if (product.isService !== undefined) updatePayload.is_service = product.isService;
    if (product.isFeatured !== undefined) updatePayload.is_featured = product.isFeatured;
    if (product.isActive !== undefined) updatePayload.is_active = product.isActive;
    if (product.enableSwatches !== undefined) updatePayload.enable_swatches = product.enableSwatches;
    if (product.showSwatchesOnArchive !== undefined) updatePayload.show_swatches_on_archive = product.showSwatchesOnArchive;
    if (product.customBadgeId !== undefined) updatePayload.custom_badge_id = product.customBadgeId || null;
    if (product.badgeEnabled !== undefined) updatePayload.badge_enabled = product.badgeEnabled;
    if (product.sizeGuideId !== undefined) updatePayload.size_guide_id = product.sizeGuideId || null;
    if (product.frequentlyBoughtTogetherIds !== undefined) updatePayload.frequently_bought_together_ids = product.frequentlyBoughtTogetherIds;
    if (product.flashSaleEnabled !== undefined) updatePayload.flash_sale_enabled = product.flashSaleEnabled;
    if (product.flashSaleStartDate !== undefined) updatePayload.flash_sale_start_date = product.flashSaleStartDate || null;
    if (product.flashSaleEndDate !== undefined) updatePayload.flash_sale_end_date = product.flashSaleEndDate || null;
    if (product.flashSaleDiscountType !== undefined) updatePayload.flash_sale_discount_type = product.flashSaleDiscountType;
    if (product.flashSaleDiscountValue !== undefined) updatePayload.flash_sale_discount_value = product.flashSaleDiscountValue;
    if (product.tags !== undefined) updatePayload.tags = product.tags;
    if (product.rating !== undefined) updatePayload.rating = product.rating;
    if (product.reviewsCount !== undefined) updatePayload.reviews_count = product.reviewsCount;
    if (product.inventoryThreshold !== undefined) updatePayload.inventory_threshold = product.inventoryThreshold;
    if (product.variationOrder !== undefined) updatePayload.variation_order = product.variationOrder;

    const { error: prodError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id);

    if (prodError) throw prodError;

    // 2. Sync Images (Delete old, insert new)
    const { error: imgDelError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id);
    if (imgDelError) throw imgDelError;

    if (images.length > 0) {
      const { error: imgInsError } = await supabase
        .from('product_images')
        .insert(images.map(img => ({
          product_id: id,
          url: img.url,
          alt: img.alt,
          sort_order: img.sortOrder,
          is_primary: img.isPrimary
        })));
      if (imgInsError) throw imgInsError;
    }

    // 3. Sync Variants (Delete old, insert new)
    const { error: varDelError } = await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', id);
    if (varDelError) throw varDelError;

    if ((product.hasVariants ?? true) && variants.length > 0) {
      const { error: varInsError } = await supabase
        .from('product_variants')
        .insert(variants.map(v => ({
          product_id: id,
          color: v.color,
          size: v.size,
          material: v.material,
          custom_option: v.customOption,
          custom_value: v.customValue,
          color_hex: v.colorHex,
          price: v.price,
          compare_price: v.comparePrice,
          stock: v.stock,
          sku: v.sku,
          image_url: v.imageUrl,
          show_image_swatch: v.showImageSwatch,
          active: v.active,
          sort_order: v.sortOrder,
          inventory_threshold: v.inventoryThreshold || 0
        })));
      if (varInsError) throw varInsError;
    }

    // 4. Sync Modifiers
    const { error: modDelError } = await supabase
      .from('product_modifiers')
      .delete()
      .eq('product_id', id);
    if (modDelError) throw modDelError;

    if (modifiers.length > 0) {
      const { error: modInsError } = await supabase
        .from('product_modifiers')
        .insert(modifiers.map(m => ({
          product_id: id,
          name: m.name,
          price: m.price,
          active: m.active,
          sort_order: m.sortOrder
        })));
      if (modInsError) throw modInsError;
    }

    // Sync multi category relations — always include "shop" system category
    let categoryIdsToUpdate = product.productCategories?.map(pc => pc.categoryId) || [];
    if (categoryIdsToUpdate.length === 0 && product.categoryId) {
      categoryIdsToUpdate.push(product.categoryId);
    }
    if (!categoryIdsToUpdate.includes('00000000-0000-4000-8000-000000000099')) {
      categoryIdsToUpdate.push('00000000-0000-4000-8000-000000000099');
    }

    const { error: pcDelError } = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', id);
    if (pcDelError) throw pcDelError;

    if (categoryIdsToUpdate.length > 0) {
      const { error: pcInsError } = await supabase
        .from('product_categories')
        .insert(categoryIdsToUpdate.map(categoryId => ({
          product_id: id,
          category_id: categoryId
        })));
      if (pcInsError) throw pcInsError;
    }

    // 5. Get final updated product structure
    const updatedProduct = await getProductById(id);
    if (!updatedProduct) throw new Error('Product updated but could not be retrieved');
    await revalidateProduct(updatedProduct.slug);
    return updatedProduct;
  } catch (error) {
    console.error('[products] updateProduct failed:', error);
    throw error;
  }
};

export const updateProductFields = async (
  id: string,
  fields: Partial<Product>
): Promise<void> => {
  try {
    const supabase = staticSupabase;
    const updatePayload: Record<string, any> = {};
    if (fields.name !== undefined) updatePayload.name = fields.name;
    if (fields.slug !== undefined) updatePayload.slug = fields.slug;
    if (fields.description !== undefined) updatePayload.description = fields.description;
    if (fields.shortDescription !== undefined) updatePayload.short_description = fields.shortDescription;
    if (fields.price !== undefined) updatePayload.price = fields.price;
    if (fields.comparePrice !== undefined) updatePayload.compare_price = fields.comparePrice;
    if (fields.cost !== undefined) updatePayload.cost = fields.cost;
    if (fields.sku !== undefined) updatePayload.sku = fields.sku;
    if (fields.categoryId !== undefined) updatePayload.category_id = fields.categoryId;
    if (fields.stock !== undefined) updatePayload.stock = fields.stock;
    if (fields.hasVariants !== undefined) updatePayload.has_variants = fields.hasVariants;
    if (fields.isService !== undefined) updatePayload.is_service = fields.isService;
    if (fields.isFeatured !== undefined) updatePayload.is_featured = fields.isFeatured;
    if (fields.isActive !== undefined) updatePayload.is_active = fields.isActive;
    if (fields.enableSwatches !== undefined) updatePayload.enable_swatches = fields.enableSwatches;
    if (fields.showSwatchesOnArchive !== undefined) updatePayload.show_swatches_on_archive = fields.showSwatchesOnArchive;
    if (fields.customBadgeId !== undefined) updatePayload.custom_badge_id = fields.customBadgeId || null;
    if (fields.badgeEnabled !== undefined) updatePayload.badge_enabled = fields.badgeEnabled;
    if (fields.sizeGuideId !== undefined) updatePayload.size_guide_id = fields.sizeGuideId || null;
    if (fields.frequentlyBoughtTogetherIds !== undefined) updatePayload.frequently_bought_together_ids = fields.frequentlyBoughtTogetherIds;
    if (fields.flashSaleEnabled !== undefined) updatePayload.flash_sale_enabled = fields.flashSaleEnabled;
    if (fields.flashSaleStartDate !== undefined) updatePayload.flash_sale_start_date = fields.flashSaleStartDate || null;
    if (fields.flashSaleEndDate !== undefined) updatePayload.flash_sale_end_date = fields.flashSaleEndDate || null;
    if (fields.flashSaleDiscountType !== undefined) updatePayload.flash_sale_discount_type = fields.flashSaleDiscountType;
    if (fields.flashSaleDiscountValue !== undefined) updatePayload.flash_sale_discount_value = fields.flashSaleDiscountValue;
    if (fields.tags !== undefined) updatePayload.tags = fields.tags;
    if (fields.rating !== undefined) updatePayload.rating = fields.rating;
    if (fields.reviewsCount !== undefined) updatePayload.reviews_count = fields.reviewsCount;
    if (fields.inventoryThreshold !== undefined) updatePayload.inventory_threshold = fields.inventoryThreshold;
    if (fields.sortOrder !== undefined) updatePayload.sort_order = fields.sortOrder;

    // Get product slug to revalidate properly
    const { data: prodData } = await supabase
      .from('products')
      .select('slug')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;

    // Sync multi category relations if provided — always include "shop" system category
    if (fields.productCategories !== undefined || fields.categoryId !== undefined) {
      let categoryIdsToUpdate = fields.productCategories?.map(pc => pc.categoryId) || [];
      if (categoryIdsToUpdate.length === 0 && fields.categoryId) {
        categoryIdsToUpdate.push(fields.categoryId);
      }
      if (!categoryIdsToUpdate.includes('00000000-0000-4000-8000-000000000099')) {
        categoryIdsToUpdate.push('00000000-0000-4000-8000-000000000099');
      }

      const { error: pcDelError } = await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', id);
      if (pcDelError) throw pcDelError;

      if (categoryIdsToUpdate.length > 0) {
        const { error: pcInsError } = await supabase
          .from('product_categories')
          .insert(categoryIdsToUpdate.map(categoryId => ({
            product_id: id,
            category_id: categoryId
          })));
        if (pcInsError) throw pcInsError;
      }
    }

    if (prodData?.slug) {
      try {
        await revalidateProduct(prodData.slug);
      } catch (revalErr) {
        console.error('[products] revalidateProduct failed during updateProductFields:', revalErr);
      }
    } else {
      (revalidateTag as any)('products');
    }
  } catch (error) {
    console.error('[products] updateProductFields failed:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const supabase = staticSupabase;

    // Get product slug to revalidate properly
    const { data: prodData } = await supabase
      .from('products')
      .select('slug')
      .eq('id', id)
      .single();

    // Soft delete product by setting deleted_at = NOW()
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    if (prodData?.slug) {
      try {
        await revalidateProduct(prodData.slug);
      } catch (revalErr) {
        console.error('[products] revalidateProduct failed during deleteProduct:', revalErr);
      }
    } else {
      (revalidateTag as any)('products');
    }

    // Fire Meta DELETE sync as a safety net (non-blocking)
    // The webhook will also handle this, but this ensures it happens even if webhook fails
    try {
      const { syncProductToMeta } = await import('@/lib/meta/syncProduct');
      // Get full product data including variants for Meta sync
      const fullProduct = await getProductById(id);
      if (fullProduct) {
        syncProductToMeta(fullProduct, 'DELETE').catch((metaErr: any) => {
          console.warn('[products] Meta DELETE sync failed for product:', id, metaErr?.message);
        });
      }
    } catch {
      // Non-blocking
    }
  } catch (error) {
    console.error('[products] deleteProduct failed:', error);
    throw error;
  }
};

export const getDeletedProducts = async (): Promise<Product[]> => {
  try {
    const supabase = staticSupabase;
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*), product_modifiers(*), categories!category_id(*), product_categories(*, categories(*)), badges(*), size_guides(*)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapProduct);
  } catch (error) {
    console.error('[products] getDeletedProducts failed:', error);
    throw error;
  }
};

export const restoreProduct = async (id: string): Promise<void> => {
  try {
    const supabase = staticSupabase;

    // Get product slug to revalidate properly
    const { data: prodData } = await supabase
      .from('products')
      .select('slug')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('products')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;

    if (prodData?.slug) {
      try {
        await revalidateProduct(prodData.slug);
      } catch (revalErr) {
        console.error('[products] revalidateProduct failed during restoreProduct:', revalErr);
      }
    }
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[products] restoreProduct failed:', error);
    throw error;
  }
};

export const hardDeleteProduct = async (id: string): Promise<void> => {
  try {
    const supabase = staticSupabase;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[products] hardDeleteProduct failed:', error);
    throw error;
  }
};

export const getProductsByCategoryId = async (categoryId: string): Promise<Product[]> => {
  try {
    const supabase = staticSupabase;

    // First, get product IDs from the junction table
    const { data: junctionData, error: junctionError } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', categoryId);

    if (junctionError) throw junctionError;
    const junctionProductIds = (junctionData ?? []).map(row => row.product_id);

    // Query products that match the legacy category_id or are in the junction table
    let query = supabase
      .from('products')
      .select('*, product_images(*), product_variants(*), product_modifiers(*), categories!category_id(*), product_categories(*, categories(*)), badges(*), size_guides(*)')
      .is('deleted_at', null)
      .eq('is_active', true);

    if (junctionProductIds.length > 0) {
      query = query.or(`category_id.eq.${categoryId},id.in.(${junctionProductIds.join(',')})`);
    } else {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map(mapProduct);
  } catch (error) {
    console.error('[products] getProductsByCategoryId failed:', error);
    throw error;
  }
};

export const updateProductVariantFields = async (
  variantId: string,
  fields: Partial<ProductVariant>
): Promise<void> => {
  try {
    const supabase = staticSupabase;
    const updatePayload: Record<string, any> = {};
    if (fields.stock !== undefined) updatePayload.stock = fields.stock;
    if (fields.price !== undefined) updatePayload.price = fields.price;
    if (fields.comparePrice !== undefined) updatePayload.compare_price = fields.comparePrice;
    if (fields.inventoryThreshold !== undefined) updatePayload.inventory_threshold = fields.inventoryThreshold;
    if (fields.sku !== undefined) updatePayload.sku = fields.sku;
    if (fields.active !== undefined) updatePayload.active = fields.active;

    // Get product ID to revalidate
    const { data: varData } = await supabase
      .from('product_variants')
      .select('product_id')
      .eq('id', variantId)
      .single();

    const { error } = await supabase
      .from('product_variants')
      .update(updatePayload)
      .eq('id', variantId);

    if (error) throw error;

    if (varData?.product_id) {
      const { data: prodData } = await supabase
        .from('products')
        .select('slug')
        .eq('id', varData.product_id)
        .single();

      if (prodData?.slug) {
        try {
          await revalidateProduct(prodData.slug);
        } catch (revalErr) {
          console.error('[products] revalidateProduct failed during updateProductVariantFields:', revalErr);
        }
      }
    }
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[products] updateProductVariantFields failed:', error);
    throw error;
  }
};

export const updateProductCategoryRelationFields = async (
  productId: string,
  categoryId: string,
  _fields: Record<string, never>
): Promise<void> => {
  // No-op after schema simplification — product_categories has no more per-relation fields
  return;
};

export const addProductToCategory = async (
  productId: string,
  categoryId: string
): Promise<void> => {
  try {
    const supabase = staticSupabase;

    // Insert relationship
    const { error: relError } = await supabase
      .from('product_categories')
      .insert({
        product_id: productId,
        category_id: categoryId
      });

    if (relError) throw relError;

    // Fetch product to update primary category_id if it's currently null
    const { data: prodData } = await supabase
      .from('products')
      .select('slug, category_id')
      .eq('id', productId)
      .single();

    if (prodData && !prodData.category_id) {
      await supabase
        .from('products')
        .update({ category_id: categoryId })
        .eq('id', productId);
    }

    if (prodData?.slug) {
      try {
        await revalidateProduct(prodData.slug);
      } catch (revalErr) {
        console.error('[products] revalidateProduct failed during addProductToCategory:', revalErr);
      }
    }
    (revalidateTag as any)('products');
    (revalidateTag as any)('categories');
  } catch (error) {
    console.error('[products] addProductToCategory failed:', error);
    throw error;
  }
};

export const addProductsToCategory = async (
  productIds: string[],
  categoryId: string
): Promise<void> => {
  try {
    const supabase = staticSupabase;

    // Prepare relationships
    const inserts = productIds.map(productId => ({
      product_id: productId,
      category_id: categoryId
    }));

    const { error: relError } = await supabase
      .from('product_categories')
      .insert(inserts);

    if (relError) throw relError;

    // Fetch product details for slugs and primary category check
    const { data: prodData } = await supabase
      .from('products')
      .select('id, slug, category_id')
      .in('id', productIds);

    if (prodData && prodData.length > 0) {
      // Find products whose category_id is null
      const nullCatProdIds = prodData.filter(p => !p.category_id).map(p => p.id);
      if (nullCatProdIds.length > 0) {
        await supabase
          .from('products')
          .update({ category_id: categoryId })
          .in('id', nullCatProdIds);
      }

      // Revalidate all products in parallel
      const revalidatePromises = prodData
        .filter((prod) => prod.slug)
        .map((prod) =>
          revalidateProduct(prod.slug!).catch((e) =>
            console.error(`[products] revalidateProduct failed for ${prod.slug}:`, e)
          )
        );
      await Promise.allSettled(revalidatePromises);
    }

    (revalidateTag as any)('products');
    (revalidateTag as any)('categories');
  } catch (error) {
    console.error('[products] addProductsToCategory failed:', error);
    throw error;
  }
};

export const removeProductFromCategory = async (
  productId: string,
  categoryId: string
): Promise<void> => {
  try {
    // Never allow removing from the "shop" system category
    if (categoryId === '00000000-0000-4000-8000-000000000099') return;

    const supabase = staticSupabase;

    // Delete relation from junction table
    const { error: relError } = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', productId)
      .eq('category_id', categoryId);

    if (relError) throw relError;

    // Fetch product to update legacy category_id if it references this category
    const { data: prodData } = await supabase
      .from('products')
      .select('slug, category_id')
      .eq('id', productId)
      .single();

    if (prodData && prodData.category_id === categoryId) {
      // Find another category assigned to this product to set as primary
      const { data: otherCats } = await supabase
        .from('product_categories')
        .select('category_id')
        .eq('product_id', productId)
        .limit(1);

      const nextCatId = otherCats?.[0]?.category_id || null;

      await supabase
        .from('products')
        .update({ category_id: nextCatId })
        .eq('id', productId);
    }

    if (prodData?.slug) {
      try {
        await revalidateProduct(prodData.slug);
      } catch (revalErr) {
        console.error('[products] revalidateProduct failed during removeProductFromCategory:', revalErr);
      }
    }
    (revalidateTag as any)('products');
    (revalidateTag as any)('categories');
  } catch (error) {
    console.error('[products] removeProductFromCategory failed:', error);
    throw error;
  }
};

export const removeProductsFromCategory = async (
  productIds: string[],
  categoryId: string
): Promise<void> => {
  try {
    if (categoryId === '00000000-0000-4000-8000-000000000099') return;
    if (!productIds || productIds.length === 0) return;

    const supabase = staticSupabase;

    // 1. Delete relations
    const { error: relError } = await supabase
      .from('product_categories')
      .delete()
      .eq('category_id', categoryId)
      .in('product_id', productIds);

    if (relError) throw relError;

    // 2. Fetch products that had this category as primary
    const { data: prodData } = await supabase
      .from('products')
      .select('id, slug, category_id')
      .in('id', productIds);

    if (prodData && prodData.length > 0) {
      const primaryCatProdIds = prodData.filter(p => p.category_id === categoryId).map(p => p.id);

      // We don't try to find the next category in bulk as it's complex and usually negligible.
      // We'll just set it to null. Product will still be associated with other categories via junction table.
      if (primaryCatProdIds.length > 0) {
        await supabase
          .from('products')
          .update({ category_id: null })
          .in('id', primaryCatProdIds);
      }

      // Revalidate in background to not block the UI
      const revalidatePromises = prodData
        .filter(prod => prod.slug)
        .map(prod =>
          revalidateProduct(prod.slug!).catch(e =>
            console.error(`[products] revalidateProduct failed for ${prod.slug}:`, e)
          )
        );
      
      // Fire and forget - do not await the Promise.allSettled so the UI returns instantly
      Promise.allSettled(revalidatePromises).catch(console.error);
    }

    (revalidateTag as any)('products');
    (revalidateTag as any)('categories');
  } catch (error) {
    console.error('[products] removeProductsFromCategory failed:', error);
    throw error;
  }
};

export const updateProductSortOrders = async (productIds: string[]): Promise<void> => {
  if (!productIds || productIds.length === 0) return;
  try {
    await Promise.all(
      productIds.map((id, idx) =>
        supabaseAdmin
          .from('products')
          .update({ sort_order: idx + 1 })
          .eq('id', id)
      )
    );
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[products] updateProductSortOrders failed:', error);
    throw error;
  }
};

// ============================================================================
// SAFE ACTION WRAPPERS (Prevent Next.js Production Error Masking)
// ============================================================================
import { safeAction } from '@/lib/utils/serverAction';

export const createProductSafe = async (
  productPayload: any,
  images: any[],
  variants: any[],
  modifiers: any[]
) => safeAction(createProduct(productPayload, images, variants, modifiers));

export const updateProductSafe = async (
  productId: string,
  productPayload: any,
  images: any[],
  variants: any[],
  modifiers: any[]
) => safeAction(updateProduct(productId, productPayload, images, variants, modifiers));
