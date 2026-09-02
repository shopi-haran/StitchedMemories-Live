import React, { useState, useMemo } from 'react';
import {
  Mail,
  MailOpen,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  User,
  ChevronRight,
  Reply,
  Check,
  AlertCircle,
  Inbox
} from 'lucide-react';
import { ContactMessage, ContactMessageStatus } from '../../types';

interface MessagesTabProps {
  messages: ContactMessage[];
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (id: string, status: ContactMessageStatus) => Promise<{ success: boolean; error?: any }>;
  onDeleteMessage: (id: string) => Promise<{ success: boolean; error?: any }>;
  showToast: (msg: string) => void;
}

export const MessagesTab: React.FC<MessagesTabProps> = ({
  messages,
  isLoading,
  onRefresh,
  onUpdateStatus,
  onDeleteMessage,
  showToast,
}) => {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'read' | 'replied'>('all');
  const [filterInquiryType, setFilterInquiryType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status counts
  const newCount = useMemo(() => messages.filter((m) => m.status === 'new').length, [messages]);
  const readCount = useMemo(() => messages.filter((m) => m.status === 'read').length, [messages]);
  const repliedCount = useMemo(() => messages.filter((m) => m.status === 'replied').length, [messages]);

  // Unique inquiry types for filtering
  const inquiryTypes = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => {
      if (m.inquiry_type) set.add(m.inquiry_type);
    });
    return Array.from(set);
  }, [messages]);

  // Filtered list
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      // Status filter
      if (filterStatus !== 'all' && m.status !== filterStatus) return false;

      // Inquiry type filter
      if (filterInquiryType !== 'all' && m.inquiry_type !== filterInquiryType) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (m.name || '').toLowerCase().includes(q);
        const matchesEmail = (m.email || '').toLowerCase().includes(q);
        const matchesSubject = (m.subject || '').toLowerCase().includes(q);
        const matchesMessage = (m.message || '').toLowerCase().includes(q);
        const matchesInquiry = (m.inquiry_type || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesSubject || matchesMessage || matchesInquiry;
      }

      return true;
    });
  }, [messages, filterStatus, filterInquiryType, searchQuery]);

  // Selected message
  const selectedMessage = useMemo(() => {
    if (!selectedMessageId) {
      // Default to first message if on desktop and none selected
      return filteredMessages.length > 0 ? filteredMessages[0] : null;
    }
    return messages.find((m) => m.id === selectedMessageId) || null;
  }, [messages, selectedMessageId, filteredMessages]);

  // Handle clicking a message to view details and automatically mark as read if new
  const handleSelectMessage = async (msg: ContactMessage) => {
    setSelectedMessageId(msg.id);
    if (msg.status === 'new') {
      try {
        await onUpdateStatus(msg.id, 'read');
      } catch (err) {
        console.error('Error auto-marking message as read:', err);
      }
    }
  };

  // Mark status action
  const handleSetStatus = async (id: string, status: ContactMessageStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await onUpdateStatus(id, status);
      if (res.success) {
        showToast(
          status === 'replied'
            ? 'Message marked as Replied'
            : status === 'read'
            ? 'Message marked as Read'
            : 'Message marked as New'
        );
      } else {
        alert('Failed to update status: ' + (res.error?.message || 'Unknown error'));
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete message action
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact message? This cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await onDeleteMessage(id);
      if (res.success) {
        showToast('Message deleted');
        if (selectedMessageId === id) {
          setSelectedMessageId(null);
        }
      } else {
        alert('Failed to delete message: ' + (res.error?.message || 'Unknown error'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E06C38]/15 text-[#E06C38] border border-[#E06C38]/30 animate-pulse">
            <Sparkles className="w-3 h-3 text-[#E06C38]" /> New
          </span>
        );
      case 'read':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <MailOpen className="w-3 h-3 text-blue-600" /> Read
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Replied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Recent';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8E1D2] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#1D231E]">Contact Messages & Inquiries</h2>
            {newCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E06C38] text-white">
                {newCount} New
              </span>
            )}
          </div>
          <p className="text-xs text-[#5A6659]">
            Inquiries submitted via the website contact form, stored in Supabase with automated email dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#FAF6EE] text-[#1D231E] hover:bg-[#F0EAE0] border border-[#E8E1D2] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E06C38]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-[#E8E1D2] shadow-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-[#1D231E] text-white shadow-xs'
                : 'text-[#5A6659] hover:bg-[#FAF6EE]'
            }`}
          >
            All Messages ({messages.length})
          </button>
          <button
            onClick={() => setFilterStatus('new')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterStatus === 'new'
                ? 'bg-[#E06C38] text-white shadow-xs'
                : 'text-[#5A6659] hover:bg-[#FAF6EE]'
            }`}
          >
            <span>New</span>
            {newCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'new' ? 'bg-white/25 text-white' : 'bg-[#E06C38]/15 text-[#E06C38]'}`}>
                {newCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterStatus('read')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'read'
                ? 'bg-[#1D231E] text-white shadow-xs'
                : 'text-[#5A6659] hover:bg-[#FAF6EE]'
            }`}
          >
            Read ({readCount})
          </button>
          <button
            onClick={() => setFilterStatus('replied')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'replied'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-[#5A6659] hover:bg-[#FAF6EE]'
            }`}
          >
            Replied ({repliedCount})
          </button>
        </div>

        {/* Search & Topic Filter */}
        <div className="flex flex-1 sm:flex-initial items-center gap-2">
          {inquiryTypes.length > 0 && (
            <select
              value={filterInquiryType}
              onChange={(e) => setFilterInquiryType(e.target.value)}
              className="px-3 py-2 bg-white border border-[#E8E1D2] rounded-xl text-xs font-medium text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
            >
              <option value="all">All Topics</option>
              {inquiryTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6659]" />
            <input
              type="text"
              placeholder="Search sender, email, topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E8E1D2] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
            />
          </div>
        </div>
      </div>

      {/* Main 2-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Messages List (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="bg-white border border-[#E8E1D2] rounded-2xl p-10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#FAF6EE] text-[#5A6659] flex items-center justify-center mx-auto">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#1D231E]">No messages found</h4>
              <p className="text-xs text-[#5A6659] max-w-xs mx-auto">
                {searchQuery || filterStatus !== 'all' || filterInquiryType !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'New messages submitted through the contact form will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isNew = msg.status === 'new';

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative text-left ${
                      isSelected
                        ? 'bg-white border-[#E06C38] shadow-md ring-1 ring-[#E06C38]'
                        : isNew
                        ? 'bg-[#FFF9F5] border-[#F2C4B2] hover:border-[#E06C38] shadow-xs'
                        : 'bg-white border-[#E8E1D2] hover:border-[#C5BCAB] shadow-xs'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {isNew && (
                      <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[#E06C38] ring-4 ring-[#E06C38]/20" />
                    )}

                    <div className="flex items-center justify-between gap-2 mb-1.5 pr-4">
                      <h4 className={`text-sm font-bold truncate ${isNew ? 'text-[#1D231E]' : 'text-[#2D382E]'}`}>
                        {msg.name}
                      </h4>
                      <span className="text-[11px] text-[#7A8679] shrink-0">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-[#5A6659] truncate">{msg.email}</span>
                      <span className="text-xs text-[#C5BCAB]">•</span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#FAF6EE] text-[#4A5549] border border-[#E8E1D2] truncate">
                        {msg.inquiry_type}
                      </span>
                    </div>

                    {msg.subject && (
                      <p className="text-xs font-semibold text-[#1D231E] truncate mb-1">
                        {msg.subject}
                      </p>
                    )}

                    <p className="text-xs text-[#6A7869] line-clamp-2 leading-relaxed">
                      {msg.message}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-[#F0EAE0] flex items-center justify-between">
                      <div>{renderStatusBadge(msg.status)}</div>
                      <div className="flex items-center gap-1 text-[11px] text-[#E06C38] font-semibold">
                        <span>View Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Message Detail View (7 cols on lg) */}
        <div className="lg:col-span-7">
          {selectedMessage ? (
            <div className="bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              {/* Message Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#E8E1D2]">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {renderStatusBadge(selectedMessage.status)}
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF6EE] text-[#3D5239] border border-[#E8E1D2]">
                      Topic: {selectedMessage.inquiry_type}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1D231E]">
                    {selectedMessage.subject || selectedMessage.inquiry_type || 'Message Inquiry'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5A6659]">
                    <span className="flex items-center gap-1 font-medium text-[#1D231E]">
                      <User className="w-3.5 h-3.5 text-[#E06C38]" />
                      {selectedMessage.name}
                    </span>
                    <span>•</span>
                    <a
                      href={`mailto:${selectedMessage.email}`}
                      className="text-[#E06C38] hover:underline font-semibold"
                    >
                      {selectedMessage.email}
                    </a>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#7A8679]">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(selectedMessage.created_at)}
                    </span>
                  </div>
                </div>

                {/* Quick Action: Mailto direct reply */}
                <a
                  href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(
                    `Re: ${selectedMessage.subject || selectedMessage.inquiry_type || 'Your Inquiry to Stitched Memories'}`
                  )}&body=${encodeURIComponent(
                    `Hi ${selectedMessage.name},\n\nThank you for reaching out to Stitched Memories.\n\nRegarding your message:\n"${selectedMessage.message}"\n\n---\nBest regards,\nThe Stitched Memories Team\nstitchedmemoriies@gmail.com\n+94 076 996 5252`
                  )}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Reply via Email</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>

              {/* Message Content Body */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A8679]">
                  Message Content
                </h4>
                <div className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#E8E1D2] text-sm text-[#1D231E] whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </div>
              </div>

              {/* Status Management & Admin Tools */}
              <div className="pt-4 border-t border-[#E8E1D2] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#5A6659]">Update Status:</span>

                  {selectedMessage.status !== 'replied' ? (
                    <button
                      onClick={() => handleSetStatus(selectedMessage.id, 'replied')}
                      disabled={isUpdatingStatus}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Mark as Replied</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSetStatus(selectedMessage.id, 'read')}
                      disabled={isUpdatingStatus}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span>Mark as Read</span>
                    </button>
                  )}

                  {selectedMessage.status !== 'new' && (
                    <button
                      onClick={() => handleSetStatus(selectedMessage.id, 'new')}
                      disabled={isUpdatingStatus}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF6EE] hover:bg-[#F0EAE0] text-[#1D231E] border border-[#E8E1D2] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span>Mark as Unread (New)</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(selectedMessage.id)}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E8E1D2] rounded-3xl p-12 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-[#FAF6EE] text-[#5A6659] flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#1D231E]">Select a message to view details</h3>
              <p className="text-xs text-[#5A6659] max-w-xs mx-auto">
                Choose an inquiry from the list on the left to read the full message and respond to the customer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
