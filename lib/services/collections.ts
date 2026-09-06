'use server';

import { createClient } from '@/lib/supabase/server';
import { Collection, Category } from '@/lib/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const staticSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } });

export const fetchCollections = async (): Promise<Collection[]> => {
  try {
    const { data, error } = await staticSupabase
      .from('collections')
      .select(`
        *,
        collection_categories (
          sort_order,
          categories (*)
        )
      `)
      .eq('active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => {
      // Map collection categories, sort them, and map to Category array
      const mappedCategories = (row.collection_categories || [])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((cc: any) => {
          const c = cc.categories;
          if (!c) return null;
          return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description || undefined,
            imageUrl: c.image_url || undefined,
            sortOrder: cc.sort_order || 0, // We use the collection_categories sortOrder here for the collection context
            active: c.active ?? true,
            activeSortPreference: c.active_sort_preference || undefined,
            deletedAt: c.deleted_at || undefined,
            createdAt: c.created_at,
            updatedAt: c.updated_at
          } as Category;
        })
        .filter(Boolean);

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description || undefined,
        imageUrl: row.image_url || undefined,
        sortOrder: row.sort_order || 0,
        active: row.active ?? true,
        deletedAt: row.deleted_at || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        categories: mappedCategories
      } as Collection;
    });
  } catch (error) {
    console.error('[collections] fetchCollections failed:', error);
    return [];
  }
};

const cachedCollections = unstable_cache(
  async () => fetchCollections(),
  ['collections-list'],
  { tags: ['collections', 'categories'] }
);

export const getCollections = async () => {
  return cachedCollections();
};

export const fetchCollectionBySlug = async (slug: string): Promise<Collection | null> => {
  const collections = await getCollections();
  return collections.find(c => c.slug === slug) || null;
};

// CRUD Operations
export const createCollection = async (collection: { name: string; slug: string; description?: string; imageUrl?: string; sortOrder?: number; active?: boolean }): Promise<Collection> => {
  const supabase = staticSupabase;
  const { data, error } = await supabase
    .from('collections')
    .insert({
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      image_url: collection.imageUrl,
      sort_order: collection.sortOrder ?? 0,
      active: collection.active ?? true
    })
    .select('*')
    .single();

  if (error) throw error;
  (revalidateTag as any)('collections');
  return data;
};

export const updateCollection = async (id: string, collection: { name?: string; slug?: string; description?: string; imageUrl?: string; sortOrder?: number; active?: boolean }): Promise<Collection> => {
  const supabase = staticSupabase;
  
  const updatePayload: any = {};
  if (collection.name !== undefined) updatePayload.name = collection.name;
  if (collection.slug !== undefined) updatePayload.slug = collection.slug;
  if (collection.description !== undefined) updatePayload.description = collection.description;
  if (collection.imageUrl !== undefined) updatePayload.image_url = collection.imageUrl;
  if (collection.sortOrder !== undefined) updatePayload.sort_order = collection.sortOrder;
  if (collection.active !== undefined) updatePayload.active = collection.active;

  const { data, error } = await supabase
    .from('collections')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  (revalidateTag as any)('collections');
  return data;
};

export const deleteCollection = async (id: string): Promise<void> => {
  const supabase = staticSupabase;
  const { error } = await supabase
    .from('collections')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  (revalidateTag as any)('collections');
};

// Assignment Operations
export const assignCategoryToCollection = async (collectionId: string, categoryId: string, sortOrder: number = 0): Promise<void> => {
  const supabase = staticSupabase;
  const { error } = await supabase
    .from('collection_categories')
    .insert({ collection_id: collectionId, category_id: categoryId, sort_order: sortOrder })
    .select();

  if (error) {
    if (error.code !== '23505') { // Ignore unique constraint violations (already assigned)
      throw error;
    }
  }
  (revalidateTag as any)('collections');
};

export const removeCategoryFromCollection = async (collectionId: string, categoryId: string): Promise<void> => {
  const supabase = staticSupabase;
  const { error } = await supabase
    .from('collection_categories')
    .delete()
    .eq('collection_id', collectionId)
    .eq('category_id', categoryId);

  if (error) throw error;
  (revalidateTag as any)('collections');
};

export const reorderCollectionCategories = async (collectionId: string, categoryIds: string[]): Promise<void> => {
  const supabase = staticSupabase;
  // Bulk update sort orders
  for (let i = 0; i < categoryIds.length; i++) {
    await supabase
      .from('collection_categories')
      .update({ sort_order: i })
      .eq('collection_id', collectionId)
      .eq('category_id', categoryIds[i]);
  }
  (revalidateTag as any)('collections');
};

// Safe action wrappers
import { safeAction } from '@/lib/utils/serverAction';

export const createCollectionSafe = async (...args: Parameters<typeof createCollection>) => safeAction(createCollection(...args));
export const updateCollectionSafe = async (...args: Parameters<typeof updateCollection>) => safeAction(updateCollection(...args));
export const deleteCollectionSafe = async (...args: Parameters<typeof deleteCollection>) => safeAction(deleteCollection(...args));
export const assignCategoryToCollectionSafe = async (...args: Parameters<typeof assignCategoryToCollection>) => safeAction(assignCategoryToCollection(...args));
export const removeCategoryFromCollectionSafe = async (...args: Parameters<typeof removeCategoryFromCollection>) => safeAction(removeCategoryFromCollection(...args));
export const reorderCollectionCategoriesSafe = async (...args: Parameters<typeof reorderCollectionCategories>) => safeAction(reorderCollectionCategories(...args));
