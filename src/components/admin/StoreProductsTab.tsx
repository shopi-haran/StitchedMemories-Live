import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import { deleteProduct } from '../../lib/supabase';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Package,
  Store,
  Tag,
  DollarSign,
  AlertCircle,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Clock,
  Archive,
  Ban,
  Check,
  Eye,
  Loader2
} from 'lucide-react';

interface StoreProductsTabProps {
  products: Product[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onOpenNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  showToast: (msg: string) => void;
}

type StatusFilterType = 'all' | 'draft' | 'active' | 'sold_out' | 'archived';

export const StoreProductsTab: React.FC<StoreProductsTabProps> = ({
  products,
  isLoading,
  onRefresh,
  onOpenNewProduct,
  onEditProduct,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Delete confirmation modal state
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick image preview state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Categories extracted from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  // Derived counts
  const counts = useMemo(() => {
    let active = 0;
    let draft = 0;
    let soldOut = 0;
    let archived = 0;

    products.forEach((p) => {
      const st = (p.status || 'Draft').toLowerCase();
      if (st === 'active') active++;
      else if (st === 'sold out' || st === 'sold_out') soldOut++;
      else if (st === 'archived') archived++;
      else draft++;
    });

    return {
      total: products.length,
      active,
      draft,
      soldOut,
      archived,
    };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const st = (p.status || 'Draft').toLowerCase();
      
      if (statusFilter === 'draft' && st !== 'draft') return false;
      if (statusFilter === 'active' && st !== 'active') return false;
      if (statusFilter === 'sold_out' && (st !== 'sold out' && st !== 'sold_out')) return false;
      if (statusFilter === 'archived' && st !== 'archived') return false;

      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        const matchesCategory = (p.category || '').toLowerCase().includes(q);
        const matchesId = (p.id || '').toLowerCase().includes(q);
        return matchesName || matchesDesc || matchesCategory || matchesId;
      }

      return true;
    });
  }, [products, statusFilter, categoryFilter, searchQuery]);

  // Handle Product Deletion
  const handleDeleteProduct = async () => {
    if (!deleteConfirmProduct) return;
    setIsDeleting(true);
    try {
      const res = await deleteProduct(deleteConfirmProduct.id);
      if (res.success) {
        showToast(`Product "${deleteConfirmProduct.name}" deleted successfully.`);
        setDeleteConfirmProduct(null);
        await onRefresh();
      } else {
        alert('Failed to delete product: ' + (res.error?.message || 'Database error'));
      }
    } catch (err: any) {
      console.error('Error deleting product:', err);
      alert('An unexpected error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (statusStr?: string) => {
    const raw = (statusStr || 'Draft').toLowerCase();
    if (raw === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          Active
        </span>
      );
    }
    if (raw === 'sold out' || raw === 'sold_out') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
          <Ban className="w-3 h-3 text-rose-700" />
          Sold Out
        </span>
      );
    }
    if (raw === 'archived') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
          <Archive className="w-3 h-3 text-gray-500" />
          Archived
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
        <Clock className="w-3 h-3 text-amber-700" />
        Draft
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner & Stats Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#1D231E]/10 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#1D231E] font-serif flex items-center gap-2">
            <Store className="w-5 h-5 text-[#E06C38]" />
            <span>Store Products Catalog</span>
          </h2>
          <p className="text-xs text-[#1D231E]/60 mt-0.5">
            Manage inventory items, craft kits, fabrics, threads, and supplies in the <code>products</code> table.
          </p>
        </div>

        {/* Counter Pills & Add Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FAF6EE] px-3.5 py-2 rounded-2xl border border-[#E8E1D2] text-xs">
            <span className="font-bold text-[#1D231E]">
              {counts.total} <span className="text-[#7A8877] font-normal">Total</span>
            </span>
            <span className="text-gray-300">•</span>
            <span className="font-bold text-emerald-700">
              {counts.active} <span className="text-[#7A8877] font-normal">Active</span>
            </span>
            <span className="text-gray-300">•</span>
            <span className="font-bold text-amber-700">
              {counts.draft} <span className="text-[#7A8877] font-normal">Drafts</span>
            </span>
            <span className="text-gray-300">•</span>
            <span className="font-bold text-rose-700">
              {counts.soldOut} <span className="text-[#7A8877] font-normal">Sold Out</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenNewProduct}
            className="px-4 py-2.5 bg-[#E06C38] hover:bg-[#c95b28] text-white text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#1D231E]/10 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, category, ID..."
            className="w-full pl-9 pr-4 py-2 bg-[#FAF6EE]/60 border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:bg-white transition-all shadow-2xs"
          />
        </div>

        {/* Filters Group: Status Tabs + Category Dropdown + View Mode */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-[#FAF6EE] p-1 rounded-xl border border-[#E8E1D2] text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#1D231E] text-white shadow-xs'
                  : 'text-[#5A6659] hover:text-[#1D231E]'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-[#5A6659] hover:text-[#1D231E]'
              }`}
            >
              Active ({counts.active})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'draft'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-[#5A6659] hover:text-[#1D231E]'
              }`}
            >
              Drafts ({counts.draft})
            </button>
            <button
              onClick={() => setStatusFilter('sold_out')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'sold_out'
                  ? 'bg-rose-800 text-white shadow-xs'
                  : 'text-[#5A6659] hover:text-[#1D231E]'
              }`}
            >
              Sold Out ({counts.soldOut})
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'archived'
                  ? 'bg-gray-800 text-white shadow-xs'
                  : 'text-[#5A6659] hover:text-[#1D231E]'
              }`}
            >
              Archived ({counts.archived})
            </button>
          </div>

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-xs font-semibold text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38] cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#FAF6EE] p-0.5 rounded-xl border border-[#E8E1D2]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white shadow-2xs text-[#E06C38]' : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Table view"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white shadow-2xs text-[#E06C38]' : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-[#1D231E]/10 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#E06C38] animate-spin mb-3" />
          <h3 className="text-sm font-bold text-[#1D231E]">Loading products catalog...</h3>
          <p className="text-xs text-[#7A8877] mt-1">Querying Supabase products table</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#1D231E]/10 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF6EE] text-[#70806E] flex items-center justify-center mb-4 border border-[#E8E1D2]">
            <Package className="w-8 h-8 text-[#E06C38]" />
          </div>
          <h3 className="text-base font-bold text-[#1D231E] font-serif">No products found</h3>
          <p className="text-xs text-[#7A8877] max-w-sm mt-1 mb-5">
            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No products match your current filter and search criteria.'
              : 'Your store catalog has no products yet. Add your first ready-made kit, thread pack, or accessory.'}
          </p>
          <button
            type="button"
            onClick={onOpenNewProduct}
            className="px-5 py-2.5 bg-[#E06C38] hover:bg-[#c95b28] text-white text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Product</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* ========================================================================= */
        /* TABLE / LIST VIEW */
        /* ========================================================================= */
        <div className="bg-white rounded-3xl border border-[#1D231E]/10 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6EE] text-[#3D5239] uppercase tracking-wider font-bold border-b border-[#E8E1D2]">
                <tr>
                  <th className="px-5 py-4 w-16">Thumbnail</th>
                  <th className="px-5 py-4">Product Details</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Price</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Images</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1] text-[#1D231E]">
                {filteredProducts.map((p) => {
                  const coverImage = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
                  const imageCount = Array.isArray(p.images) ? p.images.length : 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#FAF6EE]/50 transition-colors group">
                      
                      {/* Thumbnail */}
                      <td className="px-5 py-3.5">
                        <div
                          onClick={() => {
                            if (coverImage) setPreviewImage({ url: coverImage, title: p.name });
                          }}
                          className="w-12 h-12 rounded-xl bg-[#FAF6EE] border border-[#E8E1D2] overflow-hidden flex items-center justify-center shrink-0 cursor-pointer relative group/img shadow-2xs"
                        >
                          {coverImage ? (
                            <>
                              <img
                                src={coverImage}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=300';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </>
                          ) : (
                            <Package className="w-5 h-5 text-[#70806E]" />
                          )}
                        </div>
                      </td>

                      {/* Product Name & Description */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="font-bold text-sm text-[#1D231E] group-hover:text-[#E06C38] transition-colors line-clamp-1">
                          {p.name}
                        </div>
                        {p.description ? (
                          <p className="text-[11px] text-[#7A8877] line-clamp-1 mt-0.5 leading-relaxed">
                            {p.description}
                          </p>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No description</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF6EE] text-[#3D5239] border border-[#E8E1D2] font-semibold text-[11px]">
                          <Tag className="w-3 h-3 text-[#70806E]" />
                          {p.category || 'General'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-sm text-[#1D231E] font-mono">
                          ${Number(p.price || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {renderStatusBadge(p.status)}
                      </td>

                      {/* Images count indicator */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-[#7A8877]">
                          <ImageIcon className="w-3.5 h-3.5 text-[#70806E]" />
                          <span>{imageCount} {imageCount === 1 ? 'photo' : 'photos'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditProduct(p)}
                            className="p-2 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#3D5239] hover:text-[#E06C38] border border-[#D5CDBC] transition-colors cursor-pointer shadow-2xs flex items-center gap-1 font-semibold text-xs"
                            title="Edit product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmProduct(p)}
                            className="p-2 rounded-xl bg-white hover:bg-rose-50 text-gray-500 hover:text-rose-600 border border-[#D5CDBC] hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* GRID / CARDS VIEW */
        /* ========================================================================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => {
            const coverImage = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
            const imageCount = Array.isArray(p.images) ? p.images.length : 0;

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-[#1D231E]/10 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Image Card Container */}
                  <div
                    onClick={() => {
                      if (coverImage) setPreviewImage({ url: coverImage, title: p.name });
                    }}
                    className="relative aspect-4/3 w-full rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] overflow-hidden mb-4 cursor-pointer"
                  >
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Package className="w-10 h-10 mb-1" />
                        <span className="text-[10px]">No image uploaded</span>
                      </div>
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5">
                      {renderStatusBadge(p.status)}
                    </div>

                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>{imageCount}</span>
                    </div>
                  </div>

                  {/* Product Category & Price */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold text-[#70806E] bg-[#FAF6EE] px-2 py-0.5 rounded-md border border-[#E8E1D2]">
                      {p.category || 'General'}
                    </span>
                    <span className="text-base font-extrabold text-[#1D231E] font-mono">
                      ${Number(p.price || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm text-[#1D231E] line-clamp-1 group-hover:text-[#E06C38] transition-colors">
                    {p.name}
                  </h3>

                  {/* Description */}
                  {p.description && (
                    <p className="text-xs text-[#7A8877] line-clamp-2 mt-1 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-[#F0EBE1] flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-mono">
                    ID: {p.id.slice(0, 8)}...
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditProduct(p)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#3D5239] hover:text-[#E06C38] border border-[#D5CDBC] transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmProduct(p)}
                      className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-gray-500 hover:text-rose-600 border border-[#D5CDBC] hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-[#E8E1D2] space-y-4">
            
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1D231E]">Delete Product?</h3>
                <p className="text-xs text-[#7A8877]">This operation will remove the product row permanently.</p>
              </div>
            </div>

            <div className="p-3 bg-[#FAF6EE] rounded-2xl border border-[#E8E1D2] flex items-center gap-3">
              {deleteConfirmProduct.images && deleteConfirmProduct.images.length > 0 ? (
                <img
                  src={deleteConfirmProduct.images[0]}
                  alt={deleteConfirmProduct.name}
                  className="w-12 h-12 rounded-xl object-cover border border-[#D5CDBC]"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white border border-[#D5CDBC] flex items-center justify-center">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs text-[#1D231E] truncate">{deleteConfirmProduct.name}</p>
                <p className="text-[11px] text-[#7A8877] mt-0.5">
                  Category: {deleteConfirmProduct.category} • ${Number(deleteConfirmProduct.price).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProduct(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#1D231E] font-semibold text-xs border border-[#D5CDBC] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Product</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK FULL IMAGE PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E1D2]">
              <h4 className="font-bold text-sm text-[#1D231E] truncate">{previewImage.title}</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="py-4 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
