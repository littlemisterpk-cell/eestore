'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Upload, Star, Bold, Italic, Underline, List, ListOrdered, Code, Eye, X, FolderOpen, Search, Check, Image as ImageIcon, ChevronDown, ChevronUp, Zap, Loader2, GripVertical, AlertTriangle } from '@/components/common/Icons';
import HorizontalSortableList from '@/components/admin/HorizontalSortableList';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { arrayMove } from '@/lib/utils/arrayMove';
import { CSS } from '@dnd-kit/utilities';
import { Product, ProductImage, ProductVariant, ProductModifier, Category, VariantPreset, VariantPresetValue, Badge, SizeGuide } from '@/lib/types';
import { createProductSafe, updateProductSafe } from '@/lib/services/products';
import { deleteProductImage } from '@/lib/services/storage';
import { uploadImage } from '@/lib/uploadImage';
import AdminSearchInput from '@/components/admin/shared/AdminSearchInput';
import ImagePreviewModal from '@/components/admin/ImagePreviewModal';
import { useConfirm } from '@/components/admin/shared/AdminConfirmProvider';
import MediaSelectorModal from './MediaSelectorModal';
import { getVariantPresets } from '@/lib/services/variantPresets';
import { getSizeGuides } from '@/lib/services/sizeGuides';
import { getBadges } from '@/lib/services/badges';
import { createClient } from '@/lib/supabase/client';
import { getClientSiteUrl } from '@/lib/site-url';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getSwatchStyle } from '@/lib/utils/swatch';
interface ProductFormProps {
  categories: Category[];

  initialProduct?: Product | null;
  aiEnabled?: boolean;
  storeUrl?: string;
}

import { extractColorsFromName } from '@/lib/utils/swatch';

function SortableImageItem({
  img,
  index,
  handleRemoveImage,
  onPreviewImage,
}: {
  img: any;
  index: number;
  handleRemoveImage: (idx: number, url: string) => void;
  onPreviewImage: (url: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.url });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 9999 : 1,
    scale: isDragging ? '1.05' : '1',
    boxShadow: isDragging ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative select-none animate-in fade-in duration-200"
    >
      {/* Image container */}
      <div 
        className="relative aspect-square rounded-lg border border-gray-150 bg-gray-50 dark:bg-gray-850 dark:border-gray-800 overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
        {...attributes}
        {...listeners}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={`Preview ${index}`} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

        {/* Desktop-only hover overlay (hidden on mobile) */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-1 z-20 pointer-events-auto">
          <button
            type="button"
            className={`p-1.5 rounded-lg text-white ${img.isPrimary ? 'text-amber-400' : 'opacity-0'}`}
            title="Primary"
          >
            <Star className="h-4.5 w-4.5 fill-current" />
          </button>
          
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPreviewImage(img.url);
            }}
            className="p-1.5 rounded-lg text-white hover:bg-white/20"
            title="Preview Image"
          >
            <Eye className="h-4.5 w-4.5" />
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRemoveImage(index, img.url);
            }}
            className="p-1.5 rounded-lg text-red-400 hover:bg-white/20"
            title="Delete Image"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Badges always visible */}
        {img.isPrimary && (
          <span className="absolute top-1.5 right-1.5 z-30 bg-amber-400 text-[9px] font-extrabold text-[#1a1a2e] px-1.5 py-0.5 rounded-md shadow-md">
            PRIMARY
          </span>
        )}
        
        {/* Combined Grip handle and index number badge */}
        <div className="absolute top-1.5 left-1.5 z-30 flex items-center gap-1 bg-[#1a1a2e]/80 text-white px-2 py-0.5 rounded-lg shadow-md border border-white/10 select-none">
          <GripVertical className="h-3 w-3 text-gray-300 flex-shrink-0" />
          <span className="text-[10px] font-extrabold tabular-nums">
            {index + 1}
          </span>
        </div>
      </div>

      {/* Mobile-only action buttons below image — no accidental deletes */}
      <div className="mt-1.5 flex gap-1.5 md:hidden z-20 relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveImage(index, img.url);
          }}
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-all cursor-pointer"
          title="Remove Image"
        >
          <Trash2 className="h-3 w-3" />
          Remove
        </button>
      </div>
    </div>
  );
}

export default function ProductForm({ categories, initialProduct, aiEnabled, storeUrl }: ProductFormProps) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const isEdit = !!initialProduct?.id;

  const flattenedCategories = React.useMemo(() => {
    return categories.map(c => ({ ...c, _level: 0 }));
  }, [categories]);

  // 1. Core States
  const [name, setName] = useState(initialProduct?.name || '');
  const [slug, setSlug] = useState(initialProduct?.slug || '');
  const [sku, setSku] = useState(initialProduct?.sku || '');
  const [price, setPrice] = useState(initialProduct?.price?.toString() || '0');
  const [comparePrice, setComparePrice] = useState(initialProduct?.comparePrice?.toString() || '');
  const [cost, setCost] = useState(initialProduct?.cost?.toString() || '0');
  const [categoryId, setCategoryId] = useState(initialProduct?.categoryId || '');

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    (initialProduct?.productCategories && initialProduct.productCategories.length > 0)
      ? initialProduct.productCategories.map(pc => pc.categoryId) 
      : (initialProduct?.categoryId ? [initialProduct.categoryId] : [])
  );
  const [inventoryThreshold, setInventoryThreshold] = useState(initialProduct?.inventoryThreshold?.toString() || '0');
  const [stock, setStock] = useState(initialProduct?.stock?.toString() || '0');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [shortDescription, setShortDescription] = useState(initialProduct?.shortDescription || '');
  const [tagInput, setTagInput] = useState(initialProduct?.tags?.join(', ') || '');
  const [enableSwatches, setEnableSwatches] = useState<boolean>(initialProduct?.enableSwatches ?? true);
  const [showSwatchesOnArchive, setShowSwatchesOnArchive] = useState<boolean>(initialProduct?.showSwatchesOnArchive ?? true);
  const [activeImageSelector, setActiveImageSelector] = useState<{ axisIdx: number; valIdx: number } | null>(null);
  const [hasVariants, setHasVariants] = useState(initialProduct?.hasVariants ?? false);
  const [isService, setIsService] = useState(initialProduct?.isService ?? false);
  const [isFeatured, setIsFeatured] = useState(initialProduct?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(initialProduct?.isActive ?? true);
  const [rating, setRating] = useState(initialProduct?.rating?.toString() || '5.0');
  const [reviewsCount, setReviewsCount] = useState(initialProduct?.reviewsCount?.toString() || '0');
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [customBadgeId, setCustomBadgeId] = useState(initialProduct?.customBadgeId || '');
  const [badgeEnabled, setBadgeEnabled] = useState(initialProduct?.badgeEnabled ?? true);
  const [sizeGuideId, setSizeGuideId] = useState(initialProduct?.sizeGuideId || '');
  const [sizeGuidesList, setSizeGuidesList] = useState<SizeGuide[]>([]);

  const [flashSaleEnabled, setFlashSaleEnabled] = useState(initialProduct?.flashSaleEnabled ?? false);
  const [flashSaleStartDate, setFlashSaleStartDate] = useState(initialProduct?.flashSaleStartDate ? new Date(initialProduct.flashSaleStartDate).toISOString().slice(0, 16) : '');
  const [flashSaleEndDate, setFlashSaleEndDate] = useState(initialProduct?.flashSaleEndDate ? new Date(initialProduct.flashSaleEndDate).toISOString().slice(0, 16) : '');
  const [flashSaleDiscountType, setFlashSaleDiscountType] = useState<'percentage' | 'fixed'>(initialProduct?.flashSaleDiscountType ?? 'fixed');
  const [flashSaleDiscountValue, setFlashSaleDiscountValue] = useState(initialProduct?.flashSaleDiscountValue ?? 0);
  const [frequentlyBoughtTogetherIds, setFrequentlyBoughtTogetherIds] = useState(initialProduct?.frequentlyBoughtTogetherIds || []);
  const [productList, setProductList] = useState<Product[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean>(aiEnabled ?? false);

  const handleAICopywrite = async () => {
    if (!name.trim()) {
      return toast.error('Please enter a Product Name first before generating AI description.');
    }
    try {
      setIsAiGenerating(true);
      toast.info('AI is drafting professional SEO product copy...');

      // Auto-generate slug from current name (fixes duplicate mode where slug stays stuck)
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(generatedSlug);

      const selectedCategory = categories.find(c => c.id === categoryId);
      const categoryName = selectedCategory ? selectedCategory.name : 'General';

      const payload = {
        entity_type: 'product',
        entity_id: initialProduct?.id || 'new',
        entity_data: {
          name: name.trim(),
          description: description.trim() || undefined,
          price: parseFloat(price) || 0,
          category: categoryName,
          stock: 10,
          slug: generatedSlug
        }
      };

      const response = await fetch('/api/seo/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) throw new Error(resData.error || 'AI generation failed');

      if (resData.skipped) {
        toast.warning(resData.message || 'AI keys not configured');
      } else {
        const data = resData.data;
        if (data.long_description) {
          setDescription(data.long_description);
          if (editorRef.current) {
            editorRef.current.innerHTML = data.long_description;
          }
        }
        if (data.meta_description) {
          setShortDescription(data.meta_description);
        }
        if (data.focus_keyword || data.secondary_keywords) {
          const combinedTags = [
            data.focus_keyword,
            data.secondary_keywords,
            data.lsi_tags
          ].filter(Boolean).join(', ');

          const uniqueTags = Array.from(new Set(
            combinedTags.split(',').map(t => t.trim()).filter(Boolean)
          )).join(', ');

          setTagInput(uniqueTags);
        }
        toast.success('AI description, short description, and tags generated successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setIsAiGenerating(false);
    }
  };

  useEffect(() => {
    async function loadBadgesAndSizeGuides() {
      try {
        const supabaseClient = createClient();
        const [b, sg, prods] = await Promise.all([
          getBadges(),
          getSizeGuides(),
          supabaseClient.from('products').select('id, name, price, sku, product_images(url, is_primary, sort_order)').is('deleted_at', null).order('name')
        ]);
        setAllBadges(b);
        setSizeGuidesList(sg);
        const allProducts: any[] = prods.data || [];
        const seen = new Set<string>();
        const unique = allProducts.filter((p: any) => {
          if (p.id === initialProduct?.id) return false;
          const key = p.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setProductList(unique as any);
      } catch (err) {
        console.error('Failed to load badges, size guides or products:', err);
      }
    }
    loadBadgesAndSizeGuides();
  }, []);

  // Rich Text Editor States and Helpers
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHtmlMode && editorRef.current) {
      editorRef.current.innerHTML = description || '';
    }
  }, [isHtmlMode]);

  const execCommand = (command: string, value: string = '') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setDescription(editorRef.current.innerHTML);
    }
  };

  // 2. Images List
  const [images, setImages] = useState<Omit<ProductImage, 'id' | 'productId' | 'createdAt'>[]>(
    initialProduct?.images.map((img: any, idx: number) => ({
      url: img.url,
      alt: img.alt,
      sortOrder: img.sortOrder,
      isPrimary: idx === 0
    })) || []
  );

  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const handleDragStartImages = (event: DragStartEvent) => {
    setActiveImageId(event.active.id as string);
  };

  const handleDragCancelImages = () => {
    setActiveImageId(null);
  };

  const handleDragEndImages = (event: DragEndEvent) => {
    setActiveImageId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.url === active.id);
    const newIndex = images.findIndex((img) => img.url === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(images, oldIndex, newIndex);
      const updated = reordered.map((img, idx) => ({
        ...img,
        sortOrder: idx + 1,
        isPrimary: idx === 0,
      }));
      setImages(updated);
    }
  };

  const [uploading, setUploading] = useState(false);

  // 3. Variants List
  const [variants, setVariants] = useState<Omit<ProductVariant, 'id' | 'productId'>[]>(
    initialProduct?.variants.map(v => ({
      color: v.color,
      size: v.size,
      material: v.material,
      customOption: v.customOption,
      customValue: v.customValue,
      colorHex: v.colorHex,
      price: v.price,
      comparePrice: v.comparePrice,
      stock: v.stock,
      sku: v.sku,
      imageUrl: v.imageUrl,
      showImageSwatch: v.showImageSwatch ?? false,
      active: v.active,
      sortOrder: v.sortOrder,
      inventoryThreshold: v.inventoryThreshold || 0
    })) || []
  );

  // Selected Variants State for Shopify-style Bulk Actions
  const [selectedVariantIndices, setSelectedVariantIndices] = useState<number[]>([]);
  const [variantSearchTerm, setVariantSearchTerm] = useState('');

  const filteredVariants = variantSearchTerm
    ? variants.filter(v => {
        const term = variantSearchTerm.toLowerCase();
        const label = [v.color, v.size, v.material, v.customValue].filter(Boolean).join(' / ').toLowerCase();
        return label.includes(term)
          || (v.sku?.toLowerCase() || '').includes(term)
          || (v.price?.toString() || '').includes(term)
          || (v.comparePrice?.toString() || '').includes(term)
          || (v.colorHex?.toLowerCase() || '').includes(term)
          || (v.stock?.toString() || '').includes(term)
          || (v.inventoryThreshold?.toString() || '').includes(term);
      })
    : variants;

  const handlePriceChange = (val: string) => {
    const newPrice = parseFloat(val) || 0;
    setPrice(val);
    // Always cascade base price to ALL variants unconditionally
    setVariants(prev => prev.map(v => ({ ...v, price: newPrice })));
  };

  const handleComparePriceChange = (val: string) => {
    const newCompare = val.trim() ? parseFloat(val) : undefined;
    setComparePrice(val);
    // Always cascade base compare price to ALL variants unconditionally
    setVariants(prev => prev.map(v => ({ ...v, comparePrice: newCompare })));
  };

  // Variant Axes (the new tag-based system)
  interface AxisValue { label: string; hex?: string; imageUrl?: string; showImageSwatch?: boolean; }
  interface VariantAxis { name: string; type: 'color' | 'size' | 'material' | 'custom'; values: AxisValue[]; }

  // Initialize axes from existing variants
  const initAxes = (): VariantAxis[] => {
    if (!initialProduct?.variants?.length) {
      return [
        { name: 'Color', type: 'color', values: [] },
        { name: 'Size', type: 'size', values: [] }
      ];
    }
    const colorValues = Array.from(new Set(initialProduct.variants.filter(v => v.color).map(v => v.color!)));
    const sizeValues = Array.from(new Set(initialProduct.variants.filter(v => v.size).map(v => v.size!)));
    const materialValues = Array.from(new Set(initialProduct.variants.filter(v => v.material).map(v => v.material!)));
    const customOptionName = initialProduct.variants.find(v => v.customOption)?.customOption || 'Custom';
    const customValues = Array.from(new Set(initialProduct.variants.filter(v => v.customValue).map(v => v.customValue!)));

    const axes: VariantAxis[] = [];
    if (colorValues.length > 0) {
      axes.push({
        name: 'Color', type: 'color',
        values: colorValues.map(label => {
          const match = initialProduct.variants.find(v => v.color === label);
          return { label, hex: match?.colorHex, imageUrl: match?.imageUrl, showImageSwatch: match?.showImageSwatch };
        })
      });
    }
    if (sizeValues.length > 0) {
      axes.push({ name: 'Size', type: 'size', values: sizeValues.map(label => ({ label })) });
    }
    if (materialValues.length > 0) {
      axes.push({ name: 'Material', type: 'material', values: materialValues.map(label => ({ label })) });
    }
    if (customValues.length > 0) {
      axes.push({ name: customOptionName, type: 'custom', values: customValues.map(label => ({ label })) });
    }

    if (axes.length === 0) {
      axes.push({ name: 'Color', type: 'color', values: [] }, { name: 'Size', type: 'size', values: [] });
    }

    // Sort based on variationOrder if it exists
    if (initialProduct.variationOrder && initialProduct.variationOrder.length > 0) {
      axes.sort((a, b) => {
        const aIdx = initialProduct.variationOrder!.indexOf(a.type);
        const bIdx = initialProduct.variationOrder!.indexOf(b.type);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    }

    return axes;
  };

  const [variantAxes, setVariantAxes] = useState<VariantAxis[]>(initAxes);
  const [axisInputs, setAxisInputs] = useState<string[]>(() => initAxes().map(() => ''));
  const [presets, setPresets] = useState<VariantPreset[]>([]);
  const [collapsedAxes, setCollapsedAxes] = useState<boolean[]>(() => initAxes().map(() => false));
  const [variantsSectionCollapsed, setVariantsSectionCollapsed] = useState(true);
  const [axisOrderChanged, setAxisOrderChanged] = useState(false);

  useEffect(() => {
    setCollapsedAxes(prev => {
      const len = variantAxes.length;
      if (prev.length === len) return prev;
      return Array.from({ length: len }, (_, i) => prev[i] ?? false);
    });
  }, [variantAxes.length]);

  const handleMoveAxisUp = (idx: number) => {
    if (idx === 0) return;
    setVariantAxes(prev => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      return next;
    });
    setAxisInputs(prev => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      return next;
    });
  };

  const handleMoveAxisDown = (idx: number) => {
    if (idx === variantAxes.length - 1) return;
    setVariantAxes(prev => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      return next;
    });
    setAxisInputs(prev => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      return next;
    });
  };

  const handleReorderAxisValues = (axisIdx: number, reorderedValues: AxisValue[]) => {
    setVariantAxes(prev =>
      prev.map((a, i) => (i === axisIdx ? { ...a, values: reorderedValues } : a))
    );
    setAxisOrderChanged(true);
  };

  useEffect(() => {
    getVariantPresets().then(setPresets).catch(() => { });
  }, []);

  // 4. Modifiers List
  const [modifiers, setModifiers] = useState<Omit<ProductModifier, 'id' | 'productId'>[]>(
    initialProduct?.modifiers.map(m => ({
      name: m.name,
      price: m.price,
      active: m.active,
      sortOrder: m.sortOrder
    })) || []
  );
  const [modName, setModName] = useState('');
  const [modPrice, setModPrice] = useState('');

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEdit && name && !initialProduct?.slug) {
      const timer = setTimeout(() => {
        setSlug(
          name
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
        );
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [name, isEdit, initialProduct?.slug]);

  // Handle Image Uploads
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const tempId = initialProduct?.id || 'temp-product-id';

      const newImages = await Promise.all(
        files.map(async (file, idx) => {
          const url = await uploadImage(file, 'product-images');
          return {
            url,
            alt: file.name,
            sortOrder: images.length + idx,
            isPrimary: false
          };
        })
      );

      setImages(prev => {
        const newArray = [...prev, ...newImages];
        return newArray.map((img, idx) => ({ ...img, isPrimary: idx === 0 }));
      });
      toast.success('Images uploaded successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload images';
      toast.error(msg);
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Remove Image
  const handleRemoveImage = async (index: number, url: string) => {
    try {
      setImages(prev => {
        const filtered = prev.filter((_, i) => i !== index);
        // Recalculate sortOrder and enforce index 0 is primary
        const updated = filtered.map((img, i) => ({
          ...img,
          sortOrder: i,
          isPrimary: i === 0
        }));
        return updated;
      });

      // Clear references in variant axes (color images)
      setVariantAxes(prev =>
        prev.map(axis => {
          if (axis.type === 'color') {
            return {
              ...axis,
              values: axis.values.map(val =>
                val.imageUrl === url ? { ...val, imageUrl: undefined } : val
              )
            };
          }
          return axis;
        })
      );

      // Clear references in variants list
      setVariants(prev =>
        prev.map(v =>
          v.imageUrl === url ? { ...v, imageUrl: undefined } : v
        )
      );

      toast.success('Image removed from product');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove image');
    }
  };

  // Media Library State for Modal
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const handleAddSelectedLibraryImages = (urls: string[]) => {
    if (urls.length === 0) return;

    const currentUrls = new Set(images.map(img => img.url));
    const newImages = urls
      .filter(url => !currentUrls.has(url))
      .map((url, idx) => {
        return {
          url,
          alt: '',
          sortOrder: images.length + idx,
          isPrimary: images.length === 0 && idx === 0
        };
      });

    if (newImages.length > 0) {
      setImages(prev => {
        const newArray = [...prev, ...newImages];
        return newArray.map((img, idx) => ({ ...img, isPrimary: idx === 0 }));
      });
      toast.success(`Added ${newImages.length} image(s) from media library`);
    } else {
      toast.info('Selected images are already added to this product');
    }
    setIsMediaModalOpen(false);
  };


  // Helper: build a label from a variant object for matching
  const variantLabel = (v: any) => [v.color, v.size, v.material, v.customValue].filter(Boolean).join(' / ');

  // Generate Variants — cross-product of all axes, preserves existing custom data
  const handleGenerateVariants = () => {
    const basePrice = parseFloat(price) || 0;
    const baseCompare = comparePrice ? parseFloat(comparePrice) : undefined;

    // Collect all axes that have values
    const activeAxes = variantAxes.filter(a => a.values.length > 0);
    if (activeAxes.length === 0) {
      toast.error('Please add values to at least one attribute');
      return;
    }

    // Compute cross-product
    const combinations: Record<string, string | undefined>[] = [{}];
    for (const axis of activeAxes) {
      const newCombinations: Record<string, string | undefined>[] = [];
      for (const combo of combinations) {
        for (const val of axis.values) {
          newCombinations.push({ ...combo, [axis.type]: val.label });
        }
      }
      combinations.splice(0, combinations.length, ...newCombinations);
    }

    // Build a lookup map of existing variants by label for preservation
    const existingByLabel = new Map<string, Omit<ProductVariant, 'id' | 'productId'>>();
    for (const v of variants) {
      existingByLabel.set(variantLabel(v), v);
    }

    const mergedVariants: Omit<ProductVariant, 'id' | 'productId'>[] = combinations.map((combo, idx) => {
      const label = variantLabel(combo);

      // If this exact variant already exists, preserve it entirely
      const existing = existingByLabel.get(label);
      if (existing) {
        return { ...existing, sortOrder: idx };
      }

      // New variant — apply global defaults
      const colorLabel = combo['color'];
      const colorAxis = variantAxes.find(a => a.type === 'color');
      const colorVal = colorAxis?.values.find(v => v.label === colorLabel);
      return {
        color: combo['color'],
        size: combo['size'],
        material: combo['material'],
        customValue: combo['custom'],
        colorHex: colorVal?.hex,
        imageUrl: colorVal?.imageUrl,
        showImageSwatch: colorVal?.showImageSwatch || false,
        stock: 10,
        price: basePrice,
        comparePrice: baseCompare,
        active: true,
        sortOrder: idx
      };
    });

    const preservedCount = combinations.length - mergedVariants.filter(v => {
      const label = variantLabel(v);
      return !existingByLabel.has(label);
    }).length;

    setVariants(mergedVariants);
    setSelectedVariantIndices([]);
    toast.success(`Generated ${mergedVariants.length} variant${mergedVariants.length !== 1 ? 's' : ''}! (${preservedCount} existing preserved)`);
  };

  // Update variant row
  const handleUpdateVariant = (index: number, fields: Partial<Omit<ProductVariant, 'id' | 'productId'>>) => {
    setVariants(prev =>
      prev.map((v, i) => (i === index ? { ...v, ...fields } : v))
    );
  };

  // Remove variant
  const handleRemoveVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
    setSelectedVariantIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  // Shopify-style Bulk Update Operations
  const handleBulkUpdatePrice = (priceVal: number) => {
    setVariants(prev => prev.map((v, i) => selectedVariantIndices.includes(i) ? { ...v, price: priceVal } : v));
    toast.success(`Updated price to Rs. ${priceVal} for ${selectedVariantIndices.length} variants`);
  };

  const handleBulkUpdateComparePrice = (compareVal: number) => {
    setVariants(prev => prev.map((v, i) => selectedVariantIndices.includes(i) ? { ...v, comparePrice: compareVal } : v));
    toast.success(`Updated compare price to Rs. ${compareVal} for ${selectedVariantIndices.length} variants`);
  };

  const handleBulkUpdateStock = (stockVal: number) => {
    setVariants(prev => prev.map((v, i) => selectedVariantIndices.includes(i) ? { ...v, stock: stockVal } : v));
    toast.success(`Updated stock to ${stockVal} for ${selectedVariantIndices.length} variants`);
  };

  const handleBulkUpdateSku = (skuVal: string) => {
    setVariants(prev => prev.map((v, i) => selectedVariantIndices.includes(i) ? { ...v, sku: skuVal || undefined } : v));
    toast.success(`Updated SKU to "${skuVal || 'empty'}" for ${selectedVariantIndices.length} variants`);
  };

  const handleBulkUpdateThreshold = (thresholdVal: number) => {
    setVariants(prev => prev.map((v, i) => selectedVariantIndices.includes(i) ? { ...v, inventoryThreshold: thresholdVal } : v));
    toast.success(`Updated threshold to ${thresholdVal} for ${selectedVariantIndices.length} variants`);
  };

  const handleBulkUpdateActive = (activeVal: boolean) => {
    setVariants(prev => prev.map((v, i) => selectedVariantIndices.includes(i) ? { ...v, active: activeVal } : v));
    toast.success(`Updated status to ${activeVal ? 'Active' : 'Inactive'} for ${selectedVariantIndices.length} variants`);
  };

  const handleBulkDelete = async () => {
    if (selectedVariantIndices.length === 0) return;
    const confirmed = await confirm({
      title: 'Delete Variants',
      message: `Are you sure you want to delete ${selectedVariantIndices.length} selected variants?`,
      variant: 'danger',
      confirmText: 'Delete'
    });
    if (confirmed) {
      setVariants(prev => prev.filter((_, i) => !selectedVariantIndices.includes(i)));
      setSelectedVariantIndices([]);
      toast.success('Deleted selected variants');
    }
  };

  // Add Custom Modifier
  const handleAddModifier = () => {
    if (!modName.trim()) return;
    const priceVal = parseFloat(modPrice) || 0;
    setModifiers(prev => [
      ...prev,
      {
        name: modName.trim(),
        price: priceVal,
        active: true,
        sortOrder: prev.length
      }
    ]);
    setModName('');
    setModPrice('');
  };

  const handleRemoveModifier = (index: number) => {
    setModifiers(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Product Name is required');
    if (!slug.trim()) return toast.error('Product Slug is required');

    if (hasVariants) {
      if (variants.length === 0) {
        return toast.error('Please add or generate at least one variant before saving.');
      }
      const hasStock = variants.some(v => v.stock !== undefined && v.stock !== null && !isNaN(v.stock));
      if (!hasStock) {
        return toast.error('At least one variant must have a stock value.');
      }
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const computedStock = hasVariants
        ? variants.reduce((sum, v) => sum + (v.stock || 0), 0)
        : parseInt(stock) || 0;

      const productPayload = {
        name: name.trim(),
        slug: slug.trim(),
        sku: sku.trim() || undefined,
        price: parseFloat(price) || 0,
        comparePrice: comparePrice.trim() ? parseFloat(comparePrice) : undefined,
        cost: parseFloat(cost) || 0,
        categoryId: selectedCategoryIds[0] || undefined,

        productCategories: selectedCategoryIds.map(categoryId => ({
          productId: isEdit && initialProduct ? initialProduct.id : '',
          categoryId
        })),
        inventoryThreshold: parseInt(inventoryThreshold) || 0,
        stock: computedStock,
        hasVariants,
        isService,
        isFeatured,
        isActive,
        enableSwatches,
        showSwatchesOnArchive,
        customBadgeId: customBadgeId || undefined,
        badgeEnabled: badgeEnabled,
        sizeGuideId: sizeGuideId || undefined,
        frequentlyBoughtTogetherIds: frequentlyBoughtTogetherIds,
        flashSaleEnabled: flashSaleEnabled,
        flashSaleStartDate: flashSaleStartDate ? new Date(flashSaleStartDate).toISOString() : undefined,
        flashSaleEndDate: flashSaleEndDate ? new Date(flashSaleEndDate).toISOString() : undefined,
        flashSaleDiscountType: flashSaleDiscountType,
        flashSaleDiscountValue: flashSaleDiscountValue,
        tags: parsedTags,
        description: description.trim() || undefined,
        shortDescription: shortDescription.trim() || undefined,
        rating: parseFloat(rating) || 5.0,
        reviewsCount: parseInt(reviewsCount) || 0,
        variationOrder: variantAxes.map(a => a.type)
      };

      let savedProduct;
      if (isEdit && initialProduct) {
        const result = await updateProductSafe(
          initialProduct.id,
          productPayload,
          images,
          variants,
          modifiers
        );
        if (!result.success) {
          toast.error(result.error);
          setIsSubmitting(false);
          return;
        }
        savedProduct = { id: initialProduct.id, slug: productPayload.slug };
        toast.success('Product updated successfully!');
        router.refresh();
      } else {
        const result = await createProductSafe(
          productPayload,
          images,
          variants,
          modifiers
        );
        if (!result.success) {
          toast.error(result.error);
          setIsSubmitting(false);
          return;
        }
        const newProduct = result.data;
        savedProduct = { id: newProduct.id, slug: newProduct.slug };
        toast.success('Product created successfully!');
        router.push(`/admin/products/${newProduct.id}`);
        router.refresh();
      }

      // ─────────────────────────────────────────────────────────────────────────
      // AUTO SEO + INDEXNOW — DISABLED UNTIL 2026-06-19
      // Re-enable on: 2026-06-19 (restore the block below)
      // ─────────────────────────────────────────────────────────────────────────
      /* DISABLED BLOCK — uncomment on 2026-06-19:
      const supabase = createClient();
      const { data: aiSettings } = await supabase
        .from('ai_settings')
        .select('auto_content_seo')
        .eq('id', '00000000-0000-4000-8000-000000000002')
        .single();
      const isAutoSeoOn = aiSettings?.auto_content_seo ?? true;
      const productIdToOptimize = savedProduct.id;
      const productSlugToOptimize = savedProduct.slug;
      (async () => {
        try {
          if (isAutoSeoOn) {
            toast.info('Generating AI SEO content and pinging IndexNow...');
            const optRes = await fetch('/api/seo/optimize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ entity_type: 'product', entity_id: productIdToOptimize })
            });
            const resData = await optRes.json();
            if (optRes.ok && resData.success) {
              toast.success('AI SEO optimization complete & IndexNow notified for product!');
            } else {
              console.warn('Auto SEO optimization failed on save for product:', resData?.error);
              toast.warning(`SEO auto-generation skipped: ${resData?.error || 'AI not configured'}`);
            }
          } else {
            const siteUrl = storeUrl || getClientSiteUrl();
            const pageUrl = `${siteUrl}/product/${productSlugToOptimize}`;
            const pingRes = await fetch('/api/indexnow', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls: [pageUrl] })
            });
            if (pingRes.ok) {
              toast.success('IndexNow notified of updated product!');
            }
          }
        } catch (bgErr) {
          console.error('Error running background SEO tasks:', bgErr);
        }
      })();
      */
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Failed to save product';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-full pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Core Fields */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 text-gray-900 dark:text-white transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800/80">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Product Details</h3>
                {name.trim() !== '' && (
                  <button
                    type="button"
                    onClick={aiConfigured ? handleAICopywrite : () => { toast.info('AI is not enabled. Go to Admin → Settings → AI Copywriter to enable it.', { duration: 5000 }); }}
                    disabled={isAiGenerating}
                    className={`relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm select-none active:scale-[0.98] ${
                      aiConfigured
                        ? isAiGenerating
                          ? 'bg-purple-700 bg-linear-to-r from-purple-700 to-indigo-700 disabled:cursor-not-allowed'
                          : 'bg-purple-600 bg-linear-to-r from-purple-600 to-indigo-600 hover:bg-purple-700 hover:from-purple-700 hover:to-indigo-700'
                        : 'bg-gray-400 hover:bg-gray-500'
                    }`}
                    title={aiConfigured ? 'Generate AI copy' : 'Enable AI in Settings → AI Copywriter'}
                  >
                    {isAiGenerating && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] pointer-events-none z-10 bg-inherit">
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        <div className="flex items-center gap-2 relative z-10">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </div>
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 transition-opacity ${isAiGenerating ? 'opacity-0' : 'opacity-100'}`}>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>AI Generate Copy</span>
                    </div>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Slug (URL friendly) *</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all"
                  />
                  {slug && (
                    <p className="mt-1 text-[10px] text-gray-550 dark:text-gray-400 font-bold">
                      Preview Path:{' '}
                      <a
                        href={`/product/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#e94560] font-mono underline hover:text-[#e94560]/80 transition-colors cursor-pointer"
                      >
                        /product/{slug}
                      </a>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">SKU / Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Categories</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-xs focus:outline-none focus:border-[#1a1a2e] focus:bg-white transition-all dark:border-gray-800 dark:bg-[#111124] text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-[#111124] max-h-64 overflow-y-auto">
                    {flattenedCategories.filter(cat => cat.slug !== 'shop' && cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())).length === 0 ? (
                      <span className="text-sm text-gray-500">No categories found.</span>
                    ) : (
                      flattenedCategories
                        .filter(cat => cat.slug !== 'shop' && cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                        .map(cat => {
                          const isSelected = selectedCategoryIds.includes(cat.id);
                          return (
                            <div key={cat.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-2 mb-2 last:pb-0 last:mb-0">
                              <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCategoryIds(prev => [...prev, cat.id]);
                                    } else {
                                      setSelectedCategoryIds(prev => prev.filter(id => id !== cat.id));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer flex-shrink-0 mt-0.5"
                                />
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 flex-wrap">
                                  {cat._level > 0 && (
                                    <span className="text-gray-400">{'—'.repeat(cat._level)} </span>
                                  )}
                                  {cat.name}
                                </span>
                              </label>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>


                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Size Guide Preset</label>
                  <select
                    value={sizeGuideId}
                    onChange={(e) => setSizeGuideId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="">No Size Guide</option>
                    {sizeGuidesList.map(sg => (
                      <option key={sg.id} value={sg.id}>{sg.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="new, sale, cotton"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Short Description</label>
                  {name.trim() !== '' && (
                    <button
                      type="button"
                      onClick={aiConfigured ? handleAICopywrite : () => { toast.info('AI is not enabled. Go to Admin → Settings → AI Copywriter to enable it.', { duration: 5000 }); }}
                      disabled={isAiGenerating}
                      className={`relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm select-none active:scale-[0.98] ${
                        aiConfigured
                          ? isAiGenerating
                            ? 'bg-purple-700 bg-linear-to-r from-purple-700 to-indigo-700 disabled:cursor-not-allowed'
                            : 'bg-purple-600 bg-linear-to-r from-purple-600 to-indigo-600 hover:bg-purple-700 hover:from-purple-700 hover:to-indigo-700'
                          : 'bg-gray-400 hover:bg-gray-500'
                      }`}
                      title={aiConfigured ? 'Generate AI copy' : 'Enable AI in Settings → AI Copywriter'}
                    >
                      {isAiGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] pointer-events-none z-10 bg-inherit">
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          <div className="flex items-center gap-2 relative z-10">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating...</span>
                          </div>
                        </div>
                      )}
                      <div className={`flex items-center gap-1.5 transition-opacity ${isAiGenerating ? 'opacity-0' : 'opacity-100'}`}>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>AI Generate Copy</span>
                      </div>
                    </button>
                  )}
                </div>
                <textarea
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={2}
                  placeholder="A brief overview of the product (shown above variations)"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Description</label>
                <div className="mt-1.5 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-[#16162a] shadow-sm">
                  {/* Editor Toolbar */}
                  <div className="flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-gray-800 p-2 bg-gray-50 dark:bg-[#1f1f3a] gap-2 select-none">
                    <div className="flex flex-wrap items-center gap-0.5">
                      {!isHtmlMode ? (
                        <>
                          <button
                            type="button"
                            onClick={() => execCommand('bold')}
                            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2c2c4d] hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors"
                            title="Bold"
                          >
                            <Bold className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => execCommand('italic')}
                            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2c2c4d] hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors"
                            title="Italic"
                          >
                            <Italic className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => execCommand('underline')}
                            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2c2c4d] hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors"
                            title="Underline"
                          >
                            <Underline className="h-4 w-4" />
                          </button>

                          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

                          <button
                            type="button"
                            onClick={() => execCommand('formatBlock', '<h2>')}
                            className="px-2 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2c2c4d] hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors"
                            title="Heading 2"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => execCommand('formatBlock', '<h3>')}
                            className="px-2 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2c2c4d] hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors"
                            title="Heading 3"
                          >
                            H3
                          </button>
                          <button
                            type="button"
                            onClick={() => execCommand('formatBlock', '<p>')}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2c2c4d] hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors"
                            title="Normal Paragraph"
                          >
                            Normal
                          </button>

                          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

                          <button
                            type="button"
                            onClick={() => execCommand('insertUnorderedList')}
                            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2c2c4d] hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors"
                            title="Bullet List"
                          >
                            <List className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => execCommand('insertOrderedList')}
                            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2c2c4d] hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors"
                            title="Numbered List"
                          >
                            <ListOrdered className="h-4 w-4" />
                          </button>

                          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

                          <button
                            type="button"
                            onClick={() => execCommand('removeFormat')}
                            className="px-2 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2c2c4d] hover:text-red-500 dark:hover:text-red-500 transition-colors"
                            title="Clear Formatting"
                          >
                            Clear Format
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 px-2 py-1">HTML Code View</span>
                      )}
                    </div>

                    {/* Toggle button */}
                    <button
                      type="button"
                      onClick={() => setIsHtmlMode(!isHtmlMode)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-350 hover:bg-gray-50 dark:hover:bg-[#2c2c4d] hover:text-[#e94560] dark:hover:text-[#e94560] transition-colors cursor-pointer shadow-sm active:scale-95"
                    >
                      {isHtmlMode ? (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span>Visual Editor</span>
                        </>
                      ) : (
                        <>
                          <Code className="h-3.5 w-3.5" />
                          <span>HTML View</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Editor Content Area */}
                  {isHtmlMode ? (
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={10}
                      className="w-full bg-white dark:bg-[#16162a] px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-100 focus:outline-none transition-all resize-y border-0 min-h-[220px]"
                      placeholder="<p>Write raw HTML here...</p>"
                    />
                  ) : (
                    <div
                      ref={editorRef}
                      contentEditable
                      onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                      onBlur={(e) => setDescription(e.currentTarget.innerHTML)}
                      className="w-full bg-white dark:bg-[#16162a] px-4 py-3 text-sm font-medium focus:outline-none transition-all overflow-y-auto min-h-[220px] prose dark:prose-invert max-w-none border-0"
                      style={{ outline: 'none' }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 text-gray-900 dark:text-white transition-colors">
              <h3 className="text-base font-bold text-gray-900">Pricing & Inventory</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Selling Price *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Compare Price</label>
                  <input
                    type="number"
                    value={comparePrice}
                    onChange={(e) => handleComparePriceChange(e.target.value)}
                    placeholder="Original price for strikethrough"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Purchase Cost</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Rating (0.0 to 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Reviews Count Override</label>
                  <input
                    type="number"
                    min="0"
                    value={reviewsCount}
                    onChange={(e) => setReviewsCount(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                {!isService && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">In Stock Quantity</label>
                    {hasVariants ? (
                      <div className="relative mt-1.5">
                        <div className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-[#0f0f1b] px-4 py-2.5 text-sm font-semibold text-gray-400 dark:text-gray-500 cursor-not-allowed select-none transition-all">
                          {variants.reduce((sum, v) => sum + (v.stock || 0), 0)}
                        </div>
                        <span className="text-[10px] text-gray-450 dark:text-gray-550 mt-1 block font-semibold">
                          Managed per variant below
                        </span>
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all dark:border-gray-800 dark:bg-[#111124]"
                      />
                    )}
                  </div>
                )}
                {!isService && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Alert Threshold</label>
                    <input
                      type="number"
                      value={inventoryThreshold}
                      onChange={(e) => setInventoryThreshold(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-[#1a1a2e] focus:bg-white focus:outline-none transition-all dark:border-gray-800 dark:bg-[#111124]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Variants Block — Enhanced */}
            <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 text-gray-900 dark:text-white transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVariantsSectionCollapsed(prev => !prev)}
                    className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-[#e94560] dark:hover:text-[#e94560] transition-all cursor-pointer bg-gray-100 dark:bg-[#1a1a30] px-3 py-1.5 rounded-lg"
                  >
                    {variantsSectionCollapsed ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronUp className="h-5 w-5" />
                    )}
                    {variantsSectionCollapsed ? 'Expand All' : 'Collapse All'}
                  </button>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Product Variants</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e94560]" />
                </label>
              </div>

              {hasVariants && !variantsSectionCollapsed && (
                <div className="space-y-5 pt-1">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0f0f1b]/50 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-gray-900 dark:text-white">Enable Visual Swatches</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Show color circles and images instead of text button tags on storefront</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableSwatches}
                        onChange={(e) => setEnableSwatches(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e94560]" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0f0f1b]/50 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-gray-900 dark:text-white">Show Swatches on Catalog Cards</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Show variant color circles under the product image on the archive/catalog page</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSwatchesOnArchive}
                        onChange={(e) => setShowSwatchesOnArchive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e94560]" />
                    </label>
                  </div>


                      {/* Attribute Axes */}
                  {variantAxes.map((axis, axisIdx) => (
                    <div key={axisIdx} className="bg-gray-50 dark:bg-[#0f0f1b]/50 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                      {/* Axis header */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCollapsedAxes(prev => prev.map((c, i) => i === axisIdx ? !c : c))}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all cursor-pointer flex-shrink-0"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsedAxes[axisIdx] ? '-rotate-90' : ''}`} />
                        </button>
                        <input
                          type="text"
                          value={axis.name}
                          onChange={(e) => {
                            setVariantAxes(prev => prev.map((a, i) => i === axisIdx ? { ...a, name: e.target.value } : a));
                          }}
                          placeholder="Attribute name (e.g. Color, Size, Material)"
                          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] px-3 py-2 text-sm font-bold focus:outline-none focus:border-[#e94560]"
                        />
                        <select
                          value={axis.type}
                          onChange={(e) => setVariantAxes(prev => prev.map((a, i) => i === axisIdx ? { ...a, type: e.target.value as 'color' | 'size' | 'material' | 'custom' } : a))}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] px-3 py-2 text-xs font-semibold focus:outline-none"
                        >
                          <option value="color">Color</option>
                          <option value="size">Size</option>
                          <option value="material">Material</option>
                          <option value="custom">Custom</option>
                        </select>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={axisIdx === 0}
                            onClick={() => handleMoveAxisUp(axisIdx)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={axisIdx === variantAxes.length - 1}
                            onClick={() => handleMoveAxisDown(axisIdx)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs"
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>
                        {variantAxes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setVariantAxes(prev => prev.filter((_, i) => i !== axisIdx))}
                            className="p-2 text-red-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {!collapsedAxes[axisIdx] && (<>
                      {/* Import Preset */}
                      {presets.filter(p => p.attribute === axis.type).length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-gray-400">Load Preset:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {presets.filter(p => p.attribute === axis.type).map(preset => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => {
                                  const newValues = preset.values.map(v => ({
                                    label: v.label,
                                    hex: preset.attribute === 'color' ? (v.hex && v.hex !== '#888888' ? v.hex : extractColorsFromName(v.label) || '#888888') : v.hex,
                                    imageUrl: v.imageUrl
                                  }));
                                  setVariantAxes(prev => prev.map((a, i) =>
                                    i === axisIdx ? { ...a, values: [...a.values, ...newValues.filter(nv => !a.values.find(av => av.label === nv.label))] } : a
                                  ));
                                  setVariants(prev => prev.map(v => {
                                    const match = newValues.find(nv => nv.label === v.color);
                                    if (match) {
                                      return {
                                        ...v,
                                        colorHex: match.hex || v.colorHex,
                                        imageUrl: match.imageUrl || v.imageUrl
                                      };
                                    }
                                    return v;
                                  }));
                                  toast.success(`Loaded: ${preset.name}`);
                                }}
                                className="px-2 py-1 rounded-lg bg-[#1a1a2e] text-white text-[10px] font-bold hover:bg-[#e94560] transition-colors cursor-pointer"
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tag chip input — horizontally sortable */}
                      <div>
                        {axisOrderChanged && (
                          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Value order changed — will apply on variant re-generation</span>
                          </div>
                        )}
                        <HorizontalSortableList
                          items={axis.values.map(v => ({ ...v, id: v.label }))}
                          onReorder={(reordered) => handleReorderAxisValues(axisIdx, reordered.map(r => ({ label: r.label, hex: r.hex, imageUrl: r.imageUrl, showImageSwatch: r.showImageSwatch })))}
                          getId={(v) => v.label}
                          renderItem={(val, idx, isDragging) => (
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold select-none cursor-grab ${
                              isDragging 
                                ? 'border-[#e94560] bg-white dark:bg-[#16162a] text-gray-800 dark:text-gray-200 shadow-2xl ring-2 ring-[#e94560] cursor-grabbing' 
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-800 dark:text-gray-200 active:cursor-grabbing'
                            }`}>
                              <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              {axis.type === 'color' && (
                                <span
                                  className="flex-shrink-0 h-3.5 w-3.5 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                                  style={getSwatchStyle((val as any).hex || '#ccc')}
                                />
                              )}
                              <span className="whitespace-nowrap">{val.label}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVariantAxes(prev => prev.map((a, i) =>
                                    i === axisIdx ? { ...a, values: a.values.filter(v => v.label !== val.label) } : a
                                  ));
                                }}
                                className="text-gray-400 hover:text-red-500 cursor-pointer ml-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        />

                        {/* Add value row */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={`Add ${axis.name || axis.type} value, press Enter`}
                            value={axisInputs[axisIdx] || ''}
                            onChange={(e) => setAxisInputs(prev => { const n = [...prev]; n[axisIdx] = e.target.value; return n; })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                const raw = (axisInputs[axisIdx] || '').trim().replace(/,$/, '');
                                if (!raw) return;
                                const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
                                parts.forEach(label => {
                                  if (!axis.values.find(v => v.label === label)) {
                                    const hex = axis.type === 'color' ? (
                                      presets.filter(p => p.attribute === 'color').flatMap(p => p.values).find(v => v.label.toLowerCase() === label.toLowerCase())?.hex
                                      || extractColorsFromName(label) || '#888888'
                                    ) : undefined;
                                    setVariantAxes(prev => prev.map((a, i) =>
                                      i === axisIdx ? { ...a, values: [...a.values, { label, hex }] } : a
                                    ));
                                  }
                                });
                                setAxisInputs(prev => { const n = [...prev]; n[axisIdx] = ''; return n; });
                              }
                            }}
                            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] px-3 py-2 text-sm focus:outline-none focus:border-[#e94560]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const raw = (axisInputs[axisIdx] || '').trim();
                              if (!raw) return;
                              const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
                              parts.forEach(label => {
                                if (!axis.values.find(v => v.label === label)) {
                                  const hex = axis.type === 'color' ? (
                                    presets.filter(p => p.attribute === 'color').flatMap(p => p.values).find(v => v.label.toLowerCase() === label.toLowerCase())?.hex
                                    || extractColorsFromName(label) || '#888888'
                                  ) : undefined;
                                  setVariantAxes(prev => prev.map((a, i) =>
                                    i === axisIdx ? { ...a, values: [...a.values, { label, hex }] } : a
                                  ));
                                }
                              });
                              setAxisInputs(prev => { const n = [...prev]; n[axisIdx] = ''; return n; });
                            }}
                            className="flex h-9 items-center gap-1 px-3 rounded-lg bg-[#1a1a2e] dark:bg-[#e94560] text-white text-xs font-bold cursor-pointer hover:bg-[#e94560] dark:hover:bg-[#d8344e] transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Color extras: hex + image URL per value */}
                      {axis.type === 'color' && axis.values.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-[10px] font-black uppercase text-gray-400">Color Settings (hex + linked image)</span>
                          {axis.values.map((val, valIdx) => (
                            <div key={valIdx} className="flex items-center gap-3 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 shadow-sm">
                              <div className="flex items-center gap-1.5 shrink-0">
                                {(val.hex || '#888888').split(',').map((colorValue, colorIndex, colorsArr) => (
                                  <div key={colorIndex} className="relative group h-8 w-8 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                                    <input
                                      type="color"
                                      value={colorValue.trim() || '#888888'}
                                      onChange={(e) => {
                                        const newHex = e.target.value;
                                        const newColorsArr = [...colorsArr];
                                        newColorsArr[colorIndex] = newHex;
                                        const joinedHex = newColorsArr.join(',');
                                        
                                        setVariantAxes(prev => prev.map((a, i) =>
                                          i === axisIdx ? {
                                            ...a,
                                            values: a.values.map((v, vi) =>
                                              vi === valIdx ? { ...v, hex: joinedHex } : v
                                            )
                                          } : a
                                        ));
                                        // SYNC TO VARIANTS
                                        setVariants(prev => prev.map(v =>
                                          v.color === val.label ? { ...v, colorHex: joinedHex } : v
                                        ));
                                      }}
                                      className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
                                      title="Pick color"
                                    />
                                    {colorsArr.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newColorsArr = colorsArr.filter((_, ci) => ci !== colorIndex);
                                          const joinedHex = newColorsArr.join(',');
                                          
                                          setVariantAxes(prev => prev.map((a, i) =>
                                            i === axisIdx ? {
                                              ...a,
                                              values: a.values.map((v, vi) =>
                                                vi === valIdx ? { ...v, hex: joinedHex } : v
                                              )
                                            } : a
                                          ));
                                          // SYNC TO VARIANTS
                                          setVariants(prev => prev.map(v =>
                                            v.color === val.label ? { ...v, colorHex: joinedHex } : v
                                          ));
                                        }}
                                        className="absolute top-0 right-0 hidden group-hover:flex h-4 w-4 items-center justify-center bg-red-500/90 hover:bg-red-500 text-white text-[12px] leading-none cursor-pointer"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {(val.hex || '#888888').split(',').length < 3 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const joinedHex = (val.hex || '#888888') + ',#ffffff';
                                      
                                      setVariantAxes(prev => prev.map((a, i) =>
                                        i === axisIdx ? {
                                          ...a,
                                          values: a.values.map((v, vi) =>
                                            vi === valIdx ? { ...v, hex: joinedHex } : v
                                          )
                                        } : a
                                      ));
                                      // SYNC TO VARIANTS
                                      setVariants(prev => prev.map(v =>
                                        v.color === val.label ? { ...v, colorHex: joinedHex } : v
                                      ));
                                    }}
                                    className="h-8 w-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#0f0f1b] flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white shrink-0 cursor-pointer transition-colors"
                                    title="Add split color"
                                  >
                                    +
                                  </button>
                                )}
                              </div>

                              {/* Color Label with fixed width & shrink-0 */}
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-20 sm:w-24 shrink-0 truncate" title={val.label}>
                                {val.label}
                              </span>

                              {/* Custom Image Selector Dropdown - flex-1 min-w-0 */}
                              <div className="relative flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setActiveImageSelector(
                                    activeImageSelector?.axisIdx === axisIdx && activeImageSelector?.valIdx === valIdx
                                      ? null
                                      : { axisIdx, valIdx }
                                  )}
                                  className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-[#16162a] transition-all min-w-0"
                                >
                                  <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                                    {val.imageUrl ? (
                                      <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={val.imageUrl}
                                          alt={val.label}
                                          className="h-6 w-6 rounded object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                                        />
                                        <span className="truncate text-gray-750 dark:text-gray-200">
                                          {(() => {
                                            const idx = images.findIndex(img => img.url === val.imageUrl);
                                            const name = images[idx]?.alt || val.imageUrl.split('/').pop() || 'Linked Image';
                                            return idx !== -1 ? `${idx + 1}. ${name}` : name;
                                          })()}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400 flex-shrink-0">
                                          📷
                                        </span>
                                        <span className="text-gray-400 truncate">No linked image</span>
                                      </>
                                    )}
                                  </div>
                                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                </button>

                                {activeImageSelector?.axisIdx === axisIdx && activeImageSelector?.valIdx === valIdx && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-30"
                                      onClick={() => setActiveImageSelector(null)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 w-64 max-h-60 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] p-1.5 shadow-xl z-40 space-y-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setVariantAxes(prev => prev.map((a, i) =>
                                            i === axisIdx ? {
                                              ...a,
                                              values: a.values.map((v, vi) =>
                                                vi === valIdx ? { ...v, imageUrl: undefined, showImageSwatch: false } : v
                                              )
                                            } : a
                                          ));
                                          // SYNC TO VARIANTS
                                          setVariants(prev => prev.map(v =>
                                            v.color === val.label ? { ...v, imageUrl: undefined, showImageSwatch: false } : v
                                          ));
                                          setActiveImageSelector(null);
                                        }}
                                        className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left text-xs font-bold cursor-pointer ${!val.imageUrl
                                            ? 'bg-gray-100 dark:bg-[#0f0f1b] text-[#e94560]'
                                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-[#0f0f1b]'
                                          }`}
                                      >
                                        <span className="h-8 w-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 flex-shrink-0">
                                          ❌
                                        </span>
                                        No linked image
                                      </button>

                                      {images.map((img, imgIdx) => {
                                        const isSelected = val.imageUrl === img.url;
                                        const filename = `${imgIdx + 1}. ${img.alt || img.url.split('/').pop() || 'Image'}`;
                                        return (
                                          <button
                                            key={imgIdx}
                                            type="button"
                                            onClick={() => {
                                              const newUrl = img.url;
                                              setVariantAxes(prev => prev.map((a, i) =>
                                                i === axisIdx ? {
                                                  ...a,
                                                  values: a.values.map((v, vi) =>
                                                    vi === valIdx ? { ...v, imageUrl: newUrl } : v
                                                  )
                                                } : a
                                              ));
                                              // SYNC TO VARIANTS
                                              setVariants(prev => prev.map(v =>
                                                v.color === val.label ? { ...v, imageUrl: newUrl } : v
                                              ));
                                              setActiveImageSelector(null);
                                            }}
                                            className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg transition-colors text-left text-xs font-bold cursor-pointer ${isSelected
                                                ? 'bg-gray-100 dark:bg-[#0f0f1b] text-[#e94560]'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#0f0f1b]'
                                              }`}
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={img.url}
                                              alt={filename}
                                              className="h-8 w-8 rounded object-cover border border-gray-200 dark:border-gray-800 flex-shrink-0"
                                            />
                                            <span className="truncate flex-1">{filename}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Show Swatch Type Dropdown - Fixed width w-28 sm:w-32 to align all rows */}
                              <select
                                disabled={!val.imageUrl}
                                value={val.showImageSwatch && val.imageUrl ? 'image' : 'color'}
                                onChange={(e) => {
                                  const showImg = e.target.value === 'image';
                                  setVariantAxes(prev => prev.map((a, i) =>
                                    i === axisIdx ? {
                                      ...a,
                                      values: a.values.map((v, vi) =>
                                        vi === valIdx ? { ...v, showImageSwatch: showImg } : v
                                      )
                                    } : a
                                  ));
                                  // SYNC TO VARIANTS
                                  setVariants(prev => prev.map(v =>
                                    v.color === val.label ? { ...v, showImageSwatch: showImg } : v
                                  ));
                                }}
                                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] px-2 py-1.5 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-350 focus:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-[#16162a] transition-all flex-shrink-0 w-28 sm:w-32 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="color">Show Color</option>
                                {val.imageUrl && <option value="image">Show Image</option>}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                      </>)}
                    </div>
                  ))}

                  {/* Add another attribute axis */}
                  <button
                    type="button"
                    onClick={() => {
                      setVariantAxes(prev => [...prev, { name: '', type: 'size', values: [] }]);
                      setAxisInputs(prev => [...prev, '']);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#e94560] hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Another Attribute (e.g. Material)
                  </button>

                  {/* Generate + Clear buttons */}
                  <div className="flex items-center gap-3 pt-1 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={handleGenerateVariants}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a1a2e] hover:bg-[#e94560] text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Generate All Combinations
                    </button>
                    {variants.length > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: 'Clear Variants',
                            message: 'Clear all variants?',
                            variant: 'danger',
                            confirmText: 'Clear All'
                          });
                          if (confirmed) { setVariants([]); setSelectedVariantIndices([]); }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-bold cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear All
                      </button>
                    )}
                    {variantAxes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const allCollapsed = collapsedAxes.every(Boolean);
                          setCollapsedAxes(Array(variantAxes.length).fill(!allCollapsed));
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {collapsedAxes.every(Boolean) ? (
                          <><ChevronDown className="h-3.5 w-3.5" /> Expand All</>
                        ) : (
                          <><ChevronUp className="h-3.5 w-3.5" /> Collapse All</>
                        )}
                      </button>
                    )}
                    <span className="text-xs text-gray-400 font-semibold ml-auto">
                      {variants.length} variant{variants.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Variant Search */}
                  {variants.length > 0 && (
                    <div className="w-full">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search variants by name, SKU, color, or price..."
                          value={variantSearchTerm}
                          onChange={(e) => setVariantSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b] text-sm focus:outline-none focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] transition-all text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Shopify-style Bulk Editor Actions Bar */}
                  {selectedVariantIndices.length > 0 && (
                    <div className="bg-white dark:bg-[#16162a] p-4 pb-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 animate-fade-in transition-all">
                      {/* Top Row: Selected info + Clear button, and Bulk Delete Button */}
                      <div className="flex items-center pb-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold bg-[#e94560]/10 text-[#e94560] px-3 py-1.5 rounded-full border border-[#e94560]/20">
                            {selectedVariantIndices.length} Selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedVariantIndices([])}
                            className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white underline font-semibold cursor-pointer transition-colors"
                          >
                            Clear Selection
                          </button>
                        </div>

                        <div className="ml-auto pl-3 border-l border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={handleBulkDelete}
                            className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/45 text-red-600 dark:text-red-400 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete Selected</span>
                          </button>
                        </div>
                      </div>

                      {/* Inputs Row - Grid: stacks on mobile (1 col), 6 cols on large screens */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Price */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                            Price
                          </label>
                          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b] focus-within:border-primary focus-within:bg-white transition-all">
                            <input
                              id="bulk-price-input"
                              type="number"
                              placeholder="Enter price"
                              style={{ borderWidth: 0 }}
                              className="w-full min-w-[60px] bg-transparent text-xs text-gray-900 dark:text-white px-3 py-2 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = parseFloat((e.currentTarget as HTMLInputElement).value);
                                  if (!isNaN(val)) {
                                    handleBulkUpdatePrice(val);
                                    (e.currentTarget as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('bulk-price-input') as HTMLInputElement;
                                const val = parseFloat(input?.value);
                                if (!isNaN(val)) {
                                  handleBulkUpdatePrice(val);
                                  input.value = '';
                                }
                              }}
                              className="bg-primary hover:bg-primary-hover text-white px-2.5 py-2 text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Apply
                            </button>
                          </div>
                        </div>

                        {/* Compare Price */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                            Compare Price
                          </label>
                          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b] focus-within:border-primary focus-within:bg-white transition-all">
                            <input
                              id="bulk-compare-price-input"
                              type="number"
                              placeholder="Enter compare price"
                              style={{ borderWidth: 0 }}
                              className="w-full min-w-[60px] bg-transparent text-xs text-gray-900 dark:text-white px-3 py-2 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = parseFloat((e.currentTarget as HTMLInputElement).value);
                                  if (!isNaN(val)) {
                                    handleBulkUpdateComparePrice(val);
                                    (e.currentTarget as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('bulk-compare-price-input') as HTMLInputElement;
                                const val = parseFloat(input?.value);
                                if (!isNaN(val)) {
                                  handleBulkUpdateComparePrice(val);
                                  input.value = '';
                                }
                              }}
                              className="bg-primary hover:bg-primary-hover text-white px-2.5 py-2 text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Apply
                            </button>
                          </div>
                        </div>

                        {/* Stock */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                            Stock
                          </label>
                          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b] focus-within:border-primary focus-within:bg-white transition-all">
                            <input
                              id="bulk-stock-input"
                              type="number"
                              placeholder="Enter stock"
                              style={{ borderWidth: 0 }}
                              className="w-full min-w-[60px] bg-transparent text-xs text-gray-900 dark:text-white px-3 py-2 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = parseInt((e.currentTarget as HTMLInputElement).value, 10);
                                  if (!isNaN(val)) {
                                    handleBulkUpdateStock(val);
                                    (e.currentTarget as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('bulk-stock-input') as HTMLInputElement;
                                const val = parseInt(input?.value, 10);
                                if (!isNaN(val)) {
                                  handleBulkUpdateStock(val);
                                  input.value = '';
                                }
                              }}
                              className="bg-primary hover:bg-primary-hover text-white px-2.5 py-2 text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Apply
                            </button>
                          </div>
                        </div>

                        {/* SKU */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                            SKU
                          </label>
                          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b] focus-within:border-primary focus-within:bg-white transition-all">
                            <input
                              id="bulk-sku-input"
                              type="text"
                              placeholder="SKU prefix"
                              style={{ borderWidth: 0 }}
                              className="w-full min-w-[60px] bg-transparent text-xs text-gray-900 dark:text-white px-3 py-2 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (e.currentTarget as HTMLInputElement).value.trim();
                                  handleBulkUpdateSku(val);
                                  (e.currentTarget as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('bulk-sku-input') as HTMLInputElement;
                                const val = input?.value.trim();
                                handleBulkUpdateSku(val);
                                input.value = '';
                              }}
                              className="bg-primary hover:bg-primary-hover text-white px-2.5 py-2 text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Apply
                            </button>
                          </div>
                        </div>

                        {/* Threshold */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                            Threshold
                          </label>
                          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b] focus-within:border-primary focus-within:bg-white transition-all">
                            <input
                              id="bulk-threshold-input"
                              type="number"
                              placeholder="Enter threshold"
                              style={{ borderWidth: 0 }}
                              className="w-full min-w-[60px] bg-transparent text-xs text-gray-900 dark:text-white px-3 py-2 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = parseInt((e.currentTarget as HTMLInputElement).value, 10);
                                  if (!isNaN(val)) {
                                    handleBulkUpdateThreshold(val);
                                    (e.currentTarget as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('bulk-threshold-input') as HTMLInputElement;
                                const val = parseInt(input?.value, 10);
                                if (!isNaN(val)) {
                                  handleBulkUpdateThreshold(val);
                                  input.value = '';
                                }
                              }}
                              className="bg-primary hover:bg-primary-hover text-white px-2.5 py-2 text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Apply
                            </button>
                          </div>
                        </div>

                        {/* Active Status */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                            Status
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleBulkUpdateActive(true)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors active:scale-95 flex items-center justify-center py-2"
                            >
                              Activate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBulkUpdateActive(false)}
                              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors active:scale-95 flex items-center justify-center py-2"
                            >
                              Deactivate
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Variants Table - desktop */}
                  {variants.length > 0 && (
                    <div className="hidden md:block overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
                      <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-[#1a1a30] border-b border-gray-200 dark:border-gray-800 font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                            <th className="py-3 px-3 w-10">
                              <input
                                type="checkbox"
                                checked={filteredVariants.length > 0 && filteredVariants.every(v => selectedVariantIndices.includes(variants.indexOf(v)))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newIndices = filteredVariants.map(v => variants.indexOf(v));
                                    setSelectedVariantIndices(prev => [...new Set([...prev, ...newIndices])]);
                                  } else {
                                    const filteredIdxSet = new Set(filteredVariants.map(v => variants.indexOf(v)));
                                    setSelectedVariantIndices(prev => prev.filter(i => !filteredIdxSet.has(i)));
                                  }
                                }}
                                className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
                              />
                            </th>
                            <th className="py-3 px-3 w-[21%]">Variant</th>
                            <th className="py-3 px-3 w-[10%]">Color</th>
                            <th className="py-3 px-3 w-[11%]">Price</th>
                            <th className="py-3 px-3 w-[11%]">Compare</th>
                            <th className="py-3 px-3 w-[10%]">Stock *</th>
                            <th className="py-3 px-3 w-[13%]">Threshold</th>
                            <th className="py-3 px-3 w-[16%]">SKU</th>
                            <th className="py-3 px-3 w-[10%] text-center">Active</th>
                            <th className="py-3 px-3 w-[5%] text-center">Del</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">{filteredVariants.map((variant) => {
                            const idx = variants.indexOf(variant);
                            const label = [variant.color, variant.size, variant.material, variant.customValue].filter(Boolean).join(' / ') || `Var ${idx + 1}`;
                            const isSelected = selectedVariantIndices.includes(idx);
                            return (
                              <tr key={idx} className={`transition-colors ${isSelected ? 'bg-[#e94560]/5 dark:bg-[#e94560]/10' : idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/40 dark:bg-white/[0.02]'} hover:bg-gray-100/60 dark:hover:bg-white/[0.04]`}>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center justify-center min-h-[28px]">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedVariantIndices(prev => [...prev, idx]);
                                        } else {
                                          setSelectedVariantIndices(prev => prev.filter(i => i !== idx));
                                        }
                                      }}
                                      className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">
                                  <div className="flex items-center gap-1.5 min-h-[28px]">
                                    {variant.colorHex && (
                                      <span className="h-3 w-3 rounded-full flex-shrink-0 border border-gray-300" style={getSwatchStyle(variant.colorHex)} />
                                    )}
                                    <span className="truncate">{label}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center justify-center min-h-[28px]">
                                    {variant.color && (
                                      <div className="flex items-center gap-1">
                                        {(variant.colorHex || '#888888').split(',').map((hexVal, hexIdx, hexArr) => (
                                          <div key={hexIdx} className="relative group h-7 w-7 rounded border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
                                            <input
                                              type="color"
                                              value={hexVal.trim() || '#888888'}
                                              onChange={(e) => {
                                                const newArr = [...hexArr];
                                                newArr[hexIdx] = e.target.value;
                                                handleUpdateVariant(idx, { colorHex: newArr.join(',') });
                                              }}
                                              className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
                                            />
                                            {hexArr.length > 1 && (
                                              <button type="button" onClick={() => {
                                                const newArr = hexArr.filter((_, i) => i !== hexIdx);
                                                handleUpdateVariant(idx, { colorHex: newArr.join(',') });
                                              }} className="absolute -top-1 -right-1 hidden group-hover:flex h-3 w-3 items-center justify-center bg-red-500 text-white rounded-full text-[8px] z-10 cursor-pointer">×</button>
                                            )}
                                          </div>
                                        ))}
                                        {(variant.colorHex || '#888888').split(',').length < 3 && (
                                          <button type="button" onClick={() => {
                                            handleUpdateVariant(idx, { colorHex: (variant.colorHex || '#888888') + ',#ffffff' });
                                          }} className="h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center text-[10px] cursor-pointer" title="Add split color">+</button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center min-h-[28px]">
                                    <input
                                      type="number"
                                      value={variant.price || ''}
                                      placeholder={price}
                                      onChange={(e) => handleUpdateVariant(idx, { price: parseFloat(e.target.value) || undefined })}
                                      className="w-20 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-[#0f0f1b]/80 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#e94560] focus:ring-1 focus:ring-[#e94560]/20 transition-all"
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center min-h-[28px]">
                                    <input
                                      type="number"
                                      value={variant.comparePrice || ''}
                                      placeholder={comparePrice || '0'}
                                      onChange={(e) => handleUpdateVariant(idx, { comparePrice: parseFloat(e.target.value) || undefined })}
                                      className="w-20 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-[#0f0f1b]/80 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#e94560] focus:ring-1 focus:ring-[#e94560]/20 transition-all"
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center min-h-[28px]">
                                    <input
                                      type="number"
                                      required
                                      value={variant.stock}
                                      onChange={(e) => handleUpdateVariant(idx, { stock: parseInt(e.target.value) || 0 })}
                                      className="w-20 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-[#0f0f1b]/80 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#e94560] focus:ring-1 focus:ring-[#e94560]/20 transition-all"
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center min-h-[28px]">
                                    <input
                                      type="number"
                                      value={variant.inventoryThreshold || 0}
                                      onChange={(e) => handleUpdateVariant(idx, { inventoryThreshold: parseInt(e.target.value) || 0 })}
                                      className="w-20 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-[#0f0f1b]/80 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#e94560] focus:ring-1 focus:ring-[#e94560]/20 transition-all"
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center min-h-[28px]">
                                    <input
                                      type="text"
                                      value={variant.sku || ''}
                                      onChange={(e) => handleUpdateVariant(idx, { sku: e.target.value })}
                                      className="w-24 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-[#0f0f1b]/80 px-2 py-1.5 text-xs focus:outline-none focus:border-[#e94560] focus:ring-1 focus:ring-[#e94560]/20 transition-all"
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center min-h-[28px]">
                                    <input
                                      type="checkbox"
                                      checked={variant.active}
                                      onChange={(e) => handleUpdateVariant(idx, { active: e.target.checked })}
                                      className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center min-h-[28px]">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVariant(idx)}
                                      className="text-red-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                                      title="Remove variant"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Variants Cards - mobile */}
                  {filteredVariants.length > 0 && (
                    <div className="md:hidden space-y-3">
                      {filteredVariants.map((variant) => {
                        const idx = variants.indexOf(variant);
                        const label = [variant.color, variant.size, variant.material, variant.customValue].filter(Boolean).join(' / ') || `Var ${idx + 1}`;
                        const isSelected = selectedVariantIndices.includes(idx);
                        return (
                          <div key={idx} className={`bg-white dark:bg-[#16162a] p-3.5 rounded-xl border transition-all space-y-3 ${isSelected ? 'border-[#e94560] bg-[#e94560]/5' : 'border-gray-200 dark:border-gray-800'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedVariantIndices(prev => [...prev, idx]);
                                    } else {
                                      setSelectedVariantIndices(prev => prev.filter(i => i !== idx));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
                                />
                                {variant.colorHex && (
                                  <span className="h-4 w-4 rounded-full flex-shrink-0 border border-gray-300" style={getSwatchStyle(variant.colorHex)} />
                                )}
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{label}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(idx)}
                                className="text-red-400 hover:text-red-600 p-1.5 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {variant.color && (
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Color</label>
                                  <div className="flex items-center gap-1">
                                    {(variant.colorHex || '#888888').split(',').map((hexVal, hexIdx, hexArr) => (
                                      <div key={hexIdx} className="relative group h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
                                        <input
                                          type="color"
                                          value={hexVal.trim() || '#888888'}
                                          onChange={(e) => {
                                            const newArr = [...hexArr];
                                            newArr[hexIdx] = e.target.value;
                                            handleUpdateVariant(idx, { colorHex: newArr.join(',') });
                                          }}
                                          className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
                                        />
                                        {hexArr.length > 1 && (
                                          <button type="button" onClick={() => {
                                            const newArr = hexArr.filter((_, i) => i !== hexIdx);
                                            handleUpdateVariant(idx, { colorHex: newArr.join(',') });
                                          }} className="absolute -top-1 -right-1 hidden group-hover:flex h-3.5 w-3.5 items-center justify-center bg-red-500 text-white rounded-full text-[8px] z-10 cursor-pointer">×</button>
                                        )}
                                      </div>
                                    ))}
                                    {(variant.colorHex || '#888888').split(',').length < 3 && (
                                      <button type="button" onClick={() => {
                                        handleUpdateVariant(idx, { colorHex: (variant.colorHex || '#888888') + ',#ffffff' });
                                      }} className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer" title="Add split color">+</button>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Price</label>
                                <input
                                  type="number"
                                  value={variant.price || ''}
                                  placeholder={price}
                                  onChange={(e) => handleUpdateVariant(idx, { price: parseFloat(e.target.value) || undefined })}
                                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#0f0f1b] px-3 py-2 font-semibold text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Compare</label>
                                <input
                                  type="number"
                                  value={variant.comparePrice || ''}
                                  placeholder={comparePrice || '0'}
                                  onChange={(e) => handleUpdateVariant(idx, { comparePrice: parseFloat(e.target.value) || undefined })}
                                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#0f0f1b] px-3 py-2 font-semibold text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Stock *</label>
                                <input
                                  type="number"
                                  required
                                  value={variant.stock}
                                  onChange={(e) => handleUpdateVariant(idx, { stock: parseInt(e.target.value) || 0 })}
                                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#0f0f1b] px-3 py-2 font-semibold text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">SKU</label>
                                <input
                                  type="text"
                                  value={variant.sku || ''}
                                  onChange={(e) => handleUpdateVariant(idx, { sku: e.target.value })}
                                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#0f0f1b] px-3 py-2 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Threshold</label>
                                <input
                                  type="number"
                                  value={variant.inventoryThreshold || 0}
                                  onChange={(e) => handleUpdateVariant(idx, { inventoryThreshold: parseInt(e.target.value) || 0 })}
                                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#0f0f1b] px-3 py-2 text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-2 pt-4">
                                <input
                                  type="checkbox"
                                  id={`var-active-${idx}`}
                                  checked={variant.active}
                                  onChange={(e) => handleUpdateVariant(idx, { active: e.target.checked })}
                                  className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
                                />
                                <label htmlFor={`var-active-${idx}`} className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                                  Active
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}
            </div>


            {/* Custom Modifiers (Add-ons) */}
            <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 text-gray-900 dark:text-white transition-colors">
              <h3 className="text-base font-bold text-gray-900">Custom Modifiers (Add-ons)</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Gift Wrap, Custom printing etc"
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2 text-sm focus:outline-none focus:border-[#1a1a2e]"
                />
                <input
                  type="number"
                  placeholder="+ Rs."
                  value={modPrice}
                  onChange={(e) => setModPrice(e.target.value)}
                  className="w-24 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:border-[#1a1a2e]"
                />
                <button
                  type="button"
                  onClick={handleAddModifier}
                  className="bg-[#1a1a2e] text-white py-2 px-3 rounded-xl flex items-center justify-center cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {modifiers.length > 0 && (
                <div className="space-y-2 pt-2">
                  {modifiers.map((mod, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50/30">
                      <div className="text-sm font-semibold text-gray-800">
                        {mod.name} <span className="text-xs font-bold text-gray-400 ml-1">(+ Rs. {mod.price})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveModifier(i)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Status & Images */}
          <div className="space-y-6">
            {/* Product Images Panel */}
            <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 text-gray-900 dark:text-white transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Product Images</h3>
              </div>

              {images.length === 0 ? (
                <div
                  onClick={() => setIsMediaModalOpen(true)}
                  className="flex flex-col items-center justify-center border border-dashed border-gray-200 hover:border-gray-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-gray-50/20 dark:bg-[#0f0f1b]/20 dark:border-gray-800"
                >
                  <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Select Media</span>
                  <span className="text-[10px] text-gray-400 mt-1">Select images from your media library</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMediaModalOpen(true)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span>Select Media</span>
                  </button>
                </div>
              )}

              {/* Uploaded Images preview grid */}
              {images.length > 0 && (
                <DndContext
                  id="product-images-dnd"
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                  onDragStart={handleDragStartImages}
                  onDragCancel={handleDragCancelImages}
                  onDragEnd={handleDragEndImages}
                >
                  <SortableContext
                    items={images.map(img => img.url)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {images.map((img, i) => (
                        <SortableImageItem
                          key={img.url}
                          img={img}
                          index={i}
                          handleRemoveImage={handleRemoveImage}
                          onPreviewImage={setPreviewImageUrl}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Status Settings */}
            <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 text-gray-900 dark:text-white transition-colors">
              <h3 className="text-base font-bold text-gray-900">Status & Options</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Product Visibility</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all select-none has-checked:bg-emerald-50 has-checked:border-emerald-300 has-checked:text-emerald-700 border-gray-200 bg-white hover:bg-gray-50">
                      <input
                        type="radio"
                        name="isActive"
                        checked={isActive === true}
                        onChange={() => setIsActive(true)}
                        className="accent-emerald-600 h-4 w-4"
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-800">Active</span>
                        <p className="text-[10px] text-gray-400 font-medium">Shows on storefront</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all select-none has-checked:bg-red-50 has-checked:border-red-300 has-checked:text-red-700 border-gray-200 bg-white hover:bg-gray-50">
                      <input
                        type="radio"
                        name="isActive"
                        checked={isActive === false}
                        onChange={() => setIsActive(false)}
                        className="accent-red-600 h-4 w-4"
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-800">Inactive</span>
                        <p className="text-[10px] text-gray-400 font-medium">Hidden from store</p>
                      </div>
                    </label>
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-gray-700">Featured Product</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isService}
                    onChange={(e) => setIsService(e.target.checked)}
                    className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-gray-700">Service (No stock tracking)</span>
                </label>
              </div>
            </div>

            {/* Flash Sale Options Card */}
            <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 text-gray-900 dark:text-white transition-colors">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Flash Sale Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={flashSaleEnabled}
                    onChange={(e) => setFlashSaleEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enable Flash Sale for Product</span>
                </label>

                {flashSaleEnabled && (
                  <div className="space-y-4">
                    {/* Discount Settings */}
                    <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/10 p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">💰 Discount Against Compare Price</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Discount Type</label>
                          <select
                            value={flashSaleDiscountType}
                            onChange={(e) => setFlashSaleDiscountType(e.target.value as 'percentage' | 'fixed')}
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:outline-none transition-all cursor-pointer"
                          >
                            <option value="fixed">Fixed Amount (Rs.)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                            {flashSaleDiscountType === 'percentage' ? 'Discount (%)' : 'Discount Amount (Rs.)'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={flashSaleDiscountType === 'percentage' ? 100 : undefined}
                            step={flashSaleDiscountType === 'percentage' ? 1 : 10}
                            value={flashSaleDiscountValue}
                            onChange={(e) => setFlashSaleDiscountValue(parseFloat(e.target.value) || 0)}
                            style={{ borderWidth: 0 }}
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                            placeholder={flashSaleDiscountType === 'percentage' ? 'e.g. 20' : 'e.g. 200'}
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                        ℹ️ Sale ends automatically when timer expires — original prices restore everywhere.
                      </p>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Start Time</label>
                        <input
                          type="datetime-local"
                          value={flashSaleStartDate}
                          onChange={(e) => setFlashSaleStartDate(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">End Time</label>
                        <input
                          type="datetime-local"
                          value={flashSaleEndDate}
                          onChange={(e) => setFlashSaleEndDate(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Frequently Bought Together (FBT) Card */}
            <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 text-gray-900 dark:text-white transition-colors">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Bought Together Recommendations</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Select up to 2 items to bundle and offer discounts at storefront.</p>

              {/* Selected Items List */}
              {frequentlyBoughtTogetherIds.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {frequentlyBoughtTogetherIds.map((id) => {
                    const product = productList.find(p => p.id === id);
                    if (!product) return null;
                    return (
                      <div key={id} className="flex items-center gap-3 p-2 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-lg">
                        <div className="h-10 w-10 shrink-0 rounded border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#0f0f1b]">
                          {(product as any).product_images && (product as any).product_images.length > 0 ? (
                            <img src={((product as any).product_images as any[]).find((img: any) => img.is_primary)?.url || (product as any).product_images[0].url} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800"><ImageIcon className="h-4 w-4 text-gray-400" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {product.sku ? <span className="mr-2">SKU: {product.sku}</span> : <span className="mr-2">No SKU</span>}
                            Rs. {product.price}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFrequentlyBoughtTogetherIds(prev => prev.filter(pId => pId !== id))}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name or SKU to add..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-xs focus:outline-none focus:border-[#1a1a2e] focus:bg-white transition-all dark:border-gray-800 dark:bg-[#111124] text-gray-900 dark:text-white"
                />
              </div>

              <div className="border border-gray-200 dark:border-gray-800 rounded-xl max-h-60 overflow-y-auto p-2 space-y-1 bg-gray-50 dark:bg-[#0f0f1b] overscroll-contain">
                {(() => {
                  const q = productSearchQuery.toLowerCase();
                  const filteredList = productList.filter(product => 
                    product.name.toLowerCase().includes(q) || 
                    (product.sku && product.sku.toLowerCase().includes(q)) ||
                    (product.variants && product.variants.some(v => 
                      (v.sku && v.sku.toLowerCase().includes(q)) ||
                      (v.color && v.color.toLowerCase().includes(q)) ||
                      (v.size && v.size.toLowerCase().includes(q)) ||
                      (v.material && v.material.toLowerCase().includes(q)) ||
                      (v.customValue && v.customValue.toLowerCase().includes(q))
                    ))
                  );

                  if (filteredList.length === 0) {
                    return <div className="p-3 text-xs text-gray-500 text-center">No matching products found.</div>;
                  }

                  return filteredList.map((product) => {
                      const isChecked = frequentlyBoughtTogetherIds.includes(product.id);
                      return (
                        <label
                          key={product.id}
                          className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer select-none border border-transparent transition-colors ${
                            !isChecked && frequentlyBoughtTogetherIds.length >= 2
                              ? 'opacity-50 hover:bg-transparent'
                              : 'hover:bg-gray-100 dark:hover:bg-white/5 hover:border-gray-200 dark:hover:border-gray-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!isChecked && frequentlyBoughtTogetherIds.length >= 2}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (frequentlyBoughtTogetherIds.length < 2) {
                                  setFrequentlyBoughtTogetherIds(prev => [...prev, product.id]);
                                } else {
                                  toast.warning('You can choose a maximum of 2 bought-together items.');
                                }
                              } else {
                                setFrequentlyBoughtTogetherIds(prev => prev.filter(id => id !== product.id));
                              }
                            }}
                            className="shrink-0 rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed"
                          />
                          {(product as any).product_images && (product as any).product_images.length > 0 ? (
                            <div className="h-8 w-8 shrink-0 rounded border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#0f0f1b]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={((product as any).product_images as any[]).find((img: any) => img.is_primary)?.url || (product as any).product_images[0].url} alt={product.name} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 shrink-0 rounded border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-[#0f0f1b] flex items-center justify-center">
                              <ImageIcon className="h-3 w-3 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate leading-tight">{product.name}</p>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {product.sku ? <span className="mr-1.5">SKU: {product.sku}</span> : <span className="mr-1.5">No SKU</span>}
                              Rs. {product.price}
                            </p>
                          </div>
                        </label>
                      );
                    });
                })()}
              </div>
            </div>

            {/* Badge Options Card */}
            <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 text-gray-900 dark:text-white transition-colors">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Badge Options</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={badgeEnabled}
                    onChange={(e) => setBadgeEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enable Badge on Product Card</span>
                </label>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Select Badge</label>
                  <select
                    value={customBadgeId}
                    onChange={(e) => setCustomBadgeId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                  >
                    <option value="">None (No custom badge)</option>
                    {allBadges.map(badge => (
                      <option key={badge.id} value={badge.id}>
                        {badge.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>



            {/* Form Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/admin/products')}
                className="flex-1 text-center border border-gray-200 text-gray-700 bg-white rounded-xl py-3.5 text-sm font-semibold transition-all hover:bg-gray-50 active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`relative overflow-hidden flex-1 flex items-center justify-center text-center text-white rounded-xl py-3.5 text-sm font-bold shadow-md transition-all duration-200 active:scale-95 cursor-pointer ${
                  isSubmitting ? 'bg-[#e94560] disabled:cursor-not-allowed' : 'bg-[#1a1a2e] hover:bg-[#e94560]'
                }`}
              >
                {isSubmitting && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] pointer-events-none z-10 bg-inherit">
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    <div className="flex items-center gap-2 relative z-10">
                      <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Saving...</span>
                    </div>
                  </div>
                )}
                <div className={`flex items-center gap-2 transition-opacity ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>
                  Save Product
                </div>
              </button>
            </div>

          </div>

        </div>
      </form>

      {/* Media Library Modal */}
      <MediaSelectorModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={handleAddSelectedLibraryImages}
        multiple={true}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        url={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </>
  );
}
