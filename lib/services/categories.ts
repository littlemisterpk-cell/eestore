'use server';

import { createClient } from '@/lib/supabase/server';
import { Category } from '@/lib/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidateCategory } from '@/lib/revalidate';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const staticSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } });


interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
  active_sort_preference?: string | null;
  vertical_id?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Map database row to Category interface
const mapCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description || undefined,
  imageUrl: row.image_url || undefined,
  sortOrder: row.sort_order || 0,
  active: row.active ?? true,
  activeSortPreference: row.active_sort_preference || undefined,
  deletedAt: row.deleted_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});
const fetchCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await staticSupabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapCategory);
  } catch (error) {
    // Fallback: if vertical scoping is unavailable (pre-migration), fetch unfiltered
    try {
      const { data, error } = await staticSupabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapCategory);
    } catch (fallbackError) {
      console.error('[categories] fetchCategories failed, returning empty fallback list:', error);
      return [];
    }
  }
};

const cachedCategories = unstable_cache(
  async () => fetchCategories(),
  ['categories-list'],
  { tags: ['categories'] }
);

export const getCategories = async () => {
  return cachedCategories();
};

const fetchCategoryBySlug = async (slug: string): Promise<Category | null> => {
  const { data, error } = await staticSupabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data ? mapCategory(data) : null;
};

const cachedCategoryBySlug = (slug: string) => unstable_cache(
  async () => fetchCategoryBySlug(slug),
  [`category-by-slug-${slug}`],
  { revalidate: 86400, tags: [`category-${slug}`, 'categories'] }
)();

export const getCategoryBySlug = async (slug: string) => {
  return cachedCategoryBySlug(slug);
};

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const supabase = staticSupabase;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapCategory);
  } catch (error) {
    console.error('[categories] getAllCategories failed, returning fallback list:', error);
    return [];
  }
};

export const createCategory = async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
  try {
    const supabase = staticSupabase;
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        slug: category.slug,
        description: category.description,
        image_url: category.imageUrl,
        sort_order: category.sortOrder,
        active: category.active
      })
      .select('*')
      .single();

    if (error) throw error;
    const mapped = mapCategory(data);
    try {
      await revalidateCategory(mapped.slug);
    } catch (revalErr) {
      console.error('[categories] revalidateCategory failed in create:', revalErr);
    }
    return mapped;
  } catch (error) {
    console.error('[categories] createCategory failed:', error);
    throw error;
  }
};

export const updateCategory = async (id: string, category: Partial<Category>): Promise<Category> => {
  try {
    const supabase = staticSupabase;
    const updatePayload: Record<string, string | number | boolean | null | undefined> = {};
    if (category.name !== undefined) updatePayload.name = category.name;
    if (category.slug !== undefined) updatePayload.slug = category.slug;
    if (category.description !== undefined) updatePayload.description = category.description;
    if (category.imageUrl !== undefined) updatePayload.image_url = category.imageUrl;
    if (category.sortOrder !== undefined) updatePayload.sort_order = category.sortOrder;
    if (category.active !== undefined) updatePayload.active = category.active;
    if (category.activeSortPreference !== undefined) updatePayload.active_sort_preference = category.activeSortPreference;

    const { data, error } = await supabase
      .from('categories')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    const mapped = mapCategory(data);
    try {
      await revalidateCategory(mapped.slug);
    } catch (revalErr) {
      console.error('[categories] revalidateCategory failed in update:', revalErr);
    }
    return mapped;
  } catch (error) {
    console.error('[categories] updateCategory failed:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    // Never allow deleting the system "shop" category
    if (id === '00000000-0000-4000-8000-000000000099') {
      throw new Error('The system "All Products" category cannot be deleted.');
    }

    const supabase = staticSupabase;
    const { data: catData } = await supabase
      .from('categories')
      .select('slug')
      .eq('id', id)
      .single();

    // Soft delete category by setting deleted_at = NOW()
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    
    if (catData?.slug) {
      try {
        await revalidateCategory(catData.slug);
      } catch (revalErr) {
        console.error('[categories] revalidateCategory failed in delete:', revalErr);
      }
    } else {
      (revalidateTag as any)('categories');
    }
  } catch (error) {
    console.error('[categories] deleteCategory failed:', error);
    throw error;
  }
};

export const getDeletedCategories = async (): Promise<Category[]> => {
  try {
    const supabase = staticSupabase;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapCategory);
  } catch (error) {
    console.error('[categories] getDeletedCategories failed:', error);
    throw error;
  }
};

export const restoreCategory = async (id: string): Promise<void> => {
  try {
    const supabase = staticSupabase;
    
    const { data: catData } = await supabase
      .from('categories')
      .select('slug')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;

    if (catData?.slug) {
      try {
        await revalidateCategory(catData.slug);
      } catch (revalErr) {
        console.error('[categories] revalidateCategory failed in restoreCategory:', revalErr);
      }
    }
    (revalidateTag as any)('categories');
  } catch (error) {
    console.error('[categories] restoreCategory failed:', error);
    throw error;
  }
};

export const hardDeleteCategory = async (id: string): Promise<void> => {
  try {
    const supabase = staticSupabase;
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    (revalidateTag as any)('categories');
  } catch (error) {
    console.error('[categories] hardDeleteCategory failed:', error);
    throw error;
  }
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const supabase = staticSupabase;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCategory(data) : null;
  } catch (error) {
    console.error('[categories] getCategoryById failed:', error);
    throw error;
  }
};


// ============================================================================
// SAFE ACTION WRAPPERS (Prevent Next.js Production Error Masking)
// ============================================================================
import { safeAction } from '@/lib/utils/serverAction';

export const createCategorySafe = async (...args: Parameters<typeof createCategory>) => safeAction(createCategory(...args));
export const updateCategorySafe = async (...args: Parameters<typeof updateCategory>) => safeAction(updateCategory(...args));
export const deleteCategorySafe = async (...args: Parameters<typeof deleteCategory>) => safeAction(deleteCategory(...args));
