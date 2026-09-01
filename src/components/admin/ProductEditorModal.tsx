import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '../../types';
import { uploadProductImageToSupabase, upsertProduct } from '../../lib/supabase';
import { useModalStack } from '../../hooks/useModalStack';
import {
  X,
  Save,
  Image as ImageIcon,
  Plus,
  Trash2,
  Sparkles,
  Upload,
  AlertCircle,
  Package,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Star,
  CheckCircle2,
  Tag,
  Loader2,
  Eye,
  Link as LinkIcon
} from 'lucide-react';

interface ProductEditorModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedProduct: Product) => void;
  existingCategories?: string[];
}

const DEFAULT_CATEGORIES = [
  'Cross Stitch Kits',
  'Curated Designs',
  'Aida & Linen Fabrics',
  'DMC Floss & Bundles',
  'Embroidery Hoops & Notions',
  'Artisan Finished Pieces',
  'Patterns & Charts',
  'Accessories',
];

const STATUS_OPTIONS: Array<{ value: string; label: string; description: string; color: string }> = [
  { value: 'Draft', label: 'Draft', description: 'Hidden from public storefront', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'Active', label: 'Active', description: 'Published and available for purchase', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'Sold Out', label: 'Sold Out', description: 'Listed but currently out of stock', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { value: 'Archived', label: 'Archived', description: 'Retired product', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaved,
  existingCategories = [],
}) => {
  const isEditing = Boolean(product && product.id);

  // Stack management, dynamic z-index, and scroll containment
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'product-editor-modal' });

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('29.99');
  const [category, setCategory] = useState('Cross Stitch Kits');
  const [customCategory, setCustomCategory] = useState('');
  const [status, setStatus] = useState<string>('Active');
  const [images, setImages] = useState<string[]>([]);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combined category options
  const categoryOptions = React.useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    existingCategories.forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    return Array.from(set);
  }, [existingCategories]);

  // Initialize or reset form when modal opens or product changes
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setName(product.name || '');
        setDescription(product.description || '');
        setPrice(product.price !== undefined ? String(product.price) : '0.00');
        if (categoryOptions.includes(product.category)) {
          setCategory(product.category);
          setCustomCategory('');
        } else {
          setCategory('Custom');
          setCustomCategory(product.category || '');
        }
        // Normalize status
        const rawStatus = (product.status || 'Draft').toLowerCase();
        if (rawStatus === 'active') setStatus('Active');
        else if (rawStatus === 'sold out' || rawStatus === 'sold_out') setStatus('Sold Out');
        else if (rawStatus === 'archived') setStatus('Archived');
        else setStatus('Draft');

        setImages(Array.isArray(product.images) ? [...product.images] : []);
      } else {
        // Brand new product
        setName('');
        setDescription('');
        setPrice('29.99');
        setCategory('Cross Stitch Kits');
        setCustomCategory('');
        setStatus('Draft');
        setImages([]);
      }
      setCustomUrlInput('');
      setShowUrlInput(false);
      setErrorMessage(null);
    }
  }, [isOpen, product, categoryOptions]);

  if (!isOpen) return null;

  // Handle Multi-file Upload
  const handleFilesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setErrorMessage(null);

    const fileArray = Array.from(files);
    const newUploadedUrls: string[] = [];

    try {
      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
          continue;
        }
        const uploadedUrl = await uploadProductImageToSupabase(file, name || 'product');
        if (uploadedUrl) {
          newUploadedUrls.push(uploadedUrl);
        }
      }

      if (newUploadedUrls.length > 0) {
        setImages((prev) => [...prev, ...newUploadedUrls]);
      }
    } catch (err: any) {
      console.error('Error uploading product images:', err);
      setErrorMessage('Failed to upload some images. Fallback data URL was applied where possible.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      setErrorMessage('Please enter a valid image URL (starting with https:// or http://)');
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setCustomUrlInput('');
    setShowUrlInput(false);
    setErrorMessage(null);
  };

  // Reorder Images
  const moveImage = (index: number, direction: 'left' | 'right') => {
    setImages((prev) => {
      const copy迷 = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy迷.length) return prev;
      const temp = copy迷[index];
      copy迷[index] = copy迷[targetIndex];
      copy迷[targetIndex] = temp;
      return copy迷;
    });
  };

  const makePrimaryCover = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Drag & Drop with full browser event override
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMessage('Please enter a valid positive price.');
      return;
    }

    const finalCategory = category === 'Custom' ? customCategory.trim() || 'General' : category;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await upsertProduct({
        id: product?.id,
        name: name.trim(),
        description: description.trim(),
        price: numPrice,
        category: finalCategory,
        status: status,
        images: images,
      });

      if (res.success && res.data) {
        onSaved(res.data);
        onClose();
      } else {
        setErrorMessage('Failed to save product: ' + (res.error?.message || 'Database error'));
      }
    } catch (err: any) {
      console.error('Error saving product:', err);
      setErrorMessage('An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      data-modal-overlay="true"
      data-modal-id={modalId}
      style={{ zIndex }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div 
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E8E1D2] my-8 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#1D231E] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E06C38] flex items-center justify-center text-white shadow-md">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-white font-serif">
                  {isEditing ? 'Edit Product' : 'Add New Store Product'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E06C38]/20 text-[#E06C38] border border-[#E06C38]/40">
                  {status}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-0.5">
                {isEditing ? `Managing product ID: ${product?.id}` : 'Create a ready-made kit, Notion, fabric, or floss item'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scroll Area */}
        <form 
          data-modal-scroll="true"
          onSubmit={handleSubmit} 
          className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-6 text-[#1D231E]"
        >
          
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold">Error</p>
                <p>{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Product Name (Span 2) */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3D5239]">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Victorian Botanical Garden Cross Stitch Kit"
                required
                className="w-full px-4 py-2.5 bg-[#FAF6EE]/60 border border-[#D5CDBC] rounded-xl text-sm text-[#1D231E] font-medium focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:bg-white transition-all shadow-2xs"
              />
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3D5239]">
                Price (USD $) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="29.99"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-[#FAF6EE]/60 border border-[#D5CDBC] rounded-xl text-sm font-semibold text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3D5239]">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF6EE]/60 border border-[#D5CDBC] rounded-xl text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:bg-white transition-all shadow-2xs cursor-pointer"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Custom">+ Custom Category...</option>
              </select>

              {category === 'Custom' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category name"
                  className="w-full mt-2 px-3 py-2 bg-white border border-[#E06C38] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-1 focus:ring-[#E06C38]"
                />
              )}
            </div>

            {/* Status Dropdown */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3D5239]">
                Publication Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      status === opt.value
                        ? 'border-[#E06C38] bg-[#E06C38]/10 text-[#1D231E] shadow-2xs ring-1 ring-[#E06C38]'
                        : 'border-[#D5CDBC] bg-[#FAF6EE]/40 text-[#5A6659] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt.label}</span>
                      {status === opt.value && <CheckCircle2 className="w-3.5 h-3.5 text-[#E06C38]" />}
                    </div>
                    <span className="text-[10px] font-normal text-[#7A8877] leading-tight">
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#3D5239]">
              Product Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the product, materials included (Zweigart Aida cloth, pre-sorted DMC floss skeins, Bohin needles), finished dimensions, and difficulty level..."
              className="w-full px-4 py-3 bg-[#FAF6EE]/60 border border-[#D5CDBC] rounded-2xl text-xs text-[#1D231E] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:bg-white transition-all shadow-2xs resize-y"
            />
          </div>

          {/* Image Upload & Gallery Manager */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3D5239]">
                  Product Images ({images.length})
                </label>
                <p className="text-[11px] text-[#7A8877]">
                  The <strong>first image</strong> serves as the primary cover thumbnail on the shop list.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="px-3 py-1.5 rounded-lg border border-[#D5CDBC] bg-white hover:bg-[#FAF6EE] text-[11px] font-semibold text-[#1D231E] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-[#70806E]" />
                  <span>Add URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3.5 py-1.5 rounded-lg bg-[#E06C38] hover:bg-[#c95b28] text-white text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Images</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Hidden Multi-file Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesUpload(e.target.files);
              }}
            />

            {/* URL Input Bar */}
            {showUrlInput && (
              <div className="p-3 bg-[#FAF6EE] rounded-2xl border border-[#D5CDBC] flex items-center gap-2 animate-fade-in">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://example.com/product-photo.jpg"
                  className="flex-1 px-3 py-2 bg-white border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-1 focus:ring-[#E06C38]"
                />
                <button
                  type="button"
                  onClick={handleAddUrl}
                  className="px-3.5 py-2 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Add Image
                </button>
              </div>
            )}

            {/* Drag & Drop Area / Gallery Grid */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-4 rounded-2xl border-2 border-dashed transition-all ${
                isDragging
                  ? 'border-[#E06C38] bg-[#E06C38]/5'
                  : 'border-[#D5CDBC] bg-[#FAF6EE]/30 hover:bg-[#FAF6EE]/60'
              }`}
            >
              {images.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#D5CDBC] text-[#70806E] flex items-center justify-center mb-3 shadow-2xs">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-[#1D231E]">Drag and drop product photos here</p>
                  <p className="text-[11px] text-[#7A8877] mt-0.5">or click &quot;Upload Images&quot; to choose files from your computer</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 rounded-xl bg-white hover:bg-[#FAF6EE] text-xs font-bold text-[#1D231E] border border-[#D5CDBC] transition-colors cursor-pointer shadow-2xs"
                  >
                    Select Image Files
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((imgUrl, index) => (
                    <div
                      key={`${imgUrl}-${index}`}
                      className={`group relative bg-white rounded-2xl p-2 border transition-all shadow-2xs flex flex-col ${
                        index === 0 ? 'border-[#E06C38] ring-2 ring-[#E06C38]/30' : 'border-[#E8E1D2] hover:border-[#D5CDBC]'
                      }`}
                    >
                      {/* Image Thumbnail Container */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#FAF6EE] border border-[#E8E1D2]">
                        <img
                          src={imgUrl}
                          alt={`Product photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600';
                          }}
                        />

                        {/* Primary Badge */}
                        {index === 0 && (
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#E06C38] text-white text-[10px] font-extrabold shadow-sm flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-white" />
                            <span>Primary Cover</span>
                          </div>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors cursor-pointer shadow-md"
                          title="Remove image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Control Strip */}
                      <div className="mt-2 pt-1 border-t border-[#F0EBE1] flex items-center justify-between text-[11px] text-[#5A6659]">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveImage(index, 'left')}
                            className="p-1 rounded-md hover:bg-[#FAF6EE] text-[#1D231E] disabled:opacity-30 cursor-pointer"
                            title="Move left / forward"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-bold text-gray-400">#{index + 1}</span>
                          <button
                            type="button"
                            disabled={index === images.length - 1}
                            onClick={() => moveImage(index, 'right')}
                            className="p-1 rounded-md hover:bg-[#FAF6EE] text-[#1D231E] disabled:opacity-30 cursor-pointer"
                            title="Move right / backward"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => makePrimaryCover(index)}
                            className="text-[10px] font-bold text-[#E06C38] hover:underline cursor-pointer flex items-center gap-0.5"
                            title="Set as primary thumbnail"
                          >
                            <Star className="w-2.5 h-2.5" />
                            <span>Make Cover</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add more button tile */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-[#D5CDBC] hover:border-[#E06C38] bg-white hover:bg-[#FAF6EE]/60 flex flex-col items-center justify-center gap-1.5 transition-all text-[#70806E] hover:text-[#E06C38] cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-[11px] font-bold">Add More</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#FAF6EE] border-t border-[#E8E1D2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#7A8877]">
            {isEditing ? 'Changes will immediately update the database product row.' : 'New product will be added to the products catalog.'}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#EFE7D8] text-[#1D231E] font-semibold text-xs border border-[#D5CDC0] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || isUploading}
              className="px-6 py-2.5 rounded-xl bg-[#E06C38] hover:bg-[#c95b28] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Update Product' : 'Create Product'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
