import React from 'react';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/store/ProductDetail';
import ProductReviews from '@/components/store/ProductReviews';
import ProductCard from '@/components/store/ProductCard';
import { getProducts, getProductBySlug, getRelatedProducts } from '@/lib/services/products';
import { getSettings } from '@/lib/services/settings';
import { getProductReviews, getAverageRating } from '@/lib/services/reviews';
import { getSocialProofCountForProduct } from '@/lib/services/socialProof';
import { Product } from '@/lib/types';
import RecentlyViewed from '@/components/store/RecentlyViewed';
import SocialFeedRibbon from '@/components/store/SocialFeedRibbon';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSiteUrl } from '@/lib/site-url-server';
import { cleanLocalhostUrls } from '@/lib/site-url';
import { getDomainBrand, cleanBrandName } from '@/lib/utils/getDomainBrand';
import { getDomainConfig } from '@/lib/config/domains';
import { Metadata } from 'next';
import Breadcrumb from '@/components/Breadcrumb';

export const revalidate = 86400; // 24 hours — webhooks purge on admin save
export const dynamicParams = true; // allow new slugs added after build

export async function generateStaticParams() {
  try {
    const products = await getProducts();
    return products.map((product) => ({ slug: product.slug }));
  } catch {
    return [];
  }
}


interface PageProps {
  params: Promise<{ slug: string }>;
}

function cleanMetaDescription(htmlText: string, siteUrl: string): string {
  if (!htmlText) return '';
  let text = cleanLocalhostUrls(htmlText, siteUrl);
  text = text.replace(/<[^>]*>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const brand = await getDomainBrand();
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) return {};

    const { data: seoMeta } = await supabaseAdmin
      .from('seo_meta')
      .select('*')
      .eq('entity_type', 'product')
      .eq('entity_id', product.id)
      .maybeSingle();

    const settings = await getSettings();
    const siteUrl = `${brand.protocol}://${brand.domain}`;

    const title = cleanBrandName(seoMeta?.seo_title, brand.name) || `${product.name} | ${brand.name}`;
    
    const rawDescription = cleanBrandName(seoMeta?.meta_description, brand.name) || cleanMetaDescription(product.description || '', siteUrl);
    const description = rawDescription.length > 160 ? `${rawDescription.slice(0, 157)}...` : rawDescription;

    const canonicalUrl = `${siteUrl}/product/${slug}`;
    const imageUrl = product.images?.[0]?.url 
      ? cleanLocalhostUrls(product.images[0].url, siteUrl) 
      : settings.logoUrl || settings.faviconUrl || '';

    return {
      metadataBase: new URL(siteUrl),
      title,
      description,
      keywords: seoMeta?.keywords ? seoMeta.keywords.split(',').map((k: string) => k.trim()) : (product.tags && product.tags.length > 0 ? product.tags : undefined),
      alternates: {
        canonical: canonicalUrl,
      },
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        title: seoMeta?.og_title || title,
        description: seoMeta?.og_description || description,
        url: canonicalUrl,
        type: 'website',
        images: [{ url: imageUrl }],
      },
      twitter: {
        card: 'summary_large_image',
        title: seoMeta?.twitter_title || title,
        description: seoMeta?.twitter_description || description,
        images: [imageUrl],
      },
      other: {
        'product:price:amount': product.price.toString(),
        'product:price:currency': 'PKR',
        'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
        'product:retailer_item_id': product.id,
      }
    };
  } catch {
    return {
      title: 'Product Details',
      description: 'View product details.',
    };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Get seo meta details
  const { data: seoMeta } = await supabaseAdmin
    .from('seo_meta')
    .select('*')
    .eq('entity_type', 'product')
    .eq('entity_id', product.id)
    .maybeSingle();

  const [settings, reviews, averageRating, relatedProducts] = await Promise.all([
    getSettings(),
    getProductReviews(product.id),
    getAverageRating(product.id),
    getRelatedProducts(product.id, product.categoryId, 4)
  ]);

  const socialProofCount = await getSocialProofCountForProduct(product.id);

  const layout = settings.productPageLayout || ['details', 'ticker', 'reviews', 'related', 'recently_viewed', 'social_feed'];

  let schemaBrandName = 'Store';
  let siteUrl = settings?.storeUrl?.replace(/\/+$/, '') || 'https://zaynahs.pk';
  try {
    const brand = await getDomainBrand();
    schemaBrandName = brand.name;
    if (!settings?.storeUrl) {
      siteUrl = `${brand.protocol}://${brand.domain}`;
    }
  } catch {}

  const productSchema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.images?.map(i => cleanLocalhostUrls(i.url, siteUrl)) || [],
    "description": cleanMetaDescription(product.description || '', siteUrl),
    "sku": product.sku || product.id,
    "brand": {
      "@type": "Brand",
      "name": schemaBrandName
    },
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "PKR",
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": `${siteUrl}/product/${slug}`
    }
  };

  if (averageRating && averageRating.count > 0) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": averageRating.average.toString(),
      "reviewCount": averageRating.count.toString(),
      "bestRating": "5",
      "worstRating": "1"
    };
  }

  if (reviews && reviews.length > 0) {
    productSchema.review = reviews.map((r: any) => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": r.customerName
      },
      "datePublished": r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      "reviewBody": r.comment || '',
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating.toString(),
        "bestRating": "5",
        "worstRating": "1"
      }
    }));
  }

  const faqSchema = seoMeta?.faq_schema && Array.isArray(seoMeta.faq_schema) && seoMeta.faq_schema.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": seoMeta.faq_schema.map((item: any) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a
      }
    }))
  } : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <Breadcrumb
          siteUrl={siteUrl}
          items={[
            ...(product.category ? [{ label: product.category.name, href: `/shop?category=${product.category.slug}` }] : []),
            { label: product.name, href: `/product/${slug}` }
          ]}
        />
      </div>

      <div className="space-y-10 pb-16">
        {layout.map((block: string) => {
          if (block === 'details') {
            return (
              <ProductDetail key="details" product={product} settings={settings} averageRating={averageRating} socialProofCount={socialProofCount ?? 0} />
            );
          }
          if (block === 'ticker') {
            if (!settings.productDetailEnableTicker || !settings.productDetailTickerText) return null;
            return (
              <div key="ticker" className="w-full overflow-hidden bg-gray-50 dark:bg-white/5 border-y border-gray-200 dark:border-gray-800 py-3.5 select-none relative">
                <style>{`
                  @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                  .animate-marquee-infinite {
                    display: flex;
                    width: max-content;
                    animation: marquee 30s linear infinite;
                  }
                  .animate-marquee-infinite:hover {
                    animation-play-state: paused;
                  }
                `}</style>
                
                <div className="animate-marquee-infinite flex items-center whitespace-nowrap gap-8">
                  {[...Array(4)].map((_, loopIdx) => (
                    <div key={loopIdx} className="flex items-center gap-8">
                      {settings.productDetailTickerText.split('\n').filter(Boolean).map((item: string, itemIdx: number) => (
                        <div key={itemIdx} className="flex items-center gap-8 text-sm font-bold text-gray-850 dark:text-gray-200 uppercase tracking-wider">
                          <span>{item}</span>
                          <span className="text-gray-400 dark:text-gray-600 font-normal">✦</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (block === 'reviews') {
            return (
              <div key="reviews" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <ProductReviews product={product} reviews={reviews} averageRating={averageRating} socialProofCount={socialProofCount ?? 0} />
              </div>
            );
          }
          if (block === 'related') {
            if (relatedProducts.length === 0) return null;
            return (
              <div key="related" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800 pt-10">
                <div className="text-center md:text-left mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Related Products</h3>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                    You might also like these handpicked recommendations
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {relatedProducts.map((prod: Product) => (
                    <ProductCard key={prod.id} product={prod} currencySymbol={settings.currencySymbol} settings={settings} />
                  ))}
                </div>
              </div>
            );
          }
          if (block === 'recently_viewed') {
            return (
              <RecentlyViewed 
                key="recently_viewed" 
                settings={settings} 
                currentProductId={product.id} 
              />
            );
          }
          if (block === 'social_feed') {
            return (
              <SocialFeedRibbon 
                key="social_feed" 
                settings={settings} 
              />
            );
          }
          return null;
        })}
      </div>
    </>
  );
}
