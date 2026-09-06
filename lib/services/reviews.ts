'use server';

import { createClient } from '@/lib/supabase/server';
import { Review } from '@/lib/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const staticSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } });

interface DBReview {
  id: string;
  product_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  rating: number;
  comment?: string | null;
  approved: boolean;
  hidden: boolean;
  is_manual?: boolean;
  screenshot_url?: string | null;
  images?: string[] | null;
  deleted_at?: string | null;
  created_at: string;
}

const mapReview = (row: DBReview): Review => ({
  id: row.id,
  productId: row.product_id ?? undefined,
  customerName: row.customer_name,
  customerPhone: row.customer_phone || undefined,
  customerEmail: row.customer_email || undefined,
  contact: row.customer_email || row.customer_phone || undefined,
  rating: row.rating,
  comment: row.comment || undefined,
  approved: row.approved ?? false,
  hidden: row.hidden ?? false,
  isManual: row.is_manual ?? false,
  screenshotUrl: row.screenshot_url || undefined,
  images: Array.isArray(row.images) ? row.images.filter(Boolean) : (row.screenshot_url ? [row.screenshot_url] : []),
  deletedAt: row.deleted_at || undefined,
  createdAt: row.created_at
});

// 1. Fetch approved reviews for a product (public)
const fetchProductReviews = async (productId: string): Promise<Review[]> => {
  try {
    const { data, error } = await staticSupabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('approved', true)
      .eq('hidden', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapReview);
  } catch (error) {
    console.error('[reviews] fetchProductReviews failed, returning empty fallback list:', error);
    return [];
  }
};

const cachedProductReviews = (productId: string) => unstable_cache(
  async () => fetchProductReviews(productId),
  [`product-reviews-list-${productId}`],
  { revalidate: 86400, tags: [`reviews-${productId}`, 'reviews'] }
)();

export const getProductReviews = async (productId: string): Promise<Review[]> => {
  return cachedProductReviews(productId);
};

// 2. Fetch all reviews (admin)
export const getAllReviews = async (): Promise<(Review & { productName?: string; productImage?: string; productSlug?: string })[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const reviews = (data ?? []).map((row: any) => mapReview(row));

    // Batch fetch product names, slugs, and images
    const productIds = reviews.map(r => r.productId).filter(Boolean) as string[];
    if (productIds.length > 0) {
      const [productResult, imageResult] = await Promise.all([
        supabaseAdmin.from('products').select('id, name, slug').in('id', productIds),
        supabaseAdmin.from('product_images').select('product_id, url, is_primary').in('product_id', productIds),
      ]);
      const productMap: Record<string, { name: string; slug: string }> = {};
      if (productResult.data) {
        for (const p of productResult.data) {
          productMap[p.id] = { name: p.name, slug: p.slug };
        }
      }
      const imageMap: Record<string, string> = {};
      if (imageResult.data) {
        for (const img of imageResult.data) {
          if (!imageMap[img.product_id] || img.is_primary) {
            imageMap[img.product_id] = img.url;
          }
        }
      }
      return reviews.map(r => ({
        ...r,
        productName: r.productId ? productMap[r.productId]?.name : undefined,
        productSlug: r.productId ? productMap[r.productId]?.slug : undefined,
        productImage: r.productId ? imageMap[r.productId] : undefined,
      }));
    }

    return reviews as any;
  } catch (error) {
    console.error('[reviews] getAllReviews failed:', error);
    throw error;
  }
};

// 3. Submit a review (public, defaults to approved=false)
export const submitReview = async (review: {
  productId: string;
  customerName: string;
  contact?: string;
  customerPhone?: string;
  customerEmail?: string;
  rating: number;
  comment?: string;
  images?: string[];
}): Promise<Review> => {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to submit review');
      }
      const data = await res.json();
      return data.review;
    }

    const rawContact = (review.contact || review.customerEmail || review.customerPhone || '').trim();
    const isEmail = rawContact.includes('@');
    const customerPhone = !isEmail && rawContact ? rawContact : (review.customerPhone || null);
    const customerEmail = isEmail ? rawContact : (review.customerEmail || null);

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        product_id: review.productId,
        customer_name: review.customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        rating: review.rating,
        comment: review.comment || null,
        images: Array.isArray(review.images) ? review.images.filter(Boolean) : [],
        approved: false
      })
      .select('*')
      .single();

    if (error) throw error;
    
    // Revalidate reviews caches
    (revalidateTag as any)('reviews');
    (revalidateTag as any)('products');
    
    const savedReview = mapReview(data);

    // Await the email dispatch so the serverless function does not exit/freeze before delivery completes
    try {
      const { getProductById } = await import('@/lib/services/products');
      const product = await getProductById(review.productId);
      if (product) {
        const { onNewReview } = await import('@/lib/email/triggers');
        await onNewReview(savedReview, product);
      }
    } catch (err) {
      console.error('[Email Trigger] failed in submitReview trigger:', err);
    }
    
    return savedReview;
  } catch (error) {
    console.error('[reviews] submitReview failed:', error);
    throw error;
  }
};

// 4. Approve / Disapprove a review (admin)
export const approveReview = async (id: string, approved: boolean = true): Promise<Review> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviews')
      .update({ approved, hidden: false })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    
    (revalidateTag as any)('reviews');
    (revalidateTag as any)('products');
    return mapReview(data);
  } catch (error) {
    console.error('[reviews] approveReview failed:', error);
    throw error;
  }
};

// 8. Hide / Show an approved review (admin)
export const hideShowReview = async (id: string, hidden: boolean): Promise<Review> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviews')
      .update({ hidden })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    
    (revalidateTag as any)('reviews');
    (revalidateTag as any)('products');
    return mapReview(data);
  } catch (error) {
    console.error('[reviews] hideShowReview failed:', error);
    throw error;
  }
};

// 5. Delete a review (admin)
export const deleteReview = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('reviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    
    (revalidateTag as any)('reviews');
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[reviews] deleteReview failed:', error);
    throw error;
  }
};

// Delete a single review photo (moves photo into Trash without deleting review)
export const deleteSingleReviewPhoto = async (reviewId: string, photoUrl: string): Promise<void> => {
  try {
    const { data: review, error: fetchErr } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchErr || !review) throw new Error('Review not found');

    const currentImages: string[] = Array.isArray(review.images) ? review.images : [];
    const updatedImages = currentImages.filter(u => u !== photoUrl);
    const updatedScreenshotUrl = review.screenshot_url === photoUrl ? null : review.screenshot_url;

    await supabaseAdmin
      .from('reviews')
      .update({
        images: updatedImages,
        screenshot_url: updatedScreenshotUrl
      })
      .eq('id', reviewId);

    // Insert record into media_library with deleted_at set to NOW so it appears in Trash Bin -> Media tab
    await supabaseAdmin
      .from('media_library')
      .insert({
        file_url: photoUrl,
        original_filename: `Review Photo (${review.customer_name})`,
        title: `Customer Review Photo`,
        alt_text: `Review photo by ${review.customer_name}`,
        bucket: 'product-images',
        file_size: 18400, // ~18 KB WebP average
        mime_type: 'image/webp',
        review_id: reviewId,
        deleted_at: new Date().toISOString()
      });

    (revalidateTag as any)('reviews');
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[reviews] deleteSingleReviewPhoto failed:', error);
    throw error;
  }
};

// 6. Get average rating and count for a product
const fetchAverageRating = async (productId: string): Promise<{ average: number; count: number }> => {
  try {
    const { data, error } = await staticSupabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('approved', true)
      .eq('hidden', false)
      .is('deleted_at', null);

    if (error) throw error;

    const count = data?.length ?? 0;
    if (count === 0) {
      return { average: 0, count: 0 };
    }

    const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
    const average = Math.round((sum / count) * 10) / 10; // Round to 1 decimal place

    return { average, count };
  } catch (error) {
    console.error('[reviews] fetchAverageRating failed, returning zero ratings fallback:', error);
    return { average: 0, count: 0 };
  }
};

const cachedAverageRating = (productId: string) => unstable_cache(
  async () => fetchAverageRating(productId),
  [`product-average-rating-${productId}`],
  { revalidate: 86400, tags: [`reviews-${productId}`, 'reviews'] }
)();

export const getAverageRating = async (productId: string): Promise<{ average: number; count: number }> => {
  return cachedAverageRating(productId);
};

// 7. Fetch top approved reviews for landing page grid
const fetchTopReviews = async (limit: number = 8): Promise<(Review & { productName?: string; productSlug?: string })[]> => {
  try {
    const { data, error } = await staticSupabase
      .from('reviews')
      .select('*')
      .eq('approved', true)
      .eq('hidden', false)
      .gte('rating', 4)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    const reviews = (data ?? []).map((row: any) => mapReview(row));

    const productIds = reviews.map(r => r.productId).filter(Boolean) as string[];
    if (productIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, name, slug')
        .in('id', productIds);
      const productMap: Record<string, { name: string; slug: string }> = {};
      if (products) {
        for (const p of products) {
          productMap[p.id] = { name: p.name, slug: p.slug };
        }
      }
      return reviews.map(r => ({
        ...r,
        productName: r.productId ? productMap[r.productId]?.name : undefined,
        productSlug: r.productId ? productMap[r.productId]?.slug : undefined,
      }));
    }

    return reviews as any;
  } catch (error) {
    console.error('[reviews] fetchTopReviews failed, returning empty fallback list:', error);
    return [];
  }
};

const cachedTopReviews = unstable_cache(
  async (limit: number) => fetchTopReviews(limit),
  ['top-reviews-list'],
  { revalidate: 86400, tags: ['reviews'] }
);

export const getTopReviews = async (limit: number = 8): Promise<(Review & { productName?: string; productSlug?: string })[]> => {
  return cachedTopReviews(limit);
};

export const getDeletedReviews = async (): Promise<(Review & { productName?: string })[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    const reviews = (data ?? []).map((row: any) => mapReview(row));

    const productIds = reviews.map(r => r.productId).filter(Boolean) as string[];
    if (productIds.length > 0) {
      const [productResult, imageResult] = await Promise.all([
        supabaseAdmin.from('products').select('id, name').in('id', productIds),
        supabaseAdmin.from('product_images').select('product_id, url, is_primary').in('product_id', productIds),
      ]);
      const productMap: Record<string, { name: string }> = {};
      if (productResult.data) {
        for (const p of productResult.data) {
          productMap[p.id] = { name: p.name };
        }
      }
      const imageMap: Record<string, string> = {};
      if (imageResult.data) {
        for (const img of imageResult.data) {
          if (!imageMap[img.product_id] || img.is_primary) {
            imageMap[img.product_id] = img.url;
          }
        }
      }
      return reviews.map(r => ({
        ...r,
        productName: r.productId ? productMap[r.productId]?.name : undefined,
        productImage: r.productId ? imageMap[r.productId] : undefined,
      }));
    }

    return reviews as any;
  } catch (error) {
    console.error('[reviews] getDeletedReviews failed:', error);
    throw error;
  }
};

export const restoreReview = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('reviews')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;

    (revalidateTag as any)('reviews');
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[reviews] restoreReview failed:', error);
    throw error;
  }
};

export const hardDeleteReview = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;

    (revalidateTag as any)('reviews');
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[reviews] hardDeleteReview failed:', error);
    throw error;
  }
};

// 9. Fetch global reviews for the /reviews storefront page
export interface GlobalReviewFilters {
  search?: string;
  rating?: number;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
  page?: number;
  limit?: number;
}

export const getGlobalReviews = async (filters: GlobalReviewFilters = {}): Promise<{
  reviews: (Review & { productName?: string; productImage?: string; productSlug?: string })[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 50);
  const offset = (page - 1) * limit;

  try {
    let searchProductIds: string[] | undefined;
    if (filters.search?.trim()) {
      const { data: matchedProducts } = await supabaseAdmin
        .from('products')
        .select('id')
        .ilike('name', `%${filters.search.trim()}%`);
      searchProductIds = (matchedProducts ?? []).map(p => p.id);
    }

    let query = supabaseAdmin
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('approved', true)
      .eq('hidden', false)
      .is('deleted_at', null);

    if (filters.search?.trim()) {
      if (searchProductIds && searchProductIds.length > 0) {
        query = query.in('product_id', searchProductIds);
      } else {
        return { reviews: [], total: 0, page, totalPages: 0 };
      }
    }

    if (filters.rating && filters.rating > 0) {
      query = query.eq('rating', filters.rating);
    }

    switch (filters.sort) {
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      case 'highest': query = query.order('rating', { ascending: false }).order('created_at', { ascending: false }); break;
      case 'lowest': query = query.order('rating', { ascending: true }).order('created_at', { ascending: false }); break;
      default: query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    const reviews = (data ?? []).map((row: any) => mapReview(row));

    // Batch fetch product names, slugs, and images
    const productIds = reviews.map(r => r.productId).filter(Boolean) as string[];
    if (productIds.length > 0) {
      const [productResult, imageResult] = await Promise.all([
        supabaseAdmin.from('products').select('id, name, slug').in('id', productIds),
        supabaseAdmin.from('product_images').select('product_id, url, is_primary').in('product_id', productIds),
      ]);
      const productMap: Record<string, { name: string; slug: string }> = {};
      if (productResult.data) {
        for (const p of productResult.data) {
          productMap[p.id] = { name: p.name, slug: p.slug };
        }
      }
      const imageMap: Record<string, string> = {};
      if (imageResult.data) {
        for (const img of imageResult.data) {
          if (!imageMap[img.product_id] || img.is_primary) {
            imageMap[img.product_id] = img.url;
          }
        }
      }
      return {
        reviews: reviews.map(r => ({
          ...r,
          productName: r.productId ? productMap[r.productId]?.name : undefined,
          productSlug: r.productId ? productMap[r.productId]?.slug : undefined,
          productImage: r.productId ? imageMap[r.productId] : undefined,
        })),
        total: count ?? 0,
        page,
        totalPages: Math.ceil((count ?? 0) / limit)
      };
    }

    return {
      reviews: reviews as any,
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit)
    };
  } catch (error) {
    console.error('[reviews] getGlobalReviews failed:', error);
    return { reviews: [], total: 0, page, totalPages: 0 };
  }
};

// 10. Submit an admin custom review (with optional screenshot)
export const submitAdminCustomReview = async (review: {
  productId?: string | null;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  rating: number;
  comment?: string;
  screenshotUrl?: string;
}): Promise<Review> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        product_id: review.productId || null,
        customer_name: review.customerName,
        customer_phone: review.customerPhone || null,
        customer_email: review.customerEmail || null,
        rating: review.rating,
        comment: review.comment || null,
        screenshot_url: review.screenshotUrl || null,
        is_manual: true,
        approved: true
      })
      .select('*')
      .single();

    if (error) throw error;

    (revalidateTag as any)('reviews');
    (revalidateTag as any)('products');

    return mapReview(data);
  } catch (error) {
    console.error('[reviews] submitAdminCustomReview failed:', error);
    throw error;
  }
};
