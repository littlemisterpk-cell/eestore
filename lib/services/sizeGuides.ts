'use server';

import { createClient } from '@/lib/supabase/server';
import { SizeGuide } from '@/lib/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const staticSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } });

interface SizeGuideRow {
  id: string;
  name: string;
  chart_data: any;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

const mapSizeGuide = (row: SizeGuideRow): SizeGuide => ({
  id: row.id,
  name: row.name,
  chart_data: Array.isArray(row.chart_data) ? row.chart_data : [],
  imageUrl: row.image_url || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at || null
});

const fetchSizeGuides = async (): Promise<SizeGuide[]> => {
  const { data, error } = await staticSupabase
    .from('size_guides')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapSizeGuide);
};

const cachedSizeGuides = unstable_cache(
  async () => fetchSizeGuides(),
  ['size-guides-list'],
  { revalidate: 86400, tags: ['size_guides'] }
);

export const getSizeGuides = async (): Promise<SizeGuide[]> => {
  return cachedSizeGuides();
};

export const createSizeGuide = async (guide: {
  name: string;
  chart_data: Array<Record<string, string>>;
  imageUrl?: string;
}): Promise<SizeGuide> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('size_guides')
      .insert({
        name: guide.name,
        chart_data: guide.chart_data,
        image_url: guide.imageUrl
      })
      .select('*')
      .single();

    if (error) throw error;
    (revalidateTag as any)('size_guides');
    return mapSizeGuide(data);
  } catch (error) {
    console.error('[sizeGuides] createSizeGuide failed:', error);
    throw error;
  }
};

export const updateSizeGuide = async (
  id: string,
  guide: Partial<SizeGuide>
): Promise<SizeGuide> => {
  try {
    const supabase = await createClient();
    const updatePayload: Record<string, any> = {};
    if (guide.name !== undefined) updatePayload.name = guide.name;
    if (guide.chart_data !== undefined) updatePayload.chart_data = guide.chart_data;
    if (guide.imageUrl !== undefined) updatePayload.image_url = guide.imageUrl;

    const { data, error } = await supabase
      .from('size_guides')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    (revalidateTag as any)('size_guides');
    return mapSizeGuide(data);
  } catch (error) {
    console.error('[sizeGuides] updateSizeGuide failed:', error);
    throw error;
  }
};

export const deleteSizeGuide = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('size_guides')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    (revalidateTag as any)('size_guides');
  } catch (error) {
    console.error('[sizeGuides] deleteSizeGuide failed:', error);
    throw error;
  }
};

export const getDeletedSizeGuides = async (): Promise<SizeGuide[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('size_guides')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => mapSizeGuide(row));
  } catch (error) {
    console.error('[sizeGuides] getDeletedSizeGuides failed:', error);
    return [];
  }
};

export const restoreSizeGuide = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('size_guides')
      .update({ deleted_at: null })
      .eq('id', id);
    if (error) throw error;
    (revalidateTag as any)('size_guides');
  } catch (error) {
    console.error('[sizeGuides] restoreSizeGuide failed:', error);
    throw error;
  }
};

export const hardDeleteSizeGuide = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('size_guides')
      .delete()
      .eq('id', id);
    if (error) throw error;
    (revalidateTag as any)('size_guides');
  } catch (error) {
    console.error('[sizeGuides] hardDeleteSizeGuide failed:', error);
    throw error;
  }
};
