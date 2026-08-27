import React, { useEffect, useState } from 'react';
import { BlogPost } from '../types';
import { fetchBlogPosts } from '../lib/supabase';
import { BookOpen, Clock, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { ArticleModal } from './ArticleModal';

interface BlogPreviewProps {
  onNavigateToBlogPage?: () => void;
  onOpenConverter?: () => void;
}

export const BlogPreview: React.FC<BlogPreviewProps> = ({ onNavigateToBlogPage, onOpenConverter }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

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
        console.error('Failed to load blog posts in preview:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNextArticle = () => {
    if (!selectedPost || posts.length === 0) return;
    const currentIndex = posts.findIndex((p) => p.id === selectedPost.id);
    const nextIndex = (currentIndex + 1) % posts.length;
    setSelectedPost(posts[nextIndex]);
  };

  return (
    <section id="blog-section" className="py-20 bg-[#F5EFE4] border-t border-[#E8E1D2]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#93A28F] bg-[#93A28F]/15 px-3 py-1 rounded-full inline-block mb-3">
              Learning Hub & Editorial
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1D231E]">
              Articles & Embroidery Guides
            </h2>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 mt-3 md:mt-0">
            <p className="text-sm text-[#5A6659] max-w-md text-left md:text-right">
              Learn cross-stitch techniques, thread storage secrets, fabric calculations, and pattern tuning.
            </p>
            {onNavigateToBlogPage && (
              <button
                onClick={onNavigateToBlogPage}
                className="text-xs font-bold text-[#E06C38] hover:underline flex items-center gap-1 cursor-pointer mt-1"
              >
                <span>View More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Blog Posts Grid or Loading / Empty */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-6 border border-[#E8E1D2] animate-pulse flex flex-col h-96">
                <div className="w-full h-48 bg-[#E8E1D2] rounded-2xl mb-4" />
                <div className="h-4 bg-[#E8E1D2] rounded w-1/3 mb-3" />
                <div className="h-6 bg-[#E8E1D2] rounded w-3/4 mb-2" />
                <div className="h-4 bg-[#E8E1D2] rounded w-full mb-1" />
                <div className="h-4 bg-[#E8E1D2] rounded w-2/3 mt-auto" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {posts.slice(0, 3).map((post) => {
              const authorInitials = post.author.name
                ? post.author.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                : 'A';

              return (
                <article
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="bg-white rounded-3xl overflow-hidden border border-[#E8E1D2] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer"
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

                      <h3 className="text-xl font-bold text-[#1D231E] mb-3 leading-snug group-hover:text-[#E06C38] transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      <p className="text-sm text-[#5A6659] leading-relaxed line-clamp-3 mb-6">
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
                          className="w-7 h-7 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#E06C38] text-white flex items-center justify-center font-bold text-[10px]">
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
        ) : (
          <div className="bg-white rounded-3xl border border-[#E8E1D2] p-10 text-center shadow-xs">
            <BookOpen className="w-10 h-10 text-[#93A28F] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#1D231E] mb-1">No Articles Found</h3>
            <p className="text-xs text-[#5A6659] max-w-md mx-auto">
              Check back soon for new cross-stitch guides and tutorials.
            </p>
          </div>
        )}

        {/* Modal for Reading Full Article */}
        <ArticleModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onNextArticle={handleNextArticle}
          onOpenConverter={onOpenConverter}
        />

      </div>
    </section>
  );
};
