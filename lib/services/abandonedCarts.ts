'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const staticSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } });

export interface AbandonedCart {
  id: string;
  sessionId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerApartment?: string;
  customerPostalCode?: string;
  items: any[];
  subtotal: number;
  currency: string;
  checkoutUrl?: string;
  emailSent: boolean;
  emailSentAt?: string;
  orderPlaced: boolean;
  orderId?: string;
  recoveredAt?: string;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

function mapCart(row: any): AbandonedCart {
  return {
    id: row.id,
    sessionId: row.session_id,
    customerName: row.customer_name ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    customerAddress: row.customer_address ?? undefined,
    customerCity: row.customer_city ?? undefined,
    customerApartment: row.customer_apartment ?? undefined,
    customerPostalCode: row.customer_postal_code ?? undefined,
    items: row.items ?? [],
    subtotal: parseFloat(row.subtotal ?? '0'),
    currency: row.currency ?? 'PKR',
    checkoutUrl: row.checkout_url ?? undefined,
    emailSent: row.email_sent ?? false,
    emailSentAt: row.email_sent_at ?? undefined,
    orderPlaced: row.order_placed ?? false,
    orderId: row.order_id ?? undefined,
    recoveredAt: row.recovered_at ?? undefined,
    lastActivity: row.last_activity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Upsert an abandoned cart (called from API route) */
export async function upsertAbandonedCart(data: {
  sessionId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerApartment?: string;
  customerPostalCode?: string;
  items: any[];
  subtotal: number;
  currency?: string;
  checkoutUrl?: string;
}): Promise<AbandonedCart> {
  const payload = {
    session_id: data.sessionId,
    customer_name: data.customerName || null,
    customer_email: data.customerEmail || null,
    customer_phone: data.customerPhone || null,
    customer_address: data.customerAddress || null,
    customer_city: data.customerCity || null,
    customer_apartment: data.customerApartment || null,
    customer_postal_code: data.customerPostalCode || null,
    items: data.items,
    subtotal: data.subtotal,
    currency: data.currency ?? 'PKR',
    checkout_url: data.checkoutUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/cart?step=checkout`,
    last_activity: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existingList } = await staticSupabase
    .from('abandoned_carts')
    .select('id, order_placed')
    .eq('session_id', data.sessionId)
    .order('created_at', { ascending: false })
    .limit(1);

  const existing = existingList?.[0];

  if (existing) {
    // Don't overwrite if order was already placed
    if (existing.order_placed) {
      return getAbandonedCartBySession(data.sessionId) as Promise<AbandonedCart>;
    }
    const { data: updated, error } = await staticSupabase
      .from('abandoned_carts')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return mapCart(updated);
  }

  const { data: created, error } = await staticSupabase
    .from('abandoned_carts')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return mapCart(created);
}

/** Mark cart as order placed */
export async function markCartAsOrdered(sessionId: string, orderId: string): Promise<void> {
  await staticSupabase
    .from('abandoned_carts')
    .update({ order_placed: true, order_id: orderId, recovered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('order_placed', false);
}

/** Get all abandoned carts for admin */
export async function getAllAbandonedCarts(): Promise<AbandonedCart[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('abandoned_carts')
    .select('*')
    .order('last_activity', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(mapCart);
}

/** Get single cart by session */
export async function getAbandonedCartBySession(sessionId: string): Promise<AbandonedCart | null> {
  const { data: dataList, error } = await staticSupabase
    .from('abandoned_carts')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error) throw error;
  const data = dataList?.[0];
  return data ? mapCart(data) : null;
}

/** Get carts eligible for abandonment email (> 5 mins, not emailed, not ordered, has email) */
export async function getPendingAbandonmentEmails(): Promise<AbandonedCart[]> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await staticSupabase
    .from('abandoned_carts')
    .select('*')
    .eq('email_sent', false)
    .eq('order_placed', false)
    .not('customer_email', 'is', null)
    .lt('last_activity', fiveMinutesAgo)
    .order('last_activity', { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapCart);
}

/** Mark email as sent */
export async function markAbandonmentEmailSent(cartId: string): Promise<void> {
  await staticSupabase
    .from('abandoned_carts')
    .update({ email_sent: true, email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', cartId);
}

/** Delete a cart (admin) */
export async function deleteAbandonedCart(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('abandoned_carts').delete().eq('id', id);
  if (error) throw error;
}

/** Stats for dashboard */
export async function getAbandonedCartStats(): Promise<{
  total: number;
  recovered: number;
  emailsSent: number;
  totalValue: number;
  recoveredValue: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase.from('abandoned_carts').select('subtotal, order_placed, email_sent');
  if (!data) return { total: 0, recovered: 0, emailsSent: 0, totalValue: 0, recoveredValue: 0 };
  return {
    total: data.length,
    recovered: data.filter(c => c.order_placed).length,
    emailsSent: data.filter(c => c.email_sent).length,
    totalValue: data.reduce((s, c) => s + parseFloat(c.subtotal ?? '0'), 0),
    recoveredValue: data.filter(c => c.order_placed).reduce((s, c) => s + parseFloat(c.subtotal ?? '0'), 0),
  };
}
