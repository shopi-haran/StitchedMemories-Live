import React, { useState, useMemo } from 'react';
import { BlogPost } from '../../types';
import { deleteBlogPost } from '../../lib/supabase';
import { ArticleModal } from '../ArticleModal';
import {
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Eye,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  BookOpen,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';

interface BlogPostsTabProps {
  posts: BlogPost[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onOpenNewPost: () => void;
  onEditPost: (post: BlogPost) => void;
  showToast: (msg: string) => void;
}

export const BlogPostsTab: React.FC<BlogPostsTabProps> = ({
  posts,
  isLoading,
  onRefresh,
  onOpenNewPost,
  onEditPost,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<BlogPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewingPost, setPreviewingPost] = useState<BlogPost | null>(null);

  // Derive unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [posts]);

  // Derived counts
  const publishedCount = useMemo(() => posts.filter((p) => p.published !== false && p.date).length, [posts]);
  const draftsCount = useMemo(() => posts.length - publishedCount, [posts, publishedCount]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const isPublished = p.published !== false && Boolean(p.date || p.published_at);

      if (statusFilter === 'published' && !isPublished) return false;
      if (statusFilter === 'draft' && isPublished) return false;

      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (p.title || '').toLowerCase().includes(q);
        const matchesSlug = (p.id || '').toLowerCase().includes(q);
        const matchesExcerpt = (p.excerpt || '').toLowerCase().includes(q);
        const matchesCategory = (p.category || '').toLowerCase().includes(q);
        const matchesAuthor = (p.author?.name || '').toLowerCase().includes(q);
        return matchesTitle || matchesSlug || matchesExcerpt || matchesCategory || matchesAuthor;
      }

      return true;
    });
  }, [posts, statusFilter, categoryFilter, searchQuery]);

  // Handle Delete
  const handleDeletePost = async () => {
    if (!deleteConfirmPost) return;
    setIsDeleting(true);
    try {
      const res = await deleteBlogPost(deleteConfirmPost.id);
      if (res.success) {
        showToast(`Article "${deleteConfirmPost.title}" deleted successfully.`);
        setDeleteConfirmPost(null);
        await onRefresh();
      } else {
        alert('Failed to delete post: ' + (res.error?.message || 'Unknown database error'));
      }
    } catch (err: any) {
      console.error('Error deleting post:', err);
      alert('An unexpected error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#1D231E]/10 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[#1D231E] font-serif flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#E06C38]" />
            <span>Blog Articles & Guides</span>
          </h2>
          <p className="text-xs text-[#1D231E]/60">
            Publish educational content, tutorials, technique breakdowns, and craft stories.
          </p>
        </div>

        {/* Counters & New Post Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FAF6EE] px-3 py-1.5 rounded-xl border border-[#E8E1D2] text-xs">
            <span className="font-semibold text-[#1D231E]">
              {posts.length} <span className="text-[#7A8877] font-normal">Total</span>
            </span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-emerald-700">
              {publishedCount} <span className="text-[#7A8877] font-normal">Published</span>
            </span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-amber-700">
              {draftsCount} <span className="text-[#7A8877] font-normal">Drafts</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenNewPost}
            className="px-4 py-2.5 bg-[#E06C38] hover:bg-[#c95b28] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Post</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#1D231E]/10 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts by title, slug, content..."
            className="w-full pl-9 pr-4 py-2 bg-[#FAF6EE]/50 border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:bg-white transition-all"
          />
        </div>

        {/* Status Filter Tabs & Category Dropdown */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {/* Status Segmented Control */}
          <div className="flex items-center bg-[#FAF6EE] p-1 rounded-xl border border-[#E8E1D2] text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#1D231E] text-white shadow-2xs font-semibold'
                  : 'text-[#5A6659] hover:text-[#1D231E]'
              }`}
            >
              All ({posts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'text-[#5A6659] hover:text-[#1D231E]'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'draft'
                  ? 'bg-amber-600 text-white shadow-2xs font-semibold'
                  : 'text-[#5A6659] hover:text-[#1D231E]'
              }`}
            >
              Drafts ({draftsCount})
            </button>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-xs font-semibold text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Posts List / Table */}
      <div className="bg-white rounded-2xl border border-[#1D231E]/10 shadow-sm overflow-hidden">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF6EE] border border-[#E8E1D2] flex items-center justify-center mx-auto text-[#93A28F]">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1D231E]">No articles found</h3>
            <p className="text-xs text-[#7A8877] max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by creating your very first cross-stitch article or guide.'}
            </p>
            <button
              type="button"
              onClick={onOpenNewPost}
              className="mt-2 px-4 py-2 bg-[#E06C38] hover:bg-[#c95b28] text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Article</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6EE] text-[#5A6659] uppercase tracking-wider font-semibold border-b border-[#E8E1D2]">
                <tr>
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Published / Date</th>
                  <th className="py-3 px-4">Read Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E1D2]">
                {filteredPosts.map((post) => {
                  const isPublished = post.published !== false && Boolean(post.date || post.published_at);

                  return (
                    <tr key={post.id} className="hover:bg-[#FAF6EE]/50 transition-colors group">
                      {/* Cover Thumbnail & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-10 rounded-lg bg-[#FAF6EE] border border-[#D5CDBC] overflow-hidden shrink-0 flex items-center justify-center text-[#93A28F]">
                            {post.imageUrl ? (
                              <img
                                src={post.imageUrl}
                                alt={post.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-sm">
                            <h4 className="font-bold text-[#1D231E] truncate text-sm">
                              {post.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-[#7A8877]">
                              <span className="font-mono truncate">/{post.id}</span>
                              {post.author?.name && (
                                <>
                                  <span>•</span>
                                  <span>by {post.author.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E06C38]/10 text-[#E06C38] border border-[#E06C38]/20">
                          {post.category || 'General'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Published</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>

                      {/* Published Date */}
                      <td className="py-3.5 px-4 text-[#5A6659]">
                        {post.date || (post.published_at ? new Date(post.published_at).toLocaleDateString() : '—')}
                      </td>

                      {/* Read Time */}
                      <td className="py-3.5 px-4 text-[#5A6659] font-medium">
                        {post.readTime || '5 min read'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Button */}
                          <button
                            type="button"
                            title="Preview Article"
                            onClick={() => setPreviewingPost(post)}
                            className="p-1.5 text-[#5A6659] hover:text-[#1D231E] hover:bg-[#E8E1D2] rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            title="Edit Article"
                            onClick={() => onEditPost(post)}
                            className="px-2.5 py-1.5 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            title="Delete Article"
                            onClick={() => setDeleteConfirmPost(post)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmPost && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E8E1D2] space-y-4 animate-scale-in">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#1D231E]">Delete Blog Article?</h3>
              <p className="text-xs text-[#5A6659]">
                Are you sure you want to permanently delete <b>"{deleteConfirmPost.title}"</b>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E1D2]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmPost(null)}
                className="w-full py-2 rounded-xl border border-[#D5CDBC] text-xs font-semibold text-[#5A6659] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeletePost}
                className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal from List */}
      {previewingPost && (
        <ArticleModal
          post={previewingPost}
          onClose={() => setPreviewingPost(null)}
        />
      )}
    </div>
  );
};
