'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { StoreSettings } from '@/lib/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidateSettings } from '@/lib/revalidate';
import { logDbError } from '@/lib/utils/dbErrorHandler';

const SETTINGS_ID = '00000000-0000-4000-8000-000000000001';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const staticSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } });


interface SettingsRow {
  id: string;
  store_name?: string | null;
  store_url?: string | null;
  whatsapp_number?: string | null;
  currency?: string | null;
  currency_symbol?: string | null;
  order_prefix?: string | null;
  next_order_sequence?: number | null;
  logo_url?: string | null;
  logo_width?: number | null;
  banner_url?: string | null;
  favicon_url?: string | null;
  tagline?: string | null;
  address?: string | null;
  show_stock?: boolean | null;
  show_compare_price?: boolean | null;
  enable_search?: boolean | null;
  enable_category_filter?: boolean | null;
  verticals_enabled?: boolean | null;
  verticals_hub_title?: string | null;
  verticals_hub_subtitle?: string | null;
  whatsapp_greeting?: string | null;
  whatsapp_footer?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  footer_text?: string | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  social_whatsapp?: string | null;
  social_youtube?: string | null;
  enable_fake_views?: boolean | null;
  min_views?: number | null;
  max_views?: number | null;
  enable_trust_badges?: boolean | null;
  delivery_estimate_text?: string | null;
  free_shipping_text?: string | null;
  promo_code_text?: string | null;
  enable_safe_checkout?: boolean | null;
  safe_checkout_text?: string | null;
  safe_checkout_methods?: string[] | null;
  enable_ticker?: boolean | null;
  ticker_text?: string | null;
  product_detail_enable_ticker?: boolean | null;
  product_detail_ticker_text?: string | null;
  enable_variant_swatches?: boolean | null;
  swatch_shape?: string | null;
  swatch_size?: string | null;
  swatch_limit?: number | null;
  default_variant_index?: number | null;
  image_hover_style?: string | null;
  image_aspect_ratio?: string | null;
  title_line_limit?: string | null;
  archive_swatch_size?: string | null;
  product_swatch_size?: string | null;
  archive_swatch_align?: string | null;
  header_sticky?: boolean | null;
  header_sticky_desktop?: boolean | null;
  header_sticky_mobile?: boolean | null;
  header_show_top_bar?: boolean | null;
  header_top_bar_phone?: string | null;
  header_top_bar_email?: string | null;
  header_show_newsletter?: boolean | null;
  header_newsletter_text?: string | null;
  header_top_bar_bg?: string | null;
  header_top_bar_text_color?: string | null;
  header_bg?: string | null;
  header_text_color?: string | null;
  header_border_color?: string | null;
  header_desktop_logo_align?: string | null;
  header_desktop_search_align?: string | null;
  header_desktop_wishlist_align?: string | null;
  header_desktop_cart_align?: string | null;
  header_desktop_theme_align?: string | null;
  header_mobile_logo_align?: string | null;
  header_mobile_menu_align?: string | null;
  header_mobile_search_align?: string | null;
  header_mobile_cart_align?: string | null;
  header_mobile_wishlist_align?: string | null;
  navigation_menu?: any;
  header_desktop_menu_align?: string | null;
  faq_content?: string | null;
  return_policy_content?: string | null;
  privacy_policy_content?: string | null;
  show_faq_in_nav?: boolean | null;
  show_returns_in_nav?: boolean | null;
  show_privacy_in_nav?: boolean | null;
  show_faq_in_footer?: boolean | null;
  show_returns_in_footer?: boolean | null;
  show_privacy_in_footer?: boolean | null;
  trust_badge_1_title?: string | null;
  trust_badge_1_desc?: string | null;
  trust_badge_1_icon?: string | null;
  trust_badge_2_title?: string | null;
  trust_badge_2_desc?: string | null;
  trust_badge_2_icon?: string | null;
  trust_badge_3_title?: string | null;
  trust_badge_3_desc?: string | null;
  trust_badge_3_icon?: string | null;
  trust_badge_4_title?: string | null;
  trust_badge_4_desc?: string | null;
  trust_badge_4_icon?: string | null;
  trust_badge_1_enabled?: boolean | null;
  trust_badge_2_enabled?: boolean | null;
  trust_badge_3_enabled?: boolean | null;
  trust_badge_4_enabled?: boolean | null;
  social_tiktok?: string | null;
  social_snapchat?: string | null;
  social_twitter?: string | null;
  footer_col_1_title?: string | null;
  footer_col_2_title?: string | null;
  footer_col_2_text?: string | null;
  footer_col_3_title?: string | null;
  footer_col_4_title?: string | null;
  footer_col_4_text?: string | null;
  footer_bottom_text?: string | null;
  footer_show_payments?: boolean | null;
  footer_show_menu?: boolean | null;
  footer_show_newsletter?: boolean | null;
  footer_show_social?: boolean | null;
  floating_contacts_enabled?: boolean | null;
  floating_contacts_position?: string | null;
  floating_contacts_bottom_mobile?: number | null;
  floating_contacts_bottom_desktop?: number | null;
  floating_contacts_side_mobile?: number | null;
  floating_contacts_side_desktop?: number | null;
  floating_contacts_scale?: number | null;
  floating_whatsapp_preset?: string | null;
  floating_whatsapp_number?: string | null;
  floating_whatsapp_enabled?: boolean | null;
  floating_instagram_enabled?: boolean | null;
  floating_tiktok_enabled?: boolean | null;
  floating_snapchat_enabled?: boolean | null;
  floating_twitter_enabled?: boolean | null;

  // Customizer & Premium Theme Settings
  exit_intent_enabled?: boolean | null;
  exit_intent_title?: string | null;
  exit_intent_text?: string | null;
  exit_intent_coupon?: string | null;
  spin_wheel_enabled?: boolean | null;
  spin_wheel_segments?: string[] | null;
  cart_timer_minutes?: number | null;
  free_shipping_threshold?: number | null;
  volume_discount_threshold?: number | null;
  volume_discount_percentage?: number | null;
  recent_buyers?: any;
  recently_viewed_limit?: number | null;
  recent_buyers_enabled?: boolean | null;
  cookie_consent_enabled?: boolean | null;
  free_shipping_bar_enabled?: boolean | null;
  volume_discounts_enabled?: boolean | null;
  frequently_bought_together_enabled?: boolean | null;
  stock_urgency_enabled?: boolean | null;
  flash_sale_enabled?: boolean | null;
  flash_sale_start_date?: string | null;
  flash_sale_end_date?: string | null;
  global_flash_sale_discount_type?: string | null;
  global_flash_sale_discount_value?: number | string | null;
  social_feeds_enabled?: boolean | null;
  cart_timer_enabled?: boolean | null;
  size_guide_enabled?: boolean | null;
  recent_buyers_names?: string | null;
  recent_buyers_cities?: string | null;
  recent_buyers_source?: string | null;
  recent_buyers_product_pool?: string | null;
  recent_buyers_custom_products?: any;
  recent_buyers_initial_delay?: number | null;
  recent_buyers_interval?: number | null;
  recent_buyers_display_duration?: number | null;
  recent_buyers_show_on_checkout?: boolean | null;
  exit_intent_image_url?: string | null;
  exit_intent_delay_mobile?: number | null;
  cookie_consent_text?: string | null;
  cookie_consent_button_text?: string | null;
  social_feeds_homepage_enabled?: boolean | null;
  social_feeds_product_enabled?: boolean | null;
  social_feeds_title?: string | null;
  social_feeds_subtitle?: string | null;
  social_feeds_desc?: string | null;
  social_feeds_items?: any;
  cart_timer_message?: string | null;
  coupon_codes_enabled?: boolean | null;
  product_page_layout?: string[] | null;
  card_style?: string | null;
  card_variant?: string | null;
  card_show_stars?: boolean | null;
  card_show_quickview?: boolean | null;
  card_show_wishlist?: boolean | null;
  card_show_quickcart?: boolean | null;
  card_show_description?: boolean | null;
  card_show_swatches?: boolean | null;
  card_show_sizes?: boolean | null;
  card_show_materials?: boolean | null;
  card_show_custom?: boolean | null;
  card_show_custom_2?: boolean | null;
  card_show_type_color?: boolean | null;
  card_show_type_size?: boolean | null;
  card_show_type_material?: boolean | null;
  card_show_type_custom?: boolean | null;
  card_alignment?: string | null;
  card_elements_order?: string[] | null;
  card_mobile_columns?: number | null;
  theme_preset?: string | null;
  theme_config?: any | null;

  // Pixels & Tracking
  meta_pixel_id?: string | null;
  meta_sync_enabled?: boolean | null;
  ga4_measurement_id?: string | null;
  gtm_container_id?: string | null;
  tiktok_pixel_id?: string | null;
  twitter_pixel_id?: string | null;
  snapchat_pixel_id?: string | null;
  pinterest_tag_id?: string | null;

  // Social & SEO
  twitter_handle?: string | null;
  meta_title_suffix?: string | null;

  // AI settings
  ai_enabled?: boolean | null;
  ai_model_credentials?: any | null;
  ai_persona_config?: any | null;
  content_provider?: string | null;
  content_model?: string | null;
  content_keys?: string | null;
  vision_provider?: string | null;
  vision_model?: string | null;
  vision_keys?: string | null;
  ai_tone?: string | null;
  ai_language?: string | null;
  ai_custom_instructions?: string | null;
  auto_content_seo?: boolean | null;
  auto_media_ai?: boolean | null;
  target_audiences?: string | null;
  product_types?: string | null;
  category_default_template?: string | null;
  product_default_template?: string | null;
  category_description_prompt?: string | null;
  category_description_limit?: number | null;
  product_description_prompt?: string | null;
  product_description_limit?: number | null;
  product_short_prompt?: string | null;
  product_short_limit?: number | null;
  collection_default_template?: string | null;
  collection_description_prompt?: string | null;
  collection_description_limit?: number | null;

  // SMTP/Email Fallback Columns
  smtp_email?: string | null;
  smtp_app_password?: string | null;
  smtp_from_name?: string | null;
  admin_notification_email?: string | null;
  email_notifications?: any | null;
  low_stock_threshold?: number | null;
  abandoned_cart_email_enabled?: boolean | null;
  abandoned_cart_admin_notify?: boolean | null;
  abandoned_cart_email_subject?: string | null;
  abandoned_cart_email_template?: string | null;
  popular_searches?: string | null;
  postex_enabled?: boolean | null;
  postex_api_token?: string | null;
  postex_mode?: string | null;
  postex_pickup_address?: string | null;
  postex_return_address?: string | null;
  postex_order_type?: string | null;
  postex_handling_type?: string | null;
  postex_default_remarks?: string | null;
  postex_pickup_display?: string | null;
  postex_return_display?: string | null;
  postex_return_city?: string | null;
  postex_product_check?: string | null;
  postex_sku_check?: string | null;
  postex_weight_check?: string | null;
  postex_pieces_check?: string | null;
  postex_cod_check?: string | null;
  postex_notes_check?: string | null;
  postex_default_weight?: string | null;
  postex_default_items?: string | null;
  postex_default_product?: string | null;
  postex_whatsapp_template?: string | null;
  postex_whatsapp_note?: string | null;
  postex_auto_download_label?: boolean | null;

  // Cache Purge
  last_vercel_purge?: string | null;
  last_cloudflare_purge?: string | null;

  updated_at: string;
}

const mapSettings = (row: SettingsRow): StoreSettings => ({
  id: row.id,
  storeName: row.store_name ?? (process.env.NEXT_PUBLIC_BRAND_NAME || 'Your Store'),
  storeUrl: row.store_url ?? '',
  whatsappNumber: row.whatsapp_number ?? '',
  currency: row.currency ?? 'PKR',
  currencySymbol: row.currency_symbol ?? 'Rs.',
  orderPrefix: row.order_prefix ?? 'ZE-',
  nextOrderSequence: row.next_order_sequence ?? 1,
  logoUrl: row.logo_url || undefined,
  logoWidth: row.logo_width ?? 120,
  bannerUrl: row.banner_url || undefined,
  faviconUrl: row.favicon_url || undefined,
  tagline: row.tagline || undefined,
  address: row.address || undefined,
  showStock: row.show_stock ?? false,
  showComparePrice: row.show_compare_price ?? true,
  enableSearch: row.enable_search ?? true,
  enableCategoryFilter: row.enable_category_filter ?? true,
  
  lastVercelPurge: row.last_vercel_purge || undefined,
  lastCloudflarePurge: row.last_cloudflare_purge || undefined,

  whatsappGreeting: row.whatsapp_greeting ?? 'Hello! I would like to order:',
  whatsappFooter: row.whatsapp_footer ?? 'Please confirm my order. Thank you!',
  metaTitle: row.meta_title || undefined,
  metaDescription: row.meta_description || undefined,
  footerText: row.footer_text || undefined,
  socialFacebook: row.social_facebook || undefined,
  socialInstagram: row.social_instagram || undefined,
  socialWhatsapp: row.social_whatsapp || undefined,
  socialYoutube: row.social_youtube || undefined,
  enableFakeViews: row.enable_fake_views ?? true,
  minViews: row.min_views ?? 10,
  maxViews: row.max_views ?? 50,
  enableTrustBadges: row.enable_trust_badges ?? true,
  deliveryEstimateText: row.delivery_estimate_text ?? 'Estimate delivery times: 3-5 days International.',
  freeShippingText: row.free_shipping_text ?? 'Free shipping & returns: On all orders over $150.',
  promoCodeText: row.promo_code_text ?? 'Use code "WELCOME15" for discount 15% on your first order.',
  enableSafeCheckout: row.enable_safe_checkout ?? true,
  safeCheckoutText: row.safe_checkout_text ?? 'Guarantee Safe Checkout:',
  safeCheckoutMethods: row.safe_checkout_methods ?? ['visa', 'mastercard', 'paypal', 'amex', 'klarna', 'cirrus', 'westernunion'],
  enableTicker: row.enable_ticker ?? false,
  tickerText: row.ticker_text ?? 'Free returns within 30 days\nUnlimited delivery for only $175',
  productDetailEnableTicker: row.product_detail_enable_ticker ?? false,
  productDetailTickerText: row.product_detail_ticker_text ?? 'Free returns within 30 days\nUnlimited delivery for only $175',
  enableVariantSwatches: row.enable_variant_swatches ?? true,
  swatchShape: (row.swatch_shape as 'circle' | 'square') ?? 'circle',
  swatchSize: (row.swatch_size as 'sm' | 'md' | 'lg') ?? 'md',
  swatchLimit: row.swatch_limit ?? 8,
  defaultVariantIndex: row.default_variant_index ?? 1,
  imageHoverStyle: (row.image_hover_style as 'second_image' | 'zoom' | 'none') ?? 'second_image',
  imageAspectRatio: row.image_aspect_ratio ?? '1:1',
  titleLineLimit: (row.title_line_limit as '1' | '2' | 'none') ?? '2',
  archiveSwatchSize: (row.archive_swatch_size as any) ?? 'md',
  productSwatchSize: (row.product_swatch_size as any) ?? 'md',
  archiveSwatchAlign: (row.archive_swatch_align as any) ?? 'left',
  headerSticky: row.header_sticky ?? true,
  headerStickyDesktop: row.header_sticky_desktop ?? true,
  headerStickyMobile: row.header_sticky_mobile ?? true,
  headerShowTopBar: row.header_show_top_bar ?? true,
  headerTopBarPhone: row.header_top_bar_phone ?? '',
  headerTopBarEmail: row.header_top_bar_email ?? '',
  headerShowNewsletter: row.header_show_newsletter ?? true,
  headerNewsletterText: row.header_newsletter_text ?? 'Summer sale discount off 50%. Shop Sale',
  headerTopBarBg: row.header_top_bar_bg ?? '#d97706',
  headerTopBarTextColor: row.header_top_bar_text_color ?? '#ffffff',
  headerBg: row.header_bg ?? '#ffffff',
  headerTextColor: row.header_text_color ?? '#1a1a2e',
  headerBorderColor: row.header_border_color ?? '#e5e7eb',
  headerDesktopLogoAlign: (row.header_desktop_logo_align as any) ?? 'left',
  headerDesktopSearchAlign: (row.header_desktop_search_align as any) ?? 'right',
  headerDesktopWishlistAlign: (row.header_desktop_wishlist_align as any) ?? 'right',
  headerDesktopCartAlign: (row.header_desktop_cart_align as any) ?? 'right',
  headerDesktopThemeAlign: (row.header_desktop_theme_align as any) ?? 'right',
  headerMobileLogoAlign: (row.header_mobile_logo_align as any) ?? 'center',
  headerMobileMenuAlign: (row.header_mobile_menu_align as any) ?? 'left',
  headerMobileSearchAlign: (row.header_mobile_search_align as any) ?? 'right',
  headerMobileCartAlign: (row.header_mobile_cart_align as any) ?? 'right',
  headerMobileWishlistAlign: (row.header_mobile_wishlist_align as any) ?? 'hidden',
  navigationMenu: Array.isArray(row.navigation_menu) ? row.navigation_menu : [],
  headerDesktopMenuAlign: (row.header_desktop_menu_align as any) ?? 'center',
  faqContent: row.faq_content ?? '',
  returnPolicyContent: row.return_policy_content ?? '',
  privacyPolicyContent: row.privacy_policy_content ?? '',
  showFaqInNav: row.show_faq_in_nav ?? true,
  showReturnsInNav: row.show_returns_in_nav ?? true,
  showPrivacyInNav: row.show_privacy_in_nav ?? true,
  showFaqInFooter: row.show_faq_in_footer ?? true,
  showReturnsInFooter: row.show_returns_in_footer ?? true,
  showPrivacyInFooter: row.show_privacy_in_footer ?? true,
  trustBadge1Title: row.trust_badge_1_title ?? 'Free Delivery',
  trustBadge1Desc: row.trust_badge_1_desc ?? 'On all orders above Rs. 2,000',
  trustBadge1Icon: row.trust_badge_1_icon ?? 'Truck',
  trustBadge2Title: row.trust_badge_2_title ?? 'Secure Payments',
  trustBadge2Desc: row.trust_badge_2_desc ?? '100% protected checkout payments',
  trustBadge2Icon: row.trust_badge_2_icon ?? 'Shield',
  trustBadge3Title: row.trust_badge_3_title ?? 'Easy Exchange',
  trustBadge3Desc: row.trust_badge_3_desc ?? 'No questions asked return policy',
  trustBadge3Icon: row.trust_badge_3_icon ?? 'RefreshCw',
  trustBadge4Title: row.trust_badge_4_title ?? '24/7 Support',
  trustBadge4Desc: row.trust_badge_4_desc ?? 'Call/WhatsApp anytime for assistance',
  trustBadge4Icon: row.trust_badge_4_icon ?? 'Phone',
  trustBadge1Enabled: row.trust_badge_1_enabled ?? true,
  trustBadge2Enabled: row.trust_badge_2_enabled ?? true,
  trustBadge3Enabled: row.trust_badge_3_enabled ?? true,
  trustBadge4Enabled: row.trust_badge_4_enabled ?? true,
  socialTiktok: row.social_tiktok || '',
  socialSnapchat: row.social_snapchat || '',
  socialTwitter: row.social_twitter || '',
  footerCol1Title: row.footer_col_1_title ?? 'About Our Store',
  footerCol2Title: row.footer_col_2_title ?? 'Customer Support',
  footerCol2Text: row.footer_col_2_text ?? 'Call/WhatsApp: \nEmail: \nTimings: 10 AM - 10 PM',
  footerCol3Title: row.footer_col_3_title ?? 'Quick Links',
  footerCol4Title: row.footer_col_4_title ?? 'Newsletter',
  footerCol4Text: row.footer_col_4_text ?? 'Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.',
  footerBottomText: row.footer_bottom_text ?? '',
  footerShowPayments: row.footer_show_payments ?? true,
  footerShowMenu: row.footer_show_menu ?? true,
  footerShowNewsletter: row.footer_show_newsletter ?? true,
  footerShowSocial: row.footer_show_social ?? true,
  floatingContactsEnabled: row.floating_contacts_enabled ?? true,
  floatingContactsPosition: (row.floating_contacts_position as any) ?? 'left',
  floatingContactsBottomMobile: row.floating_contacts_bottom_mobile ?? 80,
  floatingContactsBottomDesktop: row.floating_contacts_bottom_desktop ?? 24,
  floatingContactsSideMobile: row.floating_contacts_side_mobile ?? 16,
  floatingContactsSideDesktop: row.floating_contacts_side_desktop ?? 24,
  floatingContactsScale: row.floating_contacts_scale ? parseFloat(row.floating_contacts_scale.toString()) : 1.0,
  floatingWhatsappPreset: row.floating_whatsapp_preset ?? 'Hello! I am visiting your store and have a question.',
  floatingWhatsappNumber: row.floating_whatsapp_number ?? '',
  floatingWhatsappEnabled: row.floating_whatsapp_enabled ?? true,
  floatingInstagramEnabled: row.floating_instagram_enabled ?? true,
  floatingTiktokEnabled: row.floating_tiktok_enabled ?? false,
  floatingSnapchatEnabled: row.floating_snapchat_enabled ?? false,
  floatingTwitterEnabled: row.floating_twitter_enabled ?? false,

  // Customizer & Premium Theme Settings
  exit_intent_enabled: row.exit_intent_enabled ?? false,
  exit_intent_title: row.exit_intent_title ?? 'Wait! Get a Special Discount',
  exit_intent_text: row.exit_intent_text ?? 'Submit your WhatsApp number to unlock a secret coupon code.',
  exit_intent_coupon: row.exit_intent_coupon ?? 'WELCOME10',
  spin_wheel_enabled: row.spin_wheel_enabled ?? false,
  spin_wheel_segments: Array.isArray(row.spin_wheel_segments) ? row.spin_wheel_segments : ['Try Again', '5% Off', 'Free Shipping', '10% Off', 'Free Delivery', 'WELCOME15'],
  cart_timer_minutes: row.cart_timer_minutes ?? 10,
  free_shipping_threshold: row.free_shipping_threshold ? parseFloat(row.free_shipping_threshold.toString()) : 2000.00,
  volume_discount_threshold: row.volume_discount_threshold ?? 3,
  volume_discount_percentage: row.volume_discount_percentage ? parseFloat(row.volume_discount_percentage.toString()) : 10.00,
  recent_buyers: typeof row.recent_buyers === 'string' ? JSON.parse(row.recent_buyers) : (row.recent_buyers ?? []),
  recently_viewed_limit: row.recently_viewed_limit ?? 4,
  recent_buyers_enabled: row.recent_buyers_enabled ?? true,
  cookie_consent_enabled: row.cookie_consent_enabled ?? true,
  free_shipping_bar_enabled: row.free_shipping_bar_enabled ?? true,
  volume_discounts_enabled: row.volume_discounts_enabled ?? true,
  frequently_bought_together_enabled: row.frequently_bought_together_enabled ?? true,
  stock_urgency_enabled: row.stock_urgency_enabled ?? true,
  flash_sale_enabled: row.flash_sale_enabled ?? false,
  flash_sale_start_date: row.flash_sale_start_date || undefined,
  flash_sale_end_date: row.flash_sale_end_date || undefined,
  globalFlashSaleDiscountType: (row.global_flash_sale_discount_type as any) || 'percentage',
  globalFlashSaleDiscountValue: row.global_flash_sale_discount_value ? parseFloat(row.global_flash_sale_discount_value.toString()) : 0,
  social_feeds_enabled: row.social_feeds_enabled ?? true,
  cart_timer_enabled: row.cart_timer_enabled ?? true,
  size_guide_enabled: row.size_guide_enabled ?? true,

  recent_buyers_names: row.recent_buyers_names ?? 'Ahmad, Fatima, Zainab, Hamza, Ayesha, Bilal, Sana, Ali, Usman, Maryam',
  recent_buyers_cities: row.recent_buyers_cities ?? 'Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Sialkot, Gujranwala',
  recent_buyers_source: (row.recent_buyers_source as any) ?? 'simulated',
  recent_buyers_product_pool: (row.recent_buyers_product_pool as any) ?? 'any',
  recent_buyers_custom_products: typeof row.recent_buyers_custom_products === 'string' ? JSON.parse(row.recent_buyers_custom_products) : (row.recent_buyers_custom_products ?? []),
  recent_buyers_initial_delay: row.recent_buyers_initial_delay ?? 15,
  recent_buyers_interval: row.recent_buyers_interval ?? 35,
  recent_buyers_display_duration: row.recent_buyers_display_duration ?? 6,
  recent_buyers_show_on_checkout: row.recent_buyers_show_on_checkout ?? false,
  exit_intent_image_url: row.exit_intent_image_url ?? '',
  exit_intent_delay_mobile: row.exit_intent_delay_mobile ?? 25,
  cookie_consent_text: row.cookie_consent_text ?? 'We use cookies to optimize your experience, analyze traffic, and support checkout flows. By continuing, you agree to our privacy policy.',
  cookie_consent_button_text: row.cookie_consent_button_text ?? 'Accept All',
  social_feeds_homepage_enabled: row.social_feeds_homepage_enabled ?? true,
  social_feeds_product_enabled: row.social_feeds_product_enabled ?? true,
  social_feeds_title: row.social_feeds_title ?? 'Follow Us On Instagram',
  social_feeds_subtitle: row.social_feeds_subtitle ?? '@YourStore',
  social_feeds_desc: row.social_feeds_desc ?? 'Tag us in your post to get featured on our page',
  social_feeds_items: typeof row.social_feeds_items === 'string' ? JSON.parse(row.social_feeds_items) : (row.social_feeds_items ?? []),
  cart_timer_message: row.cart_timer_message ?? 'Items in your cart are reserved for {timer} minutes.',
  coupon_codes_enabled: row.coupon_codes_enabled ?? true,
  productPageLayout: row.product_page_layout ?? ['details', 'ticker', 'reviews', 'related', 'recently_viewed', 'social_feed'],
  card_style: (row.card_style as any) ?? 'style1',
  card_variant: (row.card_variant as any) ?? 'v1',
  card_show_stars: row.card_show_stars ?? true,
  card_show_quickview: row.card_show_quickview ?? true,
  card_show_wishlist: row.card_show_wishlist ?? true,
  card_show_quickcart: row.card_show_quickcart ?? true,
  card_show_description: row.card_show_description ?? true,
  card_show_swatches: row.card_show_swatches ?? true,
  card_show_sizes: row.card_show_sizes ?? true,
  card_show_materials: row.card_show_materials ?? true,
  card_show_custom: row.card_show_custom ?? true,
  card_show_custom_2: row.card_show_custom_2 ?? true,
  card_show_type_color: row.card_show_type_color ?? true,
  card_show_type_size: row.card_show_type_size ?? true,
  card_show_type_material: row.card_show_type_material ?? true,
  card_show_type_custom: row.card_show_type_custom ?? true,
  card_alignment: (row.card_alignment as any) ?? 'left',
  card_elements_order: row.card_elements_order ?? ['title', 'rating', 'price', 'swatches'],
  card_mobile_columns: row.card_mobile_columns ?? 2,
  theme_preset: row.theme_preset ?? 'classic_white',
  theme_config: typeof row.theme_config === 'string' ? JSON.parse(row.theme_config) : (row.theme_config ?? undefined),

  // Pixels & Tracking
  meta_pixel_id: row.meta_pixel_id ?? '',
  meta_sync_enabled: row.meta_sync_enabled ?? false,
  ga4_measurement_id: row.ga4_measurement_id ?? '',
  gtm_container_id: row.gtm_container_id ?? '',
  tiktok_pixel_id: row.tiktok_pixel_id ?? '',
  twitter_pixel_id: row.twitter_pixel_id ?? '',
  snapchat_pixel_id: row.snapchat_pixel_id ?? '',
  pinterest_tag_id: row.pinterest_tag_id ?? '',

  // Social & SEO
  twitter_handle: row.twitter_handle ?? '',
  meta_title_suffix: row.meta_title_suffix ?? '',

  // AI settings
  ai_enabled: row.ai_enabled ?? false,
  ai_model_credentials: typeof row.ai_model_credentials === 'string' ? JSON.parse(row.ai_model_credentials) : (row.ai_model_credentials ?? {}),
  ai_persona_config: typeof row.ai_persona_config === 'string' ? JSON.parse(row.ai_persona_config) : (row.ai_persona_config ?? {}),
  content_provider: row.content_provider ?? 'groq',
  content_model: row.content_model ?? 'llama-3.3-70b-versatile',
  content_keys: row.content_keys ?? '',
  vision_provider: row.vision_provider ?? 'gemini',
  vision_model: row.vision_model ?? 'gemini-2.5-flash',
  vision_keys: row.vision_keys ?? '',
  ai_tone: row.ai_tone ?? 'Professional',
  ai_language: row.ai_language ?? 'English',
  ai_custom_instructions: row.ai_custom_instructions ?? '',
  auto_content_seo: row.auto_content_seo ?? true,
  auto_media_ai: row.auto_media_ai ?? true,
  target_audiences: row.target_audiences ?? '',
  product_types: row.product_types ?? '',
  category_default_template: row.category_default_template ?? '',
  product_default_template: row.product_default_template ?? '',
  category_description_prompt: row.category_description_prompt ?? '',
  category_description_limit: row.category_description_limit ?? 150,
  product_description_prompt: row.product_description_prompt ?? '',
  product_description_limit: row.product_description_limit ?? 250,
  product_short_prompt: row.product_short_prompt ?? '',
  product_short_limit: row.product_short_limit ?? 100,
  collection_default_template: row.collection_default_template ?? '',
  collection_description_prompt: row.collection_description_prompt ?? 'Write an engaging collection overview inspired by: Explore our exclusively curated collection, featuring premium styles, soft fabrics, and comfortable fits.',
  collection_description_limit: row.collection_description_limit ?? 80,

  // SMTP/Email Fallback Columns
  smtp_email: row.smtp_email ?? '',
  smtp_app_password: row.smtp_app_password ?? '',
  smtp_from_name: row.smtp_from_name ?? '',
  admin_notification_email: row.admin_notification_email ?? '',
  email_notifications: typeof row.email_notifications === 'string' ? JSON.parse(row.email_notifications) : (row.email_notifications ?? undefined),
  low_stock_threshold: row.low_stock_threshold ?? 5,
  abandonedCartEmailEnabled: row.abandoned_cart_email_enabled ?? false,
  abandonedCartAdminNotify: row.abandoned_cart_admin_notify ?? false,
  abandonedCartEmailSubject: row.abandoned_cart_email_subject ?? 'You left items in your cart!',
  abandonedCartEmailTemplate: row.abandoned_cart_email_template ?? 'Hi {{name}},\n\nYou left some items in your cart. Complete your purchase here:\n{{checkout_url}}',
  popularSearches: row.popular_searches ?? 'Co-ord Sets, Sonic, Graphic Tee, T-shirt, Kids',

  // PostEx courier integration
  postex_enabled: row.postex_enabled ?? false,
  postex_api_token: row.postex_api_token ?? '',
  postex_mode: row.postex_mode ?? 'sandbox',
  postex_pickup_address: row.postex_pickup_address ?? '',
  postex_return_address: row.postex_return_address ?? '',
  postex_order_type: row.postex_order_type ?? '',
  postex_handling_type: row.postex_handling_type ?? '',
  postex_default_remarks: row.postex_default_remarks ?? '',
  postex_pickup_display: row.postex_pickup_display ?? '',
  postex_return_display: row.postex_return_display ?? '',
  postex_return_city: row.postex_return_city ?? '',
  postex_product_check: row.postex_product_check ?? '1',
  postex_sku_check: row.postex_sku_check ?? '0',
  postex_weight_check: row.postex_weight_check ?? '1',
  postex_pieces_check: row.postex_pieces_check ?? '1',
  postex_cod_check: row.postex_cod_check ?? '0',
  postex_notes_check: row.postex_notes_check ?? '1',
  postex_default_weight: row.postex_default_weight ?? '0.5',
  postex_default_items: row.postex_default_items ?? '3',
  postex_default_product: row.postex_default_product ?? 'General Items',
  postex_whatsapp_template: row.postex_whatsapp_template ?? 'Dear {name}, your order has been booked. You can track it here: {url}\n{note}',
  postex_whatsapp_note: row.postex_whatsapp_note ?? 'Thank you for shopping with us!',
  postex_auto_download_label: row.postex_auto_download_label ?? false,

  updatedAt: row.updated_at
});

const fetchSettings = async (): Promise<StoreSettings> => {
  try {
    const { data, error } = await staticSupabase
      .from('store_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .maybeSingle();

    if (error) {
      logDbError({
        file: 'lib/services/settings.ts',
        functionName: 'fetchSettings',
        table: 'store_settings',
        action: 'SELECT'
      }, error);
      throw error;
    }
    if (data) return mapSettings(data);

    console.warn('[Settings Error Debug] store_settings row not found with staticSupabase, attempting fallback insert...');
    // Fallback (only run if somehow the row doesn't exist, which shouldn't happen under normal circumstances)
    const supabase = await createClient();
    const { data: insData, error: insError } = await supabase
      .from('store_settings')
      .insert({ id: SETTINGS_ID })
      .select('*')
      .single();

    if (insError) {
      logDbError({
        file: 'lib/services/settings.ts',
        functionName: 'fetchSettings (fallback insert)',
        table: 'store_settings',
        action: 'INSERT'
      }, insError);
      throw insError;
    }
    return mapSettings(insData);
  } catch (err) {
    logDbError({
      file: 'lib/services/settings.ts',
      functionName: 'fetchSettings (general catch)',
      table: 'store_settings',
      action: 'SELECT'
    }, err);
    return mapSettings({ id: SETTINGS_ID, updated_at: new Date().toISOString() } as any);
  }
};

const cachedSettings = unstable_cache(
  async () => fetchSettings(),
  ['store-settings-v3'],
  { revalidate: 86400, tags: ['settings'] }
);

export const getSettings = async () => {
  try {
    return await cachedSettings();
  } catch (error) {
    console.warn('[settings] cachedSettings failed, falling back to direct fetchSettings:', error);
    return fetchSettings();
  }
};


export const updateSettings = async (settings: Partial<StoreSettings>): Promise<StoreSettings> => {
  try {
    const updatePayload: Record<string, any> = {};

    if (settings.storeName !== undefined) updatePayload.store_name = settings.storeName;
    if (settings.storeUrl !== undefined) updatePayload.store_url = settings.storeUrl;
    if (settings.whatsappNumber !== undefined) updatePayload.whatsapp_number = settings.whatsappNumber;
    if (settings.currency !== undefined) updatePayload.currency = settings.currency;
    if (settings.currencySymbol !== undefined) updatePayload.currency_symbol = settings.currencySymbol;
    if (settings.orderPrefix !== undefined) updatePayload.order_prefix = settings.orderPrefix;
    if (settings.nextOrderSequence !== undefined) updatePayload.next_order_sequence = settings.nextOrderSequence;
    if (settings.logoUrl !== undefined) updatePayload.logo_url = settings.logoUrl;
    if (settings.logoWidth !== undefined) updatePayload.logo_width = settings.logoWidth;
    if (settings.bannerUrl !== undefined) updatePayload.banner_url = settings.bannerUrl;
    if (settings.faviconUrl !== undefined) updatePayload.favicon_url = settings.faviconUrl;
    if (settings.tagline !== undefined) updatePayload.tagline = settings.tagline;
    if (settings.address !== undefined) updatePayload.address = settings.address;
    if (settings.showStock !== undefined) updatePayload.show_stock = settings.showStock;
    if (settings.showComparePrice !== undefined) updatePayload.show_compare_price = settings.showComparePrice;
    if (settings.enableSearch !== undefined) updatePayload.enable_search = settings.enableSearch;
    if (settings.enableCategoryFilter !== undefined) updatePayload.enable_category_filter = settings.enableCategoryFilter;

    if (settings.whatsappGreeting !== undefined) updatePayload.whatsapp_greeting = settings.whatsappGreeting;
    if (settings.whatsappFooter !== undefined) updatePayload.whatsapp_footer = settings.whatsappFooter;
    if (settings.metaTitle !== undefined) updatePayload.meta_title = settings.metaTitle;
    if (settings.metaDescription !== undefined) updatePayload.meta_description = settings.metaDescription;
    if (settings.footerText !== undefined) updatePayload.footer_text = settings.footerText;
    if (settings.socialFacebook !== undefined) updatePayload.social_facebook = settings.socialFacebook;
    if (settings.socialInstagram !== undefined) updatePayload.social_instagram = settings.socialInstagram;
    if (settings.socialWhatsapp !== undefined) updatePayload.social_whatsapp = settings.socialWhatsapp;
    if (settings.socialYoutube !== undefined) updatePayload.social_youtube = settings.socialYoutube;
    if (settings.enableFakeViews !== undefined) updatePayload.enable_fake_views = settings.enableFakeViews;
    if (settings.minViews !== undefined) updatePayload.min_views = settings.minViews;
    if (settings.maxViews !== undefined) updatePayload.max_views = settings.maxViews;
    if (settings.enableTrustBadges !== undefined) updatePayload.enable_trust_badges = settings.enableTrustBadges;
    if (settings.deliveryEstimateText !== undefined) updatePayload.delivery_estimate_text = settings.deliveryEstimateText;
    if (settings.freeShippingText !== undefined) updatePayload.free_shipping_text = settings.freeShippingText;
    if (settings.promoCodeText !== undefined) updatePayload.promo_code_text = settings.promoCodeText;
    if (settings.enableSafeCheckout !== undefined) updatePayload.enable_safe_checkout = settings.enableSafeCheckout;
    if (settings.safeCheckoutText !== undefined) updatePayload.safe_checkout_text = settings.safeCheckoutText;
    if (settings.safeCheckoutMethods !== undefined) updatePayload.safe_checkout_methods = settings.safeCheckoutMethods;
    if (settings.enableTicker !== undefined) updatePayload.enable_ticker = settings.enableTicker;
    if (settings.tickerText !== undefined) updatePayload.ticker_text = settings.tickerText;
    if (settings.productDetailEnableTicker !== undefined) updatePayload.product_detail_enable_ticker = settings.productDetailEnableTicker;
    if (settings.productDetailTickerText !== undefined) updatePayload.product_detail_ticker_text = settings.productDetailTickerText;
    if (settings.enableVariantSwatches !== undefined) updatePayload.enable_variant_swatches = settings.enableVariantSwatches;
    if (settings.swatchShape !== undefined) updatePayload.swatch_shape = settings.swatchShape;
    if (settings.swatchSize !== undefined) updatePayload.swatch_size = settings.swatchSize;
    if (settings.swatchLimit !== undefined) updatePayload.swatch_limit = settings.swatchLimit;
    if (settings.defaultVariantIndex !== undefined) updatePayload.default_variant_index = settings.defaultVariantIndex;
    if (settings.imageHoverStyle !== undefined) updatePayload.image_hover_style = settings.imageHoverStyle;
    if (settings.imageAspectRatio !== undefined) updatePayload.image_aspect_ratio = settings.imageAspectRatio;
    if (settings.titleLineLimit !== undefined) updatePayload.title_line_limit = settings.titleLineLimit;
    if (settings.archiveSwatchSize !== undefined) updatePayload.archive_swatch_size = settings.archiveSwatchSize;
    if (settings.productSwatchSize !== undefined) updatePayload.product_swatch_size = settings.productSwatchSize;
    if (settings.archiveSwatchAlign !== undefined) updatePayload.archive_swatch_align = settings.archiveSwatchAlign;
    if (settings.headerSticky !== undefined) updatePayload.header_sticky = settings.headerSticky;
    if (settings.headerStickyDesktop !== undefined) updatePayload.header_sticky_desktop = settings.headerStickyDesktop;
    if (settings.headerStickyMobile !== undefined) updatePayload.header_sticky_mobile = settings.headerStickyMobile;
    if (settings.headerShowTopBar !== undefined) updatePayload.header_show_top_bar = settings.headerShowTopBar;
    if (settings.headerTopBarPhone !== undefined) updatePayload.header_top_bar_phone = settings.headerTopBarPhone;
    if (settings.headerTopBarEmail !== undefined) updatePayload.header_top_bar_email = settings.headerTopBarEmail;
    if (settings.headerShowNewsletter !== undefined) updatePayload.header_show_newsletter = settings.headerShowNewsletter;
    if (settings.headerNewsletterText !== undefined) updatePayload.header_newsletter_text = settings.headerNewsletterText;
    if (settings.headerTopBarBg !== undefined) updatePayload.header_top_bar_bg = settings.headerTopBarBg;
    if (settings.headerTopBarTextColor !== undefined) updatePayload.header_top_bar_text_color = settings.headerTopBarTextColor;
    if (settings.headerBg !== undefined) updatePayload.header_bg = settings.headerBg;
    if (settings.headerTextColor !== undefined) updatePayload.header_text_color = settings.headerTextColor;
    if (settings.headerBorderColor !== undefined) updatePayload.header_border_color = settings.headerBorderColor;
    if (settings.headerDesktopLogoAlign !== undefined) updatePayload.header_desktop_logo_align = settings.headerDesktopLogoAlign;
    if (settings.headerDesktopSearchAlign !== undefined) updatePayload.header_desktop_search_align = settings.headerDesktopSearchAlign;
    if (settings.headerDesktopWishlistAlign !== undefined) updatePayload.header_desktop_wishlist_align = settings.headerDesktopWishlistAlign;
    if (settings.headerDesktopCartAlign !== undefined) updatePayload.header_desktop_cart_align = settings.headerDesktopCartAlign;
    if (settings.headerDesktopThemeAlign !== undefined) updatePayload.header_desktop_theme_align = settings.headerDesktopThemeAlign;
    if (settings.headerMobileLogoAlign !== undefined) updatePayload.header_mobile_logo_align = settings.headerMobileLogoAlign;
    if (settings.headerMobileMenuAlign !== undefined) updatePayload.header_mobile_menu_align = settings.headerMobileMenuAlign;
    if (settings.headerMobileSearchAlign !== undefined) updatePayload.header_mobile_search_align = settings.headerMobileSearchAlign;
    if (settings.headerMobileCartAlign !== undefined) updatePayload.header_mobile_cart_align = settings.headerMobileCartAlign;
    if (settings.headerMobileWishlistAlign !== undefined) updatePayload.header_mobile_wishlist_align = settings.headerMobileWishlistAlign;
    if (settings.navigationMenu !== undefined) updatePayload.navigation_menu = settings.navigationMenu;
    if (settings.headerDesktopMenuAlign !== undefined) updatePayload.header_desktop_menu_align = settings.headerDesktopMenuAlign;
    if (settings.faqContent !== undefined) updatePayload.faq_content = settings.faqContent;
    if (settings.returnPolicyContent !== undefined) updatePayload.return_policy_content = settings.returnPolicyContent;
    if (settings.privacyPolicyContent !== undefined) updatePayload.privacy_policy_content = settings.privacyPolicyContent;
    if (settings.showFaqInNav !== undefined) updatePayload.show_faq_in_nav = settings.showFaqInNav;
    if (settings.showReturnsInNav !== undefined) updatePayload.show_returns_in_nav = settings.showReturnsInNav;
    if (settings.showPrivacyInNav !== undefined) updatePayload.show_privacy_in_nav = settings.showPrivacyInNav;
    if (settings.showFaqInFooter !== undefined) updatePayload.show_faq_in_footer = settings.showFaqInFooter;
    if (settings.showReturnsInFooter !== undefined) updatePayload.show_returns_in_footer = settings.showReturnsInFooter;
    if (settings.showPrivacyInFooter !== undefined) updatePayload.show_privacy_in_footer = settings.showPrivacyInFooter;

    if (settings.trustBadge1Title !== undefined) updatePayload.trust_badge_1_title = settings.trustBadge1Title;
    if (settings.trustBadge1Desc !== undefined) updatePayload.trust_badge_1_desc = settings.trustBadge1Desc;
    if (settings.trustBadge1Icon !== undefined) updatePayload.trust_badge_1_icon = settings.trustBadge1Icon;

    if (settings.trustBadge2Title !== undefined) updatePayload.trust_badge_2_title = settings.trustBadge2Title;
    if (settings.trustBadge2Desc !== undefined) updatePayload.trust_badge_2_desc = settings.trustBadge2Desc;
    if (settings.trustBadge2Icon !== undefined) updatePayload.trust_badge_2_icon = settings.trustBadge2Icon;

    if (settings.trustBadge3Title !== undefined) updatePayload.trust_badge_3_title = settings.trustBadge3Title;
    if (settings.trustBadge3Desc !== undefined) updatePayload.trust_badge_3_desc = settings.trustBadge3Desc;
    if (settings.trustBadge3Icon !== undefined) updatePayload.trust_badge_3_icon = settings.trustBadge3Icon;

    if (settings.trustBadge4Title !== undefined) updatePayload.trust_badge_4_title = settings.trustBadge4Title;
    if (settings.trustBadge4Desc !== undefined) updatePayload.trust_badge_4_desc = settings.trustBadge4Desc;
    if (settings.trustBadge4Icon !== undefined) updatePayload.trust_badge_4_icon = settings.trustBadge4Icon;

    if (settings.trustBadge1Enabled !== undefined) updatePayload.trust_badge_1_enabled = settings.trustBadge1Enabled;
    if (settings.trustBadge2Enabled !== undefined) updatePayload.trust_badge_2_enabled = settings.trustBadge2Enabled;
    if (settings.trustBadge3Enabled !== undefined) updatePayload.trust_badge_3_enabled = settings.trustBadge3Enabled;
    if (settings.trustBadge4Enabled !== undefined) updatePayload.trust_badge_4_enabled = settings.trustBadge4Enabled;

    if (settings.socialTiktok !== undefined) updatePayload.social_tiktok = settings.socialTiktok;
    if (settings.socialSnapchat !== undefined) updatePayload.social_snapchat = settings.socialSnapchat;
    if (settings.socialTwitter !== undefined) updatePayload.social_twitter = settings.socialTwitter;

    if (settings.footerCol1Title !== undefined) updatePayload.footer_col_1_title = settings.footerCol1Title;
    if (settings.footerCol2Title !== undefined) updatePayload.footer_col_2_title = settings.footerCol2Title;
    if (settings.footerCol2Text !== undefined) updatePayload.footer_col_2_text = settings.footerCol2Text;
    if (settings.footerCol3Title !== undefined) updatePayload.footer_col_3_title = settings.footerCol3Title;
    if (settings.footerCol4Title !== undefined) updatePayload.footer_col_4_title = settings.footerCol4Title;
    if (settings.footerCol4Text !== undefined) updatePayload.footer_col_4_text = settings.footerCol4Text;
    if (settings.footerBottomText !== undefined) updatePayload.footer_bottom_text = settings.footerBottomText;
    if (settings.footerShowPayments !== undefined) updatePayload.footer_show_payments = settings.footerShowPayments;
    if (settings.footerShowMenu !== undefined) updatePayload.footer_show_menu = settings.footerShowMenu;
    if (settings.footerShowNewsletter !== undefined) updatePayload.footer_show_newsletter = settings.footerShowNewsletter;
    if (settings.footerShowSocial !== undefined) updatePayload.footer_show_social = settings.footerShowSocial;

    if (settings.floatingContactsEnabled !== undefined) updatePayload.floating_contacts_enabled = settings.floatingContactsEnabled;
    if (settings.floatingContactsPosition !== undefined) updatePayload.floating_contacts_position = settings.floatingContactsPosition;
    if (settings.floatingContactsBottomMobile !== undefined) updatePayload.floating_contacts_bottom_mobile = settings.floatingContactsBottomMobile;
    if (settings.floatingContactsBottomDesktop !== undefined) updatePayload.floating_contacts_bottom_desktop = settings.floatingContactsBottomDesktop;
    if (settings.floatingContactsSideMobile !== undefined) updatePayload.floating_contacts_side_mobile = settings.floatingContactsSideMobile;
    if (settings.floatingContactsSideDesktop !== undefined) updatePayload.floating_contacts_side_desktop = settings.floatingContactsSideDesktop;
    if (settings.floatingContactsScale !== undefined) updatePayload.floating_contacts_scale = settings.floatingContactsScale;
    if (settings.floatingWhatsappPreset !== undefined) updatePayload.floating_whatsapp_preset = settings.floatingWhatsappPreset;
    if (settings.floatingWhatsappNumber !== undefined) updatePayload.floating_whatsapp_number = settings.floatingWhatsappNumber;
    if (settings.floatingWhatsappEnabled !== undefined) updatePayload.floating_whatsapp_enabled = settings.floatingWhatsappEnabled;
    if (settings.floatingInstagramEnabled !== undefined) updatePayload.floating_instagram_enabled = settings.floatingInstagramEnabled;
    if (settings.floatingTiktokEnabled !== undefined) updatePayload.floating_tiktok_enabled = settings.floatingTiktokEnabled;
    if (settings.floatingSnapchatEnabled !== undefined) updatePayload.floating_snapchat_enabled = settings.floatingSnapchatEnabled;
    if (settings.floatingTwitterEnabled !== undefined) updatePayload.floating_twitter_enabled = settings.floatingTwitterEnabled;

    if (settings.exit_intent_enabled !== undefined) updatePayload.exit_intent_enabled = settings.exit_intent_enabled;
    if (settings.exit_intent_title !== undefined) updatePayload.exit_intent_title = settings.exit_intent_title;
    if (settings.exit_intent_text !== undefined) updatePayload.exit_intent_text = settings.exit_intent_text;
    if (settings.exit_intent_coupon !== undefined) updatePayload.exit_intent_coupon = settings.exit_intent_coupon;
    if (settings.spin_wheel_enabled !== undefined) updatePayload.spin_wheel_enabled = settings.spin_wheel_enabled;
    if (settings.spin_wheel_segments !== undefined) updatePayload.spin_wheel_segments = settings.spin_wheel_segments;
    if (settings.cart_timer_minutes !== undefined) updatePayload.cart_timer_minutes = settings.cart_timer_minutes;
    if (settings.free_shipping_threshold !== undefined) updatePayload.free_shipping_threshold = settings.free_shipping_threshold;
    if (settings.volume_discount_threshold !== undefined) updatePayload.volume_discount_threshold = settings.volume_discount_threshold;
    if (settings.volume_discount_percentage !== undefined) updatePayload.volume_discount_percentage = settings.volume_discount_percentage;
    if (settings.recent_buyers !== undefined) updatePayload.recent_buyers = typeof settings.recent_buyers === 'string' ? JSON.parse(settings.recent_buyers) : settings.recent_buyers;
    if (settings.recently_viewed_limit !== undefined) updatePayload.recently_viewed_limit = settings.recently_viewed_limit;
    if (settings.recent_buyers_enabled !== undefined) updatePayload.recent_buyers_enabled = settings.recent_buyers_enabled;
    if (settings.cookie_consent_enabled !== undefined) updatePayload.cookie_consent_enabled = settings.cookie_consent_enabled;
    if (settings.free_shipping_bar_enabled !== undefined) updatePayload.free_shipping_bar_enabled = settings.free_shipping_bar_enabled;
    if (settings.volume_discounts_enabled !== undefined) updatePayload.volume_discounts_enabled = settings.volume_discounts_enabled;
    if (settings.frequently_bought_together_enabled !== undefined) updatePayload.frequently_bought_together_enabled = settings.frequently_bought_together_enabled;
    if (settings.stock_urgency_enabled !== undefined) updatePayload.stock_urgency_enabled = settings.stock_urgency_enabled;
    if (settings.flash_sale_enabled !== undefined) updatePayload.flash_sale_enabled = settings.flash_sale_enabled;
    if (settings.flash_sale_start_date !== undefined) updatePayload.flash_sale_start_date = settings.flash_sale_start_date;
    if (settings.flash_sale_end_date !== undefined) updatePayload.flash_sale_end_date = settings.flash_sale_end_date;
    if (settings.globalFlashSaleDiscountType !== undefined) updatePayload.global_flash_sale_discount_type = settings.globalFlashSaleDiscountType;
    if (settings.globalFlashSaleDiscountValue !== undefined) updatePayload.global_flash_sale_discount_value = settings.globalFlashSaleDiscountValue;
    if (settings.social_feeds_enabled !== undefined) updatePayload.social_feeds_enabled = settings.social_feeds_enabled;
    if (settings.cart_timer_enabled !== undefined) updatePayload.cart_timer_enabled = settings.cart_timer_enabled;
    if (settings.size_guide_enabled !== undefined) updatePayload.size_guide_enabled = settings.size_guide_enabled;

    if (settings.recent_buyers_names !== undefined) updatePayload.recent_buyers_names = settings.recent_buyers_names;
    if (settings.recent_buyers_cities !== undefined) updatePayload.recent_buyers_cities = settings.recent_buyers_cities;
    if (settings.recent_buyers_source !== undefined) updatePayload.recent_buyers_source = settings.recent_buyers_source;
    if (settings.recent_buyers_product_pool !== undefined) updatePayload.recent_buyers_product_pool = settings.recent_buyers_product_pool;
    if (settings.recent_buyers_custom_products !== undefined) updatePayload.recent_buyers_custom_products = typeof settings.recent_buyers_custom_products === 'string' ? JSON.parse(settings.recent_buyers_custom_products) : settings.recent_buyers_custom_products;
    if (settings.recent_buyers_initial_delay !== undefined) updatePayload.recent_buyers_initial_delay = settings.recent_buyers_initial_delay;
    if (settings.recent_buyers_interval !== undefined) updatePayload.recent_buyers_interval = settings.recent_buyers_interval;
    if (settings.recent_buyers_display_duration !== undefined) updatePayload.recent_buyers_display_duration = settings.recent_buyers_display_duration;
    if (settings.recent_buyers_show_on_checkout !== undefined) updatePayload.recent_buyers_show_on_checkout = settings.recent_buyers_show_on_checkout;
    if (settings.exit_intent_image_url !== undefined) updatePayload.exit_intent_image_url = settings.exit_intent_image_url;
    if (settings.exit_intent_delay_mobile !== undefined) updatePayload.exit_intent_delay_mobile = settings.exit_intent_delay_mobile;
    if (settings.cookie_consent_text !== undefined) updatePayload.cookie_consent_text = settings.cookie_consent_text;
    if (settings.cookie_consent_button_text !== undefined) updatePayload.cookie_consent_button_text = settings.cookie_consent_button_text;
    if (settings.social_feeds_homepage_enabled !== undefined) updatePayload.social_feeds_homepage_enabled = settings.social_feeds_homepage_enabled;
    if (settings.social_feeds_product_enabled !== undefined) updatePayload.social_feeds_product_enabled = settings.social_feeds_product_enabled;
    if (settings.social_feeds_title !== undefined) updatePayload.social_feeds_title = settings.social_feeds_title;
    if (settings.social_feeds_subtitle !== undefined) updatePayload.social_feeds_subtitle = settings.social_feeds_subtitle;
    if (settings.social_feeds_desc !== undefined) updatePayload.social_feeds_desc = settings.social_feeds_desc;
    if (settings.social_feeds_items !== undefined) updatePayload.social_feeds_items = typeof settings.social_feeds_items === 'string' ? JSON.parse(settings.social_feeds_items) : settings.social_feeds_items;
    if (settings.cart_timer_message !== undefined) updatePayload.cart_timer_message = settings.cart_timer_message;
    if (settings.coupon_codes_enabled !== undefined) updatePayload.coupon_codes_enabled = settings.coupon_codes_enabled;
    if (settings.productPageLayout !== undefined) updatePayload.product_page_layout = settings.productPageLayout;
    if (settings.theme_preset !== undefined) updatePayload.theme_preset = settings.theme_preset;
    if (settings.theme_config !== undefined) updatePayload.theme_config = settings.theme_config;
    if (settings.card_style !== undefined) updatePayload.card_style = settings.card_style;
    if (settings.card_variant !== undefined) updatePayload.card_variant = settings.card_variant;
    if (settings.card_show_stars !== undefined) updatePayload.card_show_stars = settings.card_show_stars;
    if (settings.card_show_quickview !== undefined) updatePayload.card_show_quickview = settings.card_show_quickview;
    if (settings.card_show_wishlist !== undefined) updatePayload.card_show_wishlist = settings.card_show_wishlist;
    if (settings.card_show_quickcart !== undefined) updatePayload.card_show_quickcart = settings.card_show_quickcart;
    if (settings.card_show_description !== undefined) updatePayload.card_show_description = settings.card_show_description;
    if (settings.card_show_swatches !== undefined) updatePayload.card_show_swatches = settings.card_show_swatches;
    if (settings.card_show_sizes !== undefined) updatePayload.card_show_sizes = settings.card_show_sizes;
    if (settings.card_show_materials !== undefined) updatePayload.card_show_materials = settings.card_show_materials;
    if (settings.card_show_custom !== undefined) updatePayload.card_show_custom = settings.card_show_custom;
    if (settings.card_show_custom_2 !== undefined) updatePayload.card_show_custom_2 = settings.card_show_custom_2;
    if (settings.card_show_type_color !== undefined) updatePayload.card_show_type_color = settings.card_show_type_color;
    if (settings.card_show_type_size !== undefined) updatePayload.card_show_type_size = settings.card_show_type_size;
    if (settings.card_show_type_material !== undefined) updatePayload.card_show_type_material = settings.card_show_type_material;
    if (settings.card_show_type_custom !== undefined) updatePayload.card_show_type_custom = settings.card_show_type_custom;
    if (settings.card_alignment !== undefined) updatePayload.card_alignment = settings.card_alignment;
    if (settings.card_elements_order !== undefined) updatePayload.card_elements_order = settings.card_elements_order;
    if (settings.card_mobile_columns !== undefined) updatePayload.card_mobile_columns = settings.card_mobile_columns;

    // Pixels & Tracking
    if (settings.meta_pixel_id !== undefined) updatePayload.meta_pixel_id = settings.meta_pixel_id;
    if (settings.meta_sync_enabled !== undefined) updatePayload.meta_sync_enabled = settings.meta_sync_enabled;
    if (settings.ga4_measurement_id !== undefined) updatePayload.ga4_measurement_id = settings.ga4_measurement_id;
    if (settings.gtm_container_id !== undefined) updatePayload.gtm_container_id = settings.gtm_container_id;
    if (settings.tiktok_pixel_id !== undefined) updatePayload.tiktok_pixel_id = settings.tiktok_pixel_id;
    if (settings.twitter_pixel_id !== undefined) updatePayload.twitter_pixel_id = settings.twitter_pixel_id;
    if (settings.snapchat_pixel_id !== undefined) updatePayload.snapchat_pixel_id = settings.snapchat_pixel_id;
    if (settings.pinterest_tag_id !== undefined) updatePayload.pinterest_tag_id = settings.pinterest_tag_id;

    // Social & SEO
    if (settings.twitter_handle !== undefined) updatePayload.twitter_handle = settings.twitter_handle;
    if (settings.meta_title_suffix !== undefined) updatePayload.meta_title_suffix = settings.meta_title_suffix;

    // AI settings
    if (settings.ai_enabled !== undefined) updatePayload.ai_enabled = settings.ai_enabled;
    if (settings.ai_model_credentials !== undefined) updatePayload.ai_model_credentials = settings.ai_model_credentials;
    if (settings.ai_persona_config !== undefined) updatePayload.ai_persona_config = settings.ai_persona_config;
    if (settings.content_provider !== undefined) updatePayload.content_provider = settings.content_provider;
    if (settings.content_model !== undefined) updatePayload.content_model = settings.content_model;
    if (settings.content_keys !== undefined) updatePayload.content_keys = settings.content_keys;
    if (settings.vision_provider !== undefined) updatePayload.vision_provider = settings.vision_provider;
    if (settings.vision_model !== undefined) updatePayload.vision_model = settings.vision_model;
    if (settings.vision_keys !== undefined) updatePayload.vision_keys = settings.vision_keys;
    if (settings.ai_tone !== undefined) updatePayload.ai_tone = settings.ai_tone;
    if (settings.ai_language !== undefined) updatePayload.ai_language = settings.ai_language;
    if (settings.ai_custom_instructions !== undefined) updatePayload.ai_custom_instructions = settings.ai_custom_instructions;
    if (settings.auto_content_seo !== undefined) updatePayload.auto_content_seo = settings.auto_content_seo;
    if (settings.auto_media_ai !== undefined) updatePayload.auto_media_ai = settings.auto_media_ai;
    if (settings.category_default_template !== undefined) updatePayload.category_default_template = settings.category_default_template;
    if (settings.product_default_template !== undefined) updatePayload.product_default_template = settings.product_default_template;
    if (settings.category_description_prompt !== undefined) updatePayload.category_description_prompt = settings.category_description_prompt;
    if (settings.category_description_limit !== undefined) updatePayload.category_description_limit = settings.category_description_limit;
    if (settings.product_description_prompt !== undefined) updatePayload.product_description_prompt = settings.product_description_prompt;
    if (settings.product_description_limit !== undefined) updatePayload.product_description_limit = settings.product_description_limit;
    if (settings.product_short_prompt !== undefined) updatePayload.product_short_prompt = settings.product_short_prompt;
    if (settings.product_short_limit !== undefined) updatePayload.product_short_limit = settings.product_short_limit;
    if (settings.collection_default_template !== undefined) updatePayload.collection_default_template = settings.collection_default_template;
    if (settings.collection_description_prompt !== undefined) updatePayload.collection_description_prompt = settings.collection_description_prompt;
    if (settings.collection_description_limit !== undefined) updatePayload.collection_description_limit = settings.collection_description_limit;

    // SMTP/Email Fallback Columns
    if (settings.smtp_email !== undefined) updatePayload.smtp_email = settings.smtp_email;
    if (settings.smtp_app_password !== undefined) updatePayload.smtp_app_password = settings.smtp_app_password;
    if (settings.smtp_from_name !== undefined) updatePayload.smtp_from_name = settings.smtp_from_name;
    if (settings.admin_notification_email !== undefined) updatePayload.admin_notification_email = settings.admin_notification_email;
    if (settings.email_notifications !== undefined) updatePayload.email_notifications = typeof settings.email_notifications === 'string' ? JSON.parse(settings.email_notifications) : settings.email_notifications;
    if (settings.low_stock_threshold !== undefined) updatePayload.low_stock_threshold = settings.low_stock_threshold;
    if (settings.abandonedCartEmailEnabled !== undefined) updatePayload.abandoned_cart_email_enabled = settings.abandonedCartEmailEnabled;
    if (settings.abandonedCartAdminNotify !== undefined) updatePayload.abandoned_cart_admin_notify = settings.abandonedCartAdminNotify;
    if (settings.abandonedCartEmailSubject !== undefined) updatePayload.abandoned_cart_email_subject = settings.abandonedCartEmailSubject;
    if (settings.abandonedCartEmailTemplate !== undefined) updatePayload.abandoned_cart_email_template = settings.abandonedCartEmailTemplate;
    if (settings.popularSearches !== undefined) updatePayload.popular_searches = settings.popularSearches;
    if (settings.postex_enabled !== undefined) updatePayload.postex_enabled = settings.postex_enabled;
    if (settings.postex_api_token !== undefined) updatePayload.postex_api_token = settings.postex_api_token;
    if (settings.postex_mode !== undefined) updatePayload.postex_mode = settings.postex_mode;
    if (settings.postex_pickup_address !== undefined) updatePayload.postex_pickup_address = settings.postex_pickup_address;
    if (settings.postex_return_address !== undefined) updatePayload.postex_return_address = settings.postex_return_address;
    if (settings.postex_order_type !== undefined) updatePayload.postex_order_type = settings.postex_order_type;
    if (settings.postex_handling_type !== undefined) updatePayload.postex_handling_type = settings.postex_handling_type;
    if (settings.postex_default_remarks !== undefined) updatePayload.postex_default_remarks = settings.postex_default_remarks;
    if (settings.postex_pickup_display !== undefined) updatePayload.postex_pickup_display = settings.postex_pickup_display;
    if (settings.postex_return_display !== undefined) updatePayload.postex_return_display = settings.postex_return_display;
    if (settings.postex_return_city !== undefined) updatePayload.postex_return_city = settings.postex_return_city;
    if (settings.postex_product_check !== undefined) updatePayload.postex_product_check = settings.postex_product_check;
    if (settings.postex_sku_check !== undefined) updatePayload.postex_sku_check = settings.postex_sku_check;
    if (settings.postex_weight_check !== undefined) updatePayload.postex_weight_check = settings.postex_weight_check;
    if (settings.postex_pieces_check !== undefined) updatePayload.postex_pieces_check = settings.postex_pieces_check;
    if (settings.postex_cod_check !== undefined) updatePayload.postex_cod_check = settings.postex_cod_check;
    if (settings.postex_notes_check !== undefined) updatePayload.postex_notes_check = settings.postex_notes_check;
    if (settings.postex_default_weight !== undefined) updatePayload.postex_default_weight = settings.postex_default_weight;
    if (settings.postex_default_items !== undefined) updatePayload.postex_default_items = settings.postex_default_items;
    if (settings.postex_default_product !== undefined) updatePayload.postex_default_product = settings.postex_default_product;
    if (settings.postex_whatsapp_template !== undefined) updatePayload.postex_whatsapp_template = settings.postex_whatsapp_template;
    if (settings.postex_whatsapp_note !== undefined) updatePayload.postex_whatsapp_note = settings.postex_whatsapp_note;
    if (settings.postex_auto_download_label !== undefined) updatePayload.postex_auto_download_label = settings.postex_auto_download_label;

    // Use service role client for writes — bypasses RLS safely since this
    // server action is already behind Next.js middleware auth.
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .update(updatePayload)
      .eq('id', SETTINGS_ID)
      .select('*')
      .single();

    if (error) throw error;
    try {
      await revalidateSettings();
    } catch (revalErr) {
      console.error('[settings] revalidateSettings failed during update:', revalErr);
    }
    return mapSettings(data);
  } catch (error) {
    logDbError({
      file: 'lib/services/settings.ts',
      functionName: 'updateSettings',
      table: 'store_settings',
      action: 'UPDATE'
    }, error);
    const message = (error as any)?.message || (error as any)?.toString() || 'Failed to update settings';
    throw new Error(String(message));
  }
};

// ============================================================================
// SAFE ACTION WRAPPERS (Prevent Next.js Production Error Masking)
// ============================================================================
import { safeAction } from '@/lib/utils/serverAction';

export const updateSettingsSafe = async (settings: Partial<StoreSettings>) => safeAction(updateSettings(settings));
