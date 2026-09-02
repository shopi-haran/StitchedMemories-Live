import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BlogPost, BlogPostSection } from '../../types';
import {
  parseContentToSections,
  serializeSectionsToText,
  slugifyTitle,
  calculateReadTime,
} from '../../utils/blogParser';
import { uploadBlogImageToSupabase, upsertBlogPost } from '../../lib/supabase';
import { ArticleContentRenderer } from '../ArticleContentRenderer';
import { useModalStack } from '../../hooks/useModalStack';
import {
  X,
  Save,
  Send,
  Image as ImageIcon,
  Plus,
  Trash2,
  Sparkles,
  HelpCircle,
  Heart,
  Eye,
  Check,
  Upload,
  AlertCircle,
  FileText,
  Columns,
  Maximize2,
  Minimize2,
  RefreshCw,
  FolderOpen,
  Bold,
  Heading2,
  Heading3,
  List,
  Edit3
} from 'lucide-react';

interface BlogEditorModalProps {
  post: BlogPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedPost: BlogPost, isPublished: boolean) => void;
  currentUserName?: string;
  currentUserAvatar?: string;
}

const CATEGORY_OPTIONS = [
  'Guide & Tips',
  'Tutorial',
  'Inspiration',
  'Pattern Tuning',
  'Thread & Color',
  'Behind the Scenes',
  'Tools & Techniques',
];

export const BlogEditorModal: React.FC<BlogEditorModalProps> = ({
  post,
  isOpen,
  onClose,
  onSaved,
  currentUserName = 'Elena Rostova',
  currentUserAvatar = '',
}) => {
  const isEditing = Boolean(post && post.id);

  // Stack management, dynamic z-index, and scroll containment
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'blog-editor-modal' });

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Guide & Tips');
  const [customCategory, setCustomCategory] = useState('');
  const [readTime, setReadTime] = useState('5 min read');
  const [authorName, setAuthorName] = useState(currentUserName);
  const [authorAvatar, setAuthorAvatar] = useState(currentUserAvatar);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [contentText, setContentText] = useState('');

  // UI state
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inline Block Modals
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [insertImageUrl, setInsertImageUrl] = useState('');
  const [insertImageCaption, setInsertImageCaption] = useState('');
  const [isUploadingInsertImage, setIsUploadingInsertImage] = useState(false);

  const [isCalloutModalOpen, setIsCalloutModalOpen] = useState(false);
  const [calloutTitle, setCalloutTitle] = useState('Pro Stitcher Tip');
  const [calloutContent, setCalloutContent] = useState('');
  const [calloutCtaText, setCalloutCtaText] = useState('Try Pattern Converter');
  const [calloutCtaAction, setCalloutCtaAction] = useState<'converter' | 'shop'>('converter');

  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [faqItems, setFaqItems] = useState<{ question: string; answer: string }[]>([
    { question: 'What fabric count works best for portrait cross-stitch?', answer: '14-count or 16-count Aida provides sharp definition while remaining easy to stitch.' },
  ]);

  const [isCtaModalOpen, setIsCtaModalOpen] = useState(false);
  const [ctaTitle, setCtaTitle] = useState('Transform Your Memories into Stitches');
  const [ctaContent, setCtaContent] = useState('Upload any photograph and generate high-fidelity DMC color patterns in seconds.');
  const [ctaButtonText, setCtaButtonText] = useState('Generate My Pattern');
  const [ctaButtonAction, setCtaButtonAction] = useState<'converter' | 'shop'>('converter');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const imageBlockFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form when modal opens or post changes
  useEffect(() => {
    if (isOpen) {
      if (post) {
        setTitle(post.title || '');
        setSlug(post.id || slugifyTitle(post.title || ''));
        setSlugManuallyEdited(true);
        setExcerpt(post.excerpt || '');
        if (CATEGORY_OPTIONS.includes(post.category)) {
          setCategory(post.category);
          setCustomCategory('');
        } else {
          setCategory('Custom');
          setCustomCategory(post.category || '');
        }
        setReadTime(post.readTime || '5 min read');
        setAuthorName(post.author?.name || currentUserName);
        setAuthorAvatar(post.author?.avatarUrl || currentUserAvatar);
        setCoverImageUrl(post.imageUrl || '');
        setContentText(serializeSectionsToText(post.contentSections));
      } else {
        // Brand new post
        setTitle('');
        setSlug('');
        setSlugManuallyEdited(false);
        setExcerpt('');
        setCategory('Guide & Tips');
        setCustomCategory('');
        setReadTime('5 min read');
        setAuthorName(currentUserName);
        setAuthorAvatar(currentUserAvatar);
        setCoverImageUrl('');
        setContentText(
          `## Getting Started\n\nCross-stitching is a timeless craft combining precision and creative expression. Follow these tips to elevate your technique.\n\n### Essential Checklist\n- Use tapestry needles (size 24 or 26)\n- Separate your embroidery floss into 2 strands\n- Keep stitch tension consistent across rows\n\nWith Stitchara Studio, you can convert high-resolution photos into optimized DMC palettes seamlessly.`
        );
      }
      setErrorMessage(null);
    }
  }, [isOpen, post, currentUserName, currentUserAvatar]);

  // Auto-generate slug from title if not manually edited
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugManuallyEdited && !isEditing) {
      setSlug(slugifyTitle(val));
    }
  };

  // Helper to insert text at the current cursor position in the textarea
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContentText((prev) => prev + '\n\n' + textToInsert);
      return;
    }

    const startPos = textarea.selectionStart || 0;
    const endPos = textarea.selectionEnd || 0;
    const currentVal = textarea.value;

    const before = currentVal.substring(0, startPos);
    const after = currentVal.substring(endPos, currentVal.length);

    const needsPreNewline = before.length > 0 && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const needsPostNewline = after.length > 0 && !after.startsWith('\n') ? '\n\n' : '';

    const newText = before + needsPreNewline + textToInsert + needsPostNewline + after;
    setContentText(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + needsPreNewline.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Bold Formatting: wraps selected text in ** ** or inserts **** with cursor in between
  const handleFormatBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const text = textarea.value;
    const selected = text.substring(start, end);

    if (selected.length > 0) {
      // Check if already bolded
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
        const unwrapped = selected.slice(2, -2);
        const newText = text.substring(0, start) + unwrapped + text.substring(end);
        setContentText(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + unwrapped.length);
        }, 0);
      } else {
        const wrapped = `**${selected}**`;
        const newText = text.substring(0, start) + wrapped + text.substring(end);
        setContentText(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + wrapped.length);
        }, 0);
      }
    } else {
      // No text selected: insert **** and position cursor between asterisks
      const newText = text.substring(0, start) + '****' + text.substring(end);
      setContentText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  // Heading 2 & 3 Formatting: inserts "## " or "### " at the start of current line
  const handleFormatHeading = (level: 2 | 3) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const text = textarea.value;

    const prefix = level === 2 ? '## ' : '### ';

    // Find start of line containing the cursor / selection
    const lastNewline = text.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const lineRest = text.substring(lineStart);

    // Check if line already begins with markdown heading syntax
    let existingHeadingLen = 0;
    if (lineRest.startsWith('### ')) {
      existingHeadingLen = 4;
    } else if (lineRest.startsWith('## ')) {
      existingHeadingLen = 3;
    } else if (lineRest.startsWith('# ')) {
      existingHeadingLen = 2;
    }

    const newText =
      text.substring(0, lineStart) +
      prefix +
      text.substring(lineStart + existingHeadingLen);

    const delta = prefix.length - existingHeadingLen;
    setContentText(newText);

    setTimeout(() => {
      textarea.focus();
      const newStart = Math.max(lineStart + prefix.length, start + delta);
      const newEnd = Math.max(lineStart + prefix.length, end + delta);
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  // Bullet List Formatting: inserts "- " at the start of current line(s)
  const handleFormatList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const text = textarea.value;

    // Find line boundaries
    const firstLineStart = text.lastIndexOf('\n', start - 1) === -1 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
    const nextNewline = text.indexOf('\n', end);
    const lastLineEnd = nextNewline === -1 ? text.length : nextNewline;

    const targetChunk = text.substring(firstLineStart, lastLineEnd);
    const lines = targetChunk.split('\n');

    const allAreLists = lines.every((l) => l.startsWith('- '));

    const transformedLines = lines.map((l) => {
      if (allAreLists) {
        // Toggle off
        return l.startsWith('- ') ? l.substring(2) : l;
      } else {
        if (l.startsWith('- ')) return l;
        if (l.startsWith('* ')) return '- ' + l.substring(2);
        return `- ${l}`;
      }
    });

    const replacedChunk = transformedLines.join('\n');
    const newText = text.substring(0, firstLineStart) + replacedChunk + text.substring(lastLineEnd);

    setContentText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(firstLineStart, firstLineStart + replacedChunk.length);
    }, 0);
  };

  // Keydown handler to support Enter list-continuation and Ctrl/Cmd+B shortcut
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? 0;
      const text = textarea.value;
      const lastNewline = text.lastIndexOf('\n', start - 1);
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
      const currentLine = text.substring(lineStart, start);

      if (currentLine.startsWith('- ')) {
        e.preventDefault();
        // If the bullet line is empty (just "- "), exit list mode
        if (currentLine.trim() === '-') {
          const newText = text.substring(0, lineStart) + text.substring(start);
          setContentText(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
        } else {
          // Continue list mode on next line
          const insertion = '\n- ';
          const newText = text.substring(0, start) + insertion + text.substring(start);
          setContentText(newText);
          setTimeout(() => {
            textarea.focus();
            const newPos = start + insertion.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
        }
      }
    } else if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      handleFormatBold();
    }
  };

  // Handle Cover Image Upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const activeSlug = slug.trim() || slugifyTitle(title) || 'blog-cover';

    setIsUploadingCover(true);
    setErrorMessage(null);
    try {
      const publicUrl = await uploadBlogImageToSupabase(file, activeSlug, 'cover');
      setCoverImageUrl(publicUrl);
    } catch (err: any) {
      console.error('Error uploading cover image:', err);
      setErrorMessage('Failed to upload cover image. Please try again.');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  // Handle Insert Image File Pick
  const handleInsertImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const activeSlug = slug.trim() || slugifyTitle(title) || 'blog-article';

    setIsUploadingInsertImage(true);
    try {
      const publicUrl = await uploadBlogImageToSupabase(file, activeSlug, 'article_img');
      setInsertImageUrl(publicUrl);
    } catch (err: any) {
      console.error('Error uploading article image:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingInsertImage(false);
      if (imageBlockFileInputRef.current) imageBlockFileInputRef.current.value = '';
    }
  };

  // Confirm Insert Image Block
  const handleConfirmInsertImage = () => {
    if (!insertImageUrl.trim()) {
      alert('Please upload an image or provide a valid image URL.');
      return;
    }
    const blockCode = `<!--BLOCK:IMAGE ${JSON.stringify({
      imageUrl: insertImageUrl.trim(),
      imageCaption: insertImageCaption.trim(),
    })}-->`;
    insertTextAtCursor(blockCode);
    setIsImageModalOpen(false);
    setInsertImageUrl('');
    setInsertImageCaption('');
  };

  // Confirm Callout Block
  const handleConfirmInsertCallout = () => {
    if (!calloutContent.trim()) {
      alert('Please enter callout content text.');
      return;
    }
    const blockCode = `<!--BLOCK:CALLOUT ${JSON.stringify({
      title: calloutTitle.trim() || 'Studio Note',
      content: calloutContent.trim(),
      ctaText: calloutCtaText.trim() || undefined,
      ctaAction: calloutCtaAction,
    })}-->`;
    insertTextAtCursor(blockCode);
    setIsCalloutModalOpen(false);
    setCalloutContent('');
  };

  // Confirm FAQ Block
  const handleConfirmInsertFaq = () => {
    const validFaqs = faqItems.filter((f) => f.question.trim() && f.answer.trim());
    if (validFaqs.length === 0) {
      alert('Please provide at least one valid question and answer pair.');
      return;
    }
    const blockCode = `<!--BLOCK:FAQ ${JSON.stringify({
      faqs: validFaqs,
    })}-->`;
    insertTextAtCursor(blockCode);
    setIsFaqModalOpen(false);
  };

  // Confirm CTA Block
  const handleConfirmInsertCta = () => {
    if (!ctaContent.trim()) {
      alert('Please enter description text for the CTA block.');
      return;
    }
    const blockCode = `<!--BLOCK:CTA ${JSON.stringify({
      title: ctaTitle.trim() || 'Start Crafting',
      content: ctaContent.trim(),
      ctaText: ctaButtonText.trim() || 'Launch Stitchara',
      ctaAction: ctaButtonAction,
    })}-->`;
    insertTextAtCursor(blockCode);
    setIsCtaModalOpen(false);
  };

  // Real-time parsed sections for Live Preview
  const parsedSections = useMemo(() => {
    return parseContentToSections(contentText);
  }, [contentText]);

  const effectiveCategory = category === 'Custom' ? customCategory.trim() || 'Guide & Tips' : category;

  // Live preview post object
  const previewPost: BlogPost = useMemo(() => {
    return {
      id: slug || 'preview-post',
      slug: slug || 'preview-post',
      title: title || 'Untitled Blog Post',
      excerpt: excerpt || '',
      category: effectiveCategory,
      readTime: readTime || calculateReadTime(contentText, excerpt),
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      imageUrl: coverImageUrl || '',
      author: {
        name: authorName || 'Elena Rostova',
        avatarUrl: authorAvatar || '',
      },
      contentSections: parsedSections,
    };
  }, [
    slug,
    title,
    excerpt,
    effectiveCategory,
    readTime,
    contentText,
    coverImageUrl,
    authorName,
    authorAvatar,
    parsedSections,
  ]);

  // Save / Publish handler
  const handleSave = async (publish: boolean) => {
    if (!title.trim()) {
      setErrorMessage('Post Title is required.');
      return;
    }

    const finalSlug = slug.trim() || slugifyTitle(title);
    if (!finalSlug) {
      setErrorMessage('A valid URL slug is required.');
      return;
    }

    const finalReadTime = readTime.trim() || calculateReadTime(contentText, excerpt);
    const finalPublishedAt = publish
      ? post?.published_at || new Date().toISOString()
      : null;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        id: finalSlug,
        title: title.trim(),
        excerpt: excerpt.trim(),
        category: effectiveCategory,
        read_time: finalReadTime,
        published_at: finalPublishedAt,
        published: publish,
        cover_image_url: coverImageUrl.trim(),
        author: {
          name: authorName.trim() || 'Elena Rostova',
          avatarUrl: authorAvatar.trim(),
        },
        content_sections: parsedSections,
      };

      const res = await upsertBlogPost(payload);

      if (res.success && res.data) {
        onSaved(res.data, publish);
        onClose();
      } else {
        setErrorMessage(
          'Database save failed: ' + (res.error?.message || 'Please verify database connectivity and permissions.')
        );
      }
    } catch (err: any) {
      console.error('Exception in handleSave blog post:', err);
      setErrorMessage('An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      data-modal-overlay="true"
      data-modal-id={modalId}
      style={{ zIndex }}
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-hidden"
    >
      <div className="bg-[#FAF6EE] rounded-3xl w-full max-w-7xl h-[94vh] max-h-[96vh] flex flex-col shadow-2xl border border-[#E8E1D2] overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#1D231E] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E06C38] flex items-center justify-center text-white font-bold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-serif flex items-center gap-2">
                <span>{isEditing ? 'Edit Blog Article' : 'Create New Blog Article'}</span>
                {title && (
                  <span className="text-xs font-normal text-white/60 truncate max-w-xs hidden sm:inline">
                    — {title}
                  </span>
                )}
              </h2>
              <p className="text-xs text-white/60">
                Compose rich cross-stitch tutorials, guides, and pattern stories.
              </p>
            </div>
          </div>

          {/* View Toggles & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Split / Editor / Preview View Switcher */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'editor' ? 'bg-[#E06C38] text-white shadow-xs' : 'text-white/70 hover:text-white'
                }`}
                title="Edit raw text & metadata"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`hidden md:flex px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all items-center gap-1.5 cursor-pointer ${
                  activeTab === 'split' ? 'bg-[#E06C38] text-white shadow-xs' : 'text-white/70 hover:text-white'
                }`}
                title="Side-by-side editing & preview"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview' ? 'bg-[#E06C38] text-white shadow-xs' : 'text-white/70 hover:text-white'
                }`}
                title="Live rendered visitor preview"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            {/* Save as Draft Button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save as</span> Draft
            </button>

            {/* Publish Button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(true)}
              className="px-5 py-2 bg-[#E06C38] hover:bg-[#c95b28] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish</span>
                </>
              )}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800 font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Workspace Body */}
        <div
          className={`flex-1 min-h-0 overflow-hidden ${
            activeTab === 'split'
              ? 'grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E8E1D2] h-full'
              : 'flex flex-col h-full'
          }`}
        >
          {/* ========================================================================= */}
          {/* LEFT: FORM & MARKDOWN EDITOR */}
          {/* ========================================================================= */}
          <div
            className={`h-full overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6 scrollbar-thin ${
              activeTab === 'preview' ? 'hidden' : 'block'
            } ${activeTab === 'editor' ? 'w-full max-w-4xl mx-auto flex-1 min-h-0' : ''}`}
          >
            {/* Meta Fields Card */}
            <div className="bg-white p-5 rounded-2xl border border-[#E8E1D2] shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A8877]">
                Article Metadata
              </h3>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-[#1D231E] mb-1.5">
                  Post Title <span className="text-[#E06C38]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g., 15 Pet Portrait Cross Stitch Ideas & Palette Secrets"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5CDBC] bg-[#FAF6EE]/50 text-sm font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:bg-white transition-all"
                />
              </div>

              {/* Slug / ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#1D231E]">
                    Slug / Unique ID <span className="text-[#E06C38]">*</span>
                  </label>
                  <span className="text-[11px] text-[#7A8877]">Used in URL and storage folder</span>
                </div>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="e.g. 15-pet-portrait-cross-stitch-ideas"
                  className="w-full px-4 py-2 rounded-xl border border-[#D5CDBC] bg-[#FAF6EE]/50 text-xs font-mono text-[#3A4538] focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:bg-white transition-all"
                />
              </div>

              {/* Category & Read Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5CDBC] bg-[#FAF6EE]/50 text-xs font-semibold text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="Custom">+ Custom Category</option>
                  </select>
                  {category === 'Custom' && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter custom category name"
                      className="mt-2 w-full px-3 py-1.5 rounded-lg border border-[#D5CDBC] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                    />
                  )}
                </div>

                {/* Read Time */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#1D231E]">Read Time</label>
                    <button
                      type="button"
                      onClick={() => setReadTime(calculateReadTime(contentText, excerpt))}
                      className="text-[11px] font-semibold text-[#E06C38] hover:underline"
                    >
                      Auto-calculate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    placeholder="e.g. 6 min read"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5CDBC] bg-[#FAF6EE]/50 text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                  />
                </div>
              </div>

              {/* Author Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Author Name</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Elena Rostova"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5CDBC] bg-[#FAF6EE]/50 text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Author Avatar URL</label>
                  <input
                    type="text"
                    value={authorAvatar}
                    onChange={(e) => setAuthorAvatar(e.target.value)}
                    placeholder="https://... or leave empty"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5CDBC] bg-[#FAF6EE]/50 text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-bold text-[#1D231E] mb-1.5">
                  Lead Excerpt / Summary
                </label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief introductory hook shown in blog cards and as the hero lead paragraph..."
                  className="w-full px-4 py-2 rounded-xl border border-[#D5CDBC] bg-[#FAF6EE]/50 text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38] resize-none"
                />
              </div>

              {/* Cover Image Upload Area */}
              <div>
                <label className="block text-xs font-bold text-[#1D231E] mb-1.5">
                  Hero Cover Image
                </label>

                <div className="flex items-start gap-4">
                  {/* Thumbnail / Upload Box */}
                  <div
                    onClick={() => coverFileInputRef.current?.click()}
                    className="w-32 h-20 rounded-xl bg-[#FAF6EE] border-2 border-dashed border-[#D5CDBC] hover:border-[#E06C38] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group shrink-0 transition-colors"
                  >
                    {coverImageUrl ? (
                      <>
                        <img
                          src={coverImageUrl}
                          alt="Cover"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition-opacity">
                          Replace
                        </div>
                      </>
                    ) : (
                      <>
                        {isUploadingCover ? (
                          <RefreshCw className="w-5 h-5 text-[#E06C38] animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-[#93A28F] mb-1" />
                            <span className="text-[10px] font-bold text-[#5A6659]">Upload Cover</span>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Manual URL input & controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="Paste image URL directly or upload..."
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D5CDBC] bg-[#FAF6EE]/50 text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        disabled={isUploadingCover}
                        className="px-3 py-1 bg-[#1D231E] hover:bg-[#323D34] text-white text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{isUploadingCover ? 'Uploading...' : 'Choose File'}</span>
                      </button>
                      {coverImageUrl && (
                        <button
                          type="button"
                          onClick={() => setCoverImageUrl('')}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 text-[11px] font-semibold rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  ref={coverFileInputRef}
                  onChange={handleCoverUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Content Editor Card */}
            <div className="bg-white p-5 rounded-2xl border border-[#E8E1D2] shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8E1D2]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A8877]">
                  Article Content
                </h3>
                <span className="text-[11px] text-[#7A8877]">
                  Supports Markdown & Special Studio Blocks
                </span>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[#FAF6EE] border border-[#E8E1D2]">
                {/* Bold Button */}
                <button
                  type="button"
                  title="Bold (**text**) - Ctrl/Cmd+B"
                  onClick={handleFormatBold}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D5CDBC] text-xs font-bold text-[#1D231E] hover:bg-[#E06C38] hover:text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span>Bold</span>
                </button>

                {/* Heading 2 Button */}
                <button
                  type="button"
                  title="Heading 2 (## Section)"
                  onClick={() => handleFormatHeading(2)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D5CDBC] text-xs font-bold text-[#1D231E] hover:bg-[#E06C38] hover:text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                  <span>H2</span>
                </button>

                {/* Heading 3 Button */}
                <button
                  type="button"
                  title="Heading 3 (### Subheading)"
                  onClick={() => handleFormatHeading(3)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D5CDBC] text-xs font-bold text-[#1D231E] hover:bg-[#E06C38] hover:text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Heading3 className="w-3.5 h-3.5" />
                  <span>H3</span>
                </button>

                {/* Bullet List Button */}
                <button
                  type="button"
                  title="Bullet List (- Item)"
                  onClick={handleFormatList}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D5CDBC] text-xs font-bold text-[#1D231E] hover:bg-[#E06C38] hover:text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>

                <div className="h-4 w-px bg-[#D5CDBC] mx-1" />

                {/* Insert Image Block Button */}
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-[#E5EDE2] hover:bg-[#D5E2D1] text-xs font-bold text-[#2A3429] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#3D5239]" />
                  <span>Insert Image</span>
                </button>

                {/* Add Callout Button */}
                <button
                  type="button"
                  onClick={() => setIsCalloutModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-[#E5EDE2] hover:bg-[#D5E2D1] text-xs font-bold text-[#2A3429] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Heart className="w-3.5 h-3.5 text-[#E06C38]" />
                  <span>Add Callout</span>
                </button>

                {/* Add FAQ Button */}
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-[#E5EDE2] hover:bg-[#D5E2D1] text-xs font-bold text-[#2A3429] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#E06C38]" />
                  <span>Add FAQ</span>
                </button>

                {/* Add CTA Button */}
                <button
                  type="button"
                  onClick={() => setIsCtaModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-[#1D231E] hover:bg-[#323D34] text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E06C38]" />
                  <span>Add CTA</span>
                </button>
              </div>

              {/* Large Content Textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={16}
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={`Write your article here using regular markdown paragraphs:\n\n## Section Title\n\nExplain stitch techniques, color selection tips, or fabric calculations.\n\n- Tip 1\n- Tip 2\n\nUse the buttons above to insert images, tips, FAQs, and interactive buttons!`}
                  className="w-full p-4 rounded-xl border border-[#D5CDBC] bg-[#FAF6EE]/40 text-sm font-sans text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38] focus:bg-white font-mono leading-relaxed transition-all resize-y min-h-[360px]"
                />
              </div>

              {/* Formatting Helper Cheat Sheet */}
              <div className="p-3 rounded-xl bg-[#FAF6EE] text-[11px] text-[#5A6659] space-y-1">
                <p className="font-bold text-[#1D231E]">Formatting Cheat Sheet:</p>
                <p>• Blank line separates paragraphs</p>
                <p>• Lines starting with <code className="bg-white px-1 py-0.5 rounded text-[#E06C38]">## </code> create Heading 2</p>
                <p>• Lines starting with <code className="bg-white px-1 py-0.5 rounded text-[#E06C38]">### </code> create Subheadings</p>
                <p>• Lines starting with <code className="bg-white px-1 py-0.5 rounded text-[#E06C38]">- </code> group into bullet lists</p>
                <p>• Wrap text in <code className="bg-white px-1 py-0.5 rounded text-[#E06C38]">**bold**</code> for emphasis</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT: LIVE PREVIEW PANE */}
          {/* ========================================================================= */}
          <div
            className={`h-full overflow-y-auto overscroll-contain p-4 sm:p-6 bg-[#FAF6EE] scrollbar-thin ${
              activeTab === 'editor' ? 'hidden' : 'block'
            } ${activeTab === 'preview' ? 'w-full flex-1 min-h-0' : ''}`}
          >
            <div className={`mx-auto ${activeTab === 'preview' ? 'max-w-4xl' : 'max-w-2xl'}`}>
              {/* Preview Header Badge */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E1D2]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5A6659]">
                    Live Visitor Preview
                  </span>
                </div>
                <span className="text-[11px] text-[#7A8877]">
                  {parsedSections.length} section{parsedSections.length === 1 ? '' : 's'} parsed
                </span>
              </div>

              {/* Exact Article Render Component */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E1D2] shadow-sm">
                <ArticleContentRenderer post={previewPost} interactive={false} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: INSERT IMAGE BLOCK */}
      {/* ========================================================================= */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8E1D2] space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1D231E] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#E06C38]" />
                Insert Article Image Block
              </h4>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload or URL */}
            <div>
              <label className="block text-xs font-bold text-[#1D231E] mb-1.5">
                Upload from Computer or Device
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => imageBlockFileInputRef.current?.click()}
                  disabled={isUploadingInsertImage}
                  className="px-4 py-2 rounded-xl bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingInsertImage ? 'Uploading...' : 'Choose File'}</span>
                </button>
                <span className="text-xs text-[#7A8877]">
                  {insertImageUrl ? '✓ Image uploaded' : 'PNG, JPG, WEBP'}
                </span>
              </div>
              <input
                type="file"
                ref={imageBlockFileInputRef}
                onChange={handleInsertImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Or Paste Image URL</label>
              <input
                type="text"
                value={insertImageUrl}
                onChange={(e) => setInsertImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5CDBC] text-xs focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D231E] mb-1.5">
                Optional Caption text
              </label>
              <input
                type="text"
                value={insertImageCaption}
                onChange={(e) => setInsertImageCaption(e.target.value)}
                placeholder="e.g. DMC floss bobbin organizer in warm light"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5CDBC] text-xs focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
              />
            </div>

            {insertImageUrl && (
              <div className="aspect-[16/9] max-h-32 rounded-xl overflow-hidden border border-[#D5CDBC]">
                <img src={insertImageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#5A6659] hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertImage}
                className="px-5 py-2 rounded-xl bg-[#E06C38] hover:bg-[#c95b28] text-white text-xs font-bold transition-all shadow-xs"
              >
                Insert Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: ADD CALLOUT BLOCK */}
      {/* ========================================================================= */}
      {isCalloutModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8E1D2] space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1D231E] flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#E06C38]" />
                Add Studio Callout Block
              </h4>
              <button
                type="button"
                onClick={() => setIsCalloutModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Callout Title</label>
              <input
                type="text"
                value={calloutTitle}
                onChange={(e) => setCalloutTitle(e.target.value)}
                placeholder="Pro Stitcher Tip"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5CDBC] text-xs focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Content Text</label>
              <textarea
                rows={3}
                value={calloutContent}
                onChange={(e) => setCalloutContent(e.target.value)}
                placeholder="Always stitch all bottom half-crosses in the same diagonal direction for a uniform texture."
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5CDBC] text-xs focus:outline-none focus:ring-2 focus:ring-[#E06C38] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Button Text (Optional)</label>
                <input
                  type="text"
                  value={calloutCtaText}
                  onChange={(e) => setCalloutCtaText(e.target.value)}
                  placeholder="Try Converter"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D5CDBC] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Button Action</label>
                <select
                  value={calloutCtaAction}
                  onChange={(e) => setCalloutCtaAction(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D5CDBC] text-xs"
                >
                  <option value="converter">Open Pattern Converter</option>
                  <option value="shop">Open Kits & Supplies Shop</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCalloutModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#5A6659] hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertCallout}
                className="px-5 py-2 rounded-xl bg-[#E06C38] hover:bg-[#c95b28] text-white text-xs font-bold transition-all shadow-xs"
              >
                Insert Callout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 3: ADD FAQ BLOCK */}
      {/* ========================================================================= */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E1D2] space-y-4 animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1D231E] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#E06C38]" />
                Add FAQ Section Block
              </h4>
              <button
                type="button"
                onClick={() => setIsFaqModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {faqItems.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#FAF6EE] border border-[#E8E1D2] space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#E06C38]">Question #{idx + 1}</span>
                    {faqItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFaqItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFaqItems((prev) => prev.map((f, i) => (i === idx ? { ...f, question: val } : f)));
                    }}
                    placeholder="Enter question..."
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D5CDBC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E06C38] bg-white"
                  />
                  <textarea
                    rows={2}
                    value={item.answer}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFaqItems((prev) => prev.map((f, i) => (i === idx ? { ...f, answer: val } : f)));
                    }}
                    placeholder="Enter answer explanation..."
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D5CDBC] text-xs focus:outline-none focus:ring-2 focus:ring-[#E06C38] bg-white resize-none"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFaqItems((prev) => [...prev, { question: '', answer: '' }])}
              className="w-full py-2 rounded-xl border border-dashed border-[#D5CDBC] text-xs font-bold text-[#5A6659] hover:bg-[#FAF6EE] flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Question</span>
            </button>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E1D2]">
              <button
                type="button"
                onClick={() => setIsFaqModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#5A6659] hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertFaq}
                className="px-5 py-2 rounded-xl bg-[#E06C38] hover:bg-[#c95b28] text-white text-xs font-bold transition-all shadow-xs"
              >
                Insert FAQ Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 4: ADD CTA BANNER BLOCK */}
      {/* ========================================================================= */}
      {isCtaModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8E1D2] space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1D231E] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E06C38]" />
                Add Action CTA Banner Block
              </h4>
              <button
                type="button"
                onClick={() => setIsCtaModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Banner Heading</label>
              <input
                type="text"
                value={ctaTitle}
                onChange={(e) => setCtaTitle(e.target.value)}
                placeholder="Start Crafting Today"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5CDBC] text-xs focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Description Text</label>
              <textarea
                rows={3}
                value={ctaContent}
                onChange={(e) => setCtaContent(e.target.value)}
                placeholder="Convert your favorite photograph into a custom cross-stitch grid in minutes."
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5CDBC] text-xs focus:outline-none focus:ring-2 focus:ring-[#E06C38] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Button Label</label>
                <input
                  type="text"
                  value={ctaButtonText}
                  onChange={(e) => setCtaButtonText(e.target.value)}
                  placeholder="Launch Stitchara"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D5CDBC] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1D231E] mb-1.5">Button Target</label>
                <select
                  value={ctaButtonAction}
                  onChange={(e) => setCtaButtonAction(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D5CDBC] text-xs"
                >
                  <option value="converter">Pattern Converter Tool</option>
                  <option value="shop">Kits & Thread Shop</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCtaModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#5A6659] hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertCta}
                className="px-5 py-2 rounded-xl bg-[#E06C38] hover:bg-[#c95b28] text-white text-xs font-bold transition-all shadow-xs"
              >
                Insert CTA Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
