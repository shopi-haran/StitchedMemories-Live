import { BlogPostSection } from '../types';

/**
 * Converts a title into an SEO-friendly URL slug.
 */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Estimates reading time based on total word count across text and excerpt.
 */
export function calculateReadTime(text: string, excerpt?: string): string {
  const combined = `${excerpt || ''} ${text || ''}`;
  const words = combined.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

/**
 * Parses markdown-style text area content into BlogPostSection[] array.
 * Supported conventions:
 * - Line starting with "## " = heading2
 * - Line starting with "### " = heading3
 * - Lines starting with "- " or "* " = list items (grouped until non-list line)
 * - Blank line between text = separate paragraphs
 * - **bold** stays inside text
 * - Special block markers:
 *     <!--BLOCK:IMAGE {"imageUrl":"...", "imageCaption":"..."}--> or ![caption](imageUrl)
 *     <!--BLOCK:CALLOUT {"title":"...", "content":"...", "ctaText":"...", "ctaAction":"..."}-->
 *     <!--BLOCK:FAQ {"faqs":[{"question":"...", "answer":"..."}]}-->
 *     <!--BLOCK:CTA {"title":"...", "content":"...", "ctaText":"...", "ctaAction":"..."}-->
 *     :::image {...}::: etc.
 */
export function parseContentToSections(rawText: string): BlogPostSection[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const sections: BlogPostSection[] = [];
  const lines = rawText.split('\n');

  let currentParagraphLines: string[] = [];
  let currentListItems: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const content = currentParagraphLines.join('\n').trim();
      if (content) {
        sections.push({
          type: 'paragraph',
          content,
        });
      }
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentListItems.length > 0) {
      sections.push({
        type: 'list',
        items: [...currentListItems],
      });
      currentListItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Check for special embedded block comment <!--BLOCK:TYPE JSON-->
    const blockMatch = line.match(/^<!--BLOCK:(\w+)\s*([\s\S]*?)-->$/);
    if (blockMatch) {
      flushParagraph();
      flushList();
      const blockType = blockMatch[1].toLowerCase();
      const jsonPayload = blockMatch[2].trim();
      try {
        const parsed = JSON.parse(jsonPayload);
        if (blockType === 'image') {
          sections.push({
            type: 'image',
            imageUrl: parsed.imageUrl || '',
            imageCaption: parsed.imageCaption || '',
          });
        } else if (blockType === 'callout') {
          sections.push({
            type: 'callout',
            title: parsed.title || 'Studio Note',
            content: parsed.content || '',
            ctaText: parsed.ctaText || undefined,
            ctaAction: parsed.ctaAction || 'converter',
          });
        } else if (blockType === 'faq') {
          sections.push({
            type: 'faq',
            faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
          });
        } else if (blockType === 'cta') {
          sections.push({
            type: 'cta',
            title: parsed.title || 'Start Crafting',
            content: parsed.content || '',
            ctaText: parsed.ctaText || 'Launch Stitchly',
            ctaAction: parsed.ctaAction || 'converter',
          });
        } else {
          sections.push({
            type: blockType,
            ...parsed,
          });
        }
      } catch (e) {
        console.warn('Failed to parse block JSON:', jsonPayload, e);
      }
      continue;
    }

    // Check for :::blockType {...}::: alternate marker
    const tripleColMatch = line.match(/^:::(\w+)\s*([\s\S]*?):::$/);
    if (tripleColMatch) {
      flushParagraph();
      flushList();
      const blockType = tripleColMatch[1].toLowerCase();
      try {
        const parsed = JSON.parse(tripleColMatch[2].trim());
        sections.push({
          type: blockType,
          ...parsed,
        });
      } catch (e) {
        console.warn('Failed to parse :::block JSON:', tripleColMatch[2], e);
      }
      continue;
    }

    // Check for markdown image format: ![Caption](imageUrl)
    const mdImageMatch = line.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+|data:[^\s)]+|blob:[^\s)]+)\)$/);
    if (mdImageMatch) {
      flushParagraph();
      flushList();
      sections.push({
        type: 'image',
        imageCaption: mdImageMatch[1].trim() || undefined,
        imageUrl: mdImageMatch[2].trim(),
      });
      continue;
    }

    // Check for Heading 2 (## Heading)
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      flushParagraph();
      flushList();
      sections.push({
        type: 'heading2',
        title: line.replace(/^##\s+/, '').trim(),
      });
      continue;
    }

    // Check for Heading 3 (### Heading)
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      sections.push({
        type: 'heading3',
        title: line.replace(/^###\s+/, '').trim(),
      });
      continue;
    }

    // Check for List item (- item or * item)
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const itemText = line.replace(/^[-*]\s+/, '').trim();
      if (itemText) {
        currentListItems.push(itemText);
      }
      continue;
    }

    // If blank line -> finish current paragraph or list
    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }

    // Normal paragraph text line
    flushList();
    currentParagraphLines.push(rawLine);
  }

  flushParagraph();
  flushList();

  return sections;
}

/**
 * Serializes BlogPostSection[] array back into editable text area markdown.
 */
export function serializeSectionsToText(sections?: BlogPostSection[]): string {
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return '';
  }

  const parts: string[] = [];

  for (const s of sections) {
    if (s.type === 'heading2') {
      parts.push(`## ${s.title || ''}`);
    } else if (s.type === 'heading3') {
      parts.push(`### ${s.title || ''}`);
    } else if (s.type === 'list' || s.type === 'bulletList') {
      if (s.items && s.items.length > 0) {
        parts.push(s.items.map((it) => `- ${it}`).join('\n'));
      }
    } else if (s.type === 'image') {
      parts.push(
        `<!--BLOCK:IMAGE ${JSON.stringify({
          imageUrl: s.imageUrl || '',
          imageCaption: s.imageCaption || '',
        })}-->`
      );
    } else if (s.type === 'callout') {
      parts.push(
        `<!--BLOCK:CALLOUT ${JSON.stringify({
          title: s.title || '',
          content: s.content || '',
          ctaText: s.ctaText || '',
          ctaAction: s.ctaAction || 'converter',
        })}-->`
      );
    } else if (s.type === 'faq') {
      parts.push(
        `<!--BLOCK:FAQ ${JSON.stringify({
          faqs: s.faqs || [],
        })}-->`
      );
    } else if (s.type === 'cta') {
      parts.push(
        `<!--BLOCK:CTA ${JSON.stringify({
          title: s.title || '',
          content: s.content || '',
          ctaText: s.ctaText || '',
          ctaAction: s.ctaAction || 'converter',
        })}-->`
      );
    } else if (s.type === 'paragraph') {
      parts.push(s.content || s.text || '');
    } else {
      // Fallback generic block
      parts.push(`<!--BLOCK:${(s.type || 'PARAGRAPH').toUpperCase()} ${JSON.stringify(s)}-->`);
    }
  }

  return parts.join('\n\n');
}
