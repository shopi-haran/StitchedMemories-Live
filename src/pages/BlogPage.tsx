import React, { useEffect, useState } from 'react';
import { BlogPost } from '../types';
import { fetchBlogPosts } from '../lib/supabase';
import { BookOpen, Clock, ArrowRight, Search, ArrowLeft, Sparkles, Image as ImageIcon } from 'lucide-react';
import { ArticleModal } from '../components/ArticleModal';

interface BlogPageProps {
  onGoHome: () => void;
  onOpenConverter: () => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onGoHome, onOpenConverter }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    fetchBlogPosts()
      .then((data) => {
        if (isMounted) {
          setPosts(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load blog posts page from Supabase:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = ['All', 'Guide & Tips', 'Inspiration', 'Behind the Scenes', 'Tutorial', 'Organization', 'Advanced Stitching'];

  const filteredPosts = posts.filter((post) => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPost = posts[0] || null;

  const handleNextArticle = () => {
    if (!selectedPost || posts.length === 0) return;
    const currentIndex = posts.findIndex((p) => p.id === selectedPost.id);
    const nextIndex = (currentIndex + 1) % posts.length;
    setSelectedPost(posts[nextIndex]);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#1D231E]">
      
      {/* Header Banner */}
      <div className="bg-[#1D231E] text-white py-12 px-6 lg:px-12 border-b border-[#2D382E] relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <button
              onClick={onGoHome}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#93A28F] hover:text-white mb-3 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
            
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>StitchedMemories Editorial Hub</span>
              <BookOpen className="w-6 h-6 text-[#E06C38]" />
            </h1>
            <p className="text-sm text-[#A2B0A0] mt-1 max-w-xl">
              In-depth cross-stitch guides, thread palette management tips, Aida cloth density comparisons, and heirloom framing tutorials.
            </p>
          </div>

          <button
            onClick={onOpenConverter}
            className="px-5 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Stitchly</span>
          </button>
        </div>
      </div>

      {/* Main Blog Container */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 bg-white border border-[#E8E1D2] rounded-2xl p-4 shadow-xs">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1D231E] text-white shadow-xs'
                    : 'bg-[#FAF6EE] text-[#5A6659] hover:bg-[#E8E1D2]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9588]" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#FAF6EE] border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
            />
          </div>

        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-6 border border-[#E8E1D2] animate-pulse flex flex-col h-96">
                <div className="w-full h-48 bg-[#E8E1D2] rounded-2xl mb-4" />
                <div className="h-4 bg-[#E8E1D2] rounded w-1/3 mb-3" />
                <div className="h-6 bg-[#E8E1D2] rounded w-3/4 mb-2" />
                <div className="h-4 bg-[#E8E1D2] rounded w-full mb-1" />
                <div className="h-4 bg-[#E8E1D2] rounded w-2/3 mt-auto" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Featured Article Banner (Only when 'All' category and no search) */}
            {selectedCategory === 'All' && !searchQuery && featuredPost && (
              <div 
                onClick={() => setSelectedPost(featuredPost)}
                className="mb-12 bg-white border border-[#E8E1D2] rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 cursor-pointer group"
              >
                <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto min-h-[280px] bg-[#E8E1D2]/50 border-r border-[#E8E1D2] flex flex-col items-center justify-center overflow-hidden">
                  {featuredPost.imageUrl ? (
                    <img
                      src={featuredPost.imageUrl}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-[#7A8877]">
                      <ImageIcon className="w-10 h-10 mb-2 text-[#93A28F]" />
                      <span className="text-xs font-bold text-[#5A6659]">Featured Guide Cover</span>
                    </div>
                  )}
                  <span className="absolute top-4 left-4 bg-[#E06C38] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md z-10">
                    Featured Article
                  </span>
                </div>

                <div className="lg:col-span-5 p-8 lg:p-10 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#93A28F] block mb-2">
                      {featuredPost.category} {featuredPost.date && `• ${featuredPost.date}`}
                    </span>

                    <h2 className="text-2xl sm:text-3xl font-bold text-[#1D231E] mb-4 group-hover:text-[#E06C38] transition-colors leading-tight">
                      {featuredPost.title}
                    </h2>

                    <p className="text-sm text-[#5A6659] leading-relaxed mb-6">
                      {featuredPost.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-[#E8E1D2]">
                    <div className="flex items-center gap-2.5">
                      {featuredPost.author.avatarUrl ? (
                        <img
                          src={featuredPost.author.avatarUrl}
                          alt={featuredPost.author.name}
                          className="w-8 h-8 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#E06C38] text-white flex items-center justify-center font-bold text-xs">
                          {featuredPost.author.name ? featuredPost.author.name.split(' ').map(n=>n[0]).join('') : 'A'}
                        </div>
                      )}
                      <span className="text-xs font-bold text-[#1D231E]">{featuredPost.author.name}</span>
                    </div>

                    <span className="text-xs font-bold text-[#E06C38] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Read Article <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Article Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => {
                const authorInitials = post.author.name
                  ? post.author.name.split(' ').map(n=>n[0]).join('')
                  : 'A';

                return (
                  <article
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="bg-white rounded-3xl overflow-hidden border border-[#E8E1D2] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="relative aspect-[16/10] bg-[#E8E1D2]/50 border-b border-[#E8E1D2] flex flex-col items-center justify-center text-[#7A8877] overflow-hidden">
                        {post.imageUrl ? (
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 mb-1 text-[#93A28F]" />
                            <span className="text-[11px] font-semibold text-[#6B7869]">Article Image Space</span>
                          </>
                        )}
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-[#3A4538] border border-white/80 z-10">
                          {post.category}
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex items-center gap-3 text-xs text-[#7A8877] mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {post.readTime}
                          </span>
                          {post.date && (
                            <>
                              <span>•</span>
                              <span>{post.date}</span>
                            </>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-[#1D231E] mb-3 leading-snug group-hover:text-[#E06C38] transition-colors line-clamp-2">
                          {post.title}
                        </h3>

                        <p className="text-xs text-[#5A6659] leading-relaxed line-clamp-3 mb-6">
                          {post.excerpt}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 pt-0 flex items-center justify-between border-t border-[#F0EBE1]">
                      <div className="flex items-center gap-2">
                        {post.author.avatarUrl ? (
                          <img
                            src={post.author.avatarUrl}
                            alt={post.author.name}
                            className="w-6 h-6 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#E06C38] text-white flex items-center justify-center font-bold text-[10px]">
                            {authorInitials}
                          </div>
                        )}
                        <span className="text-xs font-medium text-[#2A3429]">{post.author.name}</span>
                      </div>

                      <span className="text-xs font-bold text-[#E06C38] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Read Article
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-16 bg-white border border-[#E8E1D2] rounded-3xl p-8">
                <BookOpen className="w-10 h-10 text-[#93A28F] mx-auto mb-3" />
                <p className="text-sm font-bold text-[#1D231E]">No articles found</p>
                <p className="text-xs text-[#6B7869] mt-1">
                  {searchQuery
                    ? `No articles found matching "${searchQuery}". Try another search term or category.`
                    : 'No articles match the selected category.'}
                </p>
              </div>
            )}
          </>
        )}

      </div>

      {/* Modal for Reading Full Article */}
      <ArticleModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onNextArticle={handleNextArticle}
        onOpenConverter={onOpenConverter}
      />

    </div>
  );
};
