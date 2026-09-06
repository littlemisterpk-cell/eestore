'use server';

import { createClient } from '@/lib/supabase/server';
import { HomepageSection, WhatsAppSubscriber, EmailSubscriber } from '@/lib/types';
import { revalidatePath, unstable_cache } from 'next/cache';
import { revalidateBanner } from '@/lib/revalidate';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const staticSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } });

const fetchHomepageSections = async (onlyActive: boolean): Promise<HomepageSection[]> => {
  try {
    let query = staticSupabase
      .from('homepage_sections')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (onlyActive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    // Fallback: if vertical scoping is unavailable (pre-migration), fetch unfiltered
    try {
      let query = staticSupabase
        .from('homepage_sections')
        .select('*')
        .order('sort_order', { ascending: true });
      if (onlyActive) {
        query = query.eq('active', true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (fallbackError) {
      console.error('[sections] fetchHomepageSections failed, returning empty fallback list:', error);
      return [];
    }
  }
};

// Separate caches for active-only vs all sections so revalidation hits both.
const cachedActiveSections = unstable_cache(
  async () => fetchHomepageSections(true),
  ['homepage-sections-active'],
  { revalidate: 86400, tags: ['homepage', 'banners', 'homepage_sections'] }
);

const cachedAllSections = unstable_cache(
  async () => fetchHomepageSections(false),
  ['homepage-sections-all'],
  { revalidate: 86400, tags: ['homepage', 'banners', 'homepage_sections'] }
);

export const getHomepageSections = async (onlyActive = false): Promise<HomepageSection[]> => {
  try {
    return onlyActive
      ? await cachedActiveSections()
      : await cachedAllSections();
  } catch (error) {
    console.error('[sections] getHomepageSections failed:', error);
    throw error;
  }
};

// Uncached fetch used by the customizer when switching between sub-stores —
// bypasses the 24h ISR cache so edits always show fresh, unpublished sections.
export const fetchSectionsForVerticalAdmin = async (): Promise<HomepageSection[]> => {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('homepage_sections')
      .select('*')
      .order('sort_order', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[sections] fetchSectionsForVerticalAdmin failed, returning empty fallback list:', error);
    return [];
  }
};

export const updateHomepageSection = async (
  id: string,
  updates: Partial<HomepageSection>
): Promise<HomepageSection> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('homepage_sections')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/store', 'layout');
    await revalidateBanner();
    return data;
  } catch (error) {
    console.error('[sections] updateHomepageSection failed:', error);
    throw error;
  }
};

export const reorderHomepageSections = async (
  sections: { id: string; sort_order: number }[]
): Promise<void> => {
  try {
    const supabase = await createClient();
    // Perform updates in parallel
    const promises = sections.map((sec) =>
      supabase
        .from('homepage_sections')
        .update({ sort_order: sec.sort_order })
        .eq('id', sec.id)
    );
    await Promise.all(promises);
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/store', 'layout');
    await revalidateBanner();
  } catch (error) {
    console.error('[sections] reorderHomepageSections failed:', error);
    throw error;
  }
};

export const addHomepageSection = async (
  sectionType: string,
  title: string
): Promise<HomepageSection> => {
  try {
    const supabase = await createClient();
    // Get highest sort_order
    const { data: maxSec, error: maxError } = await supabase
      .from('homepage_sections')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newSortOrder = (maxSec?.sort_order ?? 0) + 1;

    // Set default settings/content based on type
    let settings: Record<string, any> = {};
    let content_data: Record<string, any> = {};

    if (sectionType === 'product_grid') {
      settings = { limit: 8, columns_desktop: 4, columns_mobile: 2, source: 'all' };
    } else if (sectionType === 'category_list') {
      settings = { columns_desktop: 6, columns_mobile: 3 };
    } else if (sectionType === 'hero_banner') {
      settings = { height_desktop: '450px', height_mobile: '220px', overlay_opacity: 0.3 };
    } else if (sectionType === 'recent_reviews') {
      settings = { limit: 3 };
    } else if (sectionType === 'flash_sale') {
      settings = { startTime: '', endTime: '', viewAllText: 'View All', viewAllUrl: '/shop' };
      content_data = { products: [] };
    }

    const { data, error } = await supabase
      .from('homepage_sections')
      .insert({
        section_type: sectionType,
        title,
        settings,
        content_data,
        sort_order: newSortOrder,
        active: true
      })
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/store', 'layout');
    await revalidateBanner();
    return data;
  } catch (error) {
    console.error('[sections] addHomepageSection failed:', error);
    throw error;
  }
};

export const deleteHomepageSection = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('homepage_sections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/store', 'layout');
    await revalidateBanner();
  } catch (error) {
    console.error('[sections] deleteHomepageSection failed:', error);
    throw error;
  }
};

export const addWhatsAppSubscriber = async (
  phone: string,
  name?: string,
  email?: string,
  source_type?: string
): Promise<WhatsAppSubscriber> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('whatsapp_subscribers')
      .insert({ phone, name, email, source_type })
      .select('*')
      .single();

    if (error) {
      // If already subscribed, return it
      if (error.code === '23505') { // unique_violation
        const { data: existing } = await supabase
          .from('whatsapp_subscribers')
          .select('*')
          .eq('phone', phone)
          .single();
        if (existing) return existing;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('[sections] addWhatsAppSubscriber failed:', error);
    throw error;
  }
};

export const getWhatsAppSubscribers = async (): Promise<WhatsAppSubscriber[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('whatsapp_subscribers')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[sections] getWhatsAppSubscribers failed:', error);
    throw error;
  }
};

export const addEmailSubscriber = async (email: string): Promise<EmailSubscriber> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('email_subscribers')
      .insert({ email, source: 'newsletter' })
      .select('*')
      .single();

    if (error) {
      // Already subscribed — return existing
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('email_subscribers')
          .select('*')
          .eq('email', email)
          .single();
        if (existing) return existing;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('[sections] addEmailSubscriber failed:', error);
    throw error;
  }
};

export const getEmailSubscribers = async (): Promise<EmailSubscriber[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('email_subscribers')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[sections] getEmailSubscribers failed:', error);
    throw error;
  }
};

export const getDeletedWhatsAppSubscribers = async (): Promise<WhatsAppSubscriber[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('whatsapp_subscribers')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[sections] getDeletedWhatsAppSubscribers failed:', error);
    throw error;
  }
};

export const deleteWhatsAppSubscriber = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('whatsapp_subscribers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[sections] deleteWhatsAppSubscriber failed:', error);
    throw error;
  }
};

export const restoreWhatsAppSubscriber = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('whatsapp_subscribers')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[sections] restoreWhatsAppSubscriber failed:', error);
    throw error;
  }
};

export const hardDeleteWhatsAppSubscriber = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('whatsapp_subscribers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[sections] hardDeleteWhatsAppSubscriber failed:', error);
    throw error;
  }
};

export const getDeletedEmailSubscribers = async (): Promise<EmailSubscriber[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('email_subscribers')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[sections] getDeletedEmailSubscribers failed:', error);
    throw error;
  }
};

export const deleteEmailSubscriber = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('email_subscribers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[sections] deleteEmailSubscriber failed:', error);
    throw error;
  }
};

export const restoreEmailSubscriber = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('email_subscribers')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[sections] restoreEmailSubscriber failed:', error);
    throw error;
  }
};

export const hardDeleteEmailSubscriber = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('email_subscribers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[sections] hardDeleteEmailSubscriber failed:', error);
    throw error;
  }
};
