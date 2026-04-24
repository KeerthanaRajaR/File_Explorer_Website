"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, File, AlertTriangle, MessageSquare, Plus } from 'lucide-react';
import { ActionPayload } from '@/types/ai';

const CHAT_STORAGE_KEY = 'file-explorer-ai-chat-v1';
const CHAT_ARCHIVE_STORAGE_KEY = 'file-explorer-ai-chat-archive-v1';
const CHAT_RUN_IDS_STORAGE_KEY = 'file-explorer-ai-chat-run-ids-v1';
const MAX_PERSISTED_MESSAGES = 150;
const MAX_ARCHIVED_CHATS = 20;
const CHAT_HISTORY_API = '/api/ai/history';

interface AiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string, highlight?: string) => void;
  onRefresh: () => void;
  currentPath: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  runId?: string;
  files?: Array<{ name: string; path: string }>;
  action?: ActionPayload & { confirmed?: boolean };
}

interface ArchivedChat {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messages: Message[];
}

const isValidMessage = (item: unknown): item is Message => {
  if (!item || typeof item !== 'object') return false;
  const msg = item as Partial<Message>;
  return typeof msg.id === 'string' && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string';
};

const isValidArchivedChat = (item: unknown): item is ArchivedChat => {
  if (!item || typeof item !== 'object') return false;
  const chat = item as Partial<ArchivedChat>;
  return (
    typeof chat.id === 'string' &&
    typeof chat.title === 'string' &&
    typeof chat.preview === 'string' &&
    typeof chat.updatedAt === 'string' &&
    Array.isArray(chat.messages) &&
    chat.messages.every(isValidMessage)
  );
};

const toChatTitle = (messages: Message[]): string => {
  const seed = messages.find((m) => m.role === 'user')?.content?.trim() || 'Chat';
  return seed.length > 28 ? `${seed.slice(0, 28)}…` : seed;
};

const toChatPreview = (messages: Message[]): string => {
  const seed = messages[messages.length - 1]?.content?.trim() || 'No messages';
  return seed.length > 56 ? `${seed.slice(0, 56)}…` : seed;
};

const toParentPath = (targetPath: string): string => {
  const lastSlash = targetPath.lastIndexOf('/');
  return lastSlash > 0 ? targetPath.slice(0, lastSlash) : '/';
};

const toName = (targetPath: string): string => {
  const lastSlash = targetPath.lastIndexOf('/');
  return targetPath.slice(lastSlash + 1);
};

const getPreviewPageUrl = (targetPath: string): string => {
  const encoded = encodeURIComponent(targetPath);
  return `/preview?path=${encoded}&t=${Date.now()}`;
};

const getDownloadUrl = (targetPath: string): string => {
  const encoded = encodeURIComponent(targetPath);
  return `/api/download?path=${encoded}&t=${Date.now()}`;
};

export function AiPanel({ isOpen, onClose, onNavigate, onRefresh, currentPath }: AiPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);
  const [activeArchiveId, setActiveArchiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        let localMessages: Message[] = [];
        let localArchived: ArchivedChat[] = [];
        const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            localMessages = parsed.filter(isValidMessage).slice(-MAX_PERSISTED_MESSAGES);
          }
        }

        const archivedRaw = window.localStorage.getItem(CHAT_ARCHIVE_STORAGE_KEY);
        if (archivedRaw) {
          const parsed = JSON.parse(archivedRaw) as unknown;
          if (Array.isArray(parsed)) {
            localArchived = parsed.filter(isValidArchivedChat).slice(0, MAX_ARCHIVED_CHATS);
          }
        }

        const response = await fetch(CHAT_HISTORY_API, { method: 'GET' });
        const payload = await response.json() as { success?: boolean; data?: unknown };
        const serverMessages = Array.isArray(payload?.data)
          ? (payload.data as unknown[]).filter(isValidMessage).slice(-MAX_PERSISTED_MESSAGES)
          : [];

        const chosen = serverMessages.length > 0 ? serverMessages : localMessages;
        if (mounted && chosen.length > 0) {
          setMessages(chosen);
        }
        if (mounted && localArchived.length > 0) {
          setArchivedChats(localArchived);
        } else if (mounted && chosen.length > 0) {
          setArchivedChats([
            {
              id: `seed-${Date.now()}`,
              title: toChatTitle(chosen),
              preview: toChatPreview(chosen),
              updatedAt: new Date().toISOString(),
              messages: chosen,
            },
          ]);
        }
      } catch {
        // ignore hydration failures and continue with empty chat
      } finally {
        if (mounted) setIsHydrated(true);
      }
    };

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const compact = messages.slice(-MAX_PERSISTED_MESSAGES);

    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(compact));
      window.localStorage.setItem(CHAT_ARCHIVE_STORAGE_KEY, JSON.stringify(archivedChats.slice(0, MAX_ARCHIVED_CHATS)));
    } catch {
      // ignore storage quota / serialization errors
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      fetch(CHAT_HISTORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: compact }),
      }).catch(() => {
        // ignore save failures
      });
    }, 250);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [messages, archivedChats, isHydrated]);

  const appendRunId = (runId?: string) => {
    if (!runId) return;

    try {
      const raw = window.localStorage.getItem(CHAT_RUN_IDS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const ids = Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];

      if (!ids.includes(runId)) {
        ids.push(runId);
        window.localStorage.setItem(CHAT_RUN_IDS_STORAGE_KEY, JSON.stringify(ids));
      }
    } catch {
      // ignore localStorage failures
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!activeArchiveId) return;

    setArchivedChats((prev) => prev.map((chat) => {
      if (chat.id !== activeArchiveId) return chat;
      return {
        ...chat,
        title: toChatTitle(messages),
        preview: toChatPreview(messages),
        updatedAt: new Date().toISOString(),
        messages: messages.slice(-MAX_PERSISTED_MESSAGES),
      };
    }));
  }, [messages, activeArchiveId]);

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const textToSend = overrideText || input.trim();
    if (!textToSend || loading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    if (!overrideText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend, currentPath })
      });
      const data = await res.json();
      const runId =
        typeof data?.run_id === 'string'
          ? data.run_id
          : typeof data?.runId === 'string'
            ? data.runId
            : typeof data?.data?.run_id === 'string'
              ? data.data.run_id
              : undefined;
            appendRunId(runId);
      
      if (data.success) {
        const results = data.data || [];
        const summary = data.summary || '';
        const action = data.action as (ActionPayload | undefined);
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: summary || (results.length > 0 
            ? `I found ${results.length} file(s) matching your search:` 
            : `I couldn't find any files matching "${textToSend}".`),
          runId,
          files: results.map((r: { name: string; path: string }) => ({ name: r.name, path: r.path })),
          action: action ? { ...action, confirmed: action.requiresConfirmation ? false : true } : undefined,
        }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${data.error || 'Search failed'}`, runId }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Network failed.' }]);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (actionType: ActionPayload['type']): string => {
    switch (actionType) {
      case 'delete_files':
        return 'delete';
      case 'move_files':
        return 'move';
      case 'rename_file':
        return 'rename';
      case 'create_folder':
        return 'create';
      case 'create_file':
        return 'create';
      case 'edit_file_content':
        return 'update';
      default:
        return 'execute';
    }
  };

  const getConfirmationText = (action: ActionPayload): string => {
    const count = action.targets.length;

    switch (action.type) {
      case 'delete_files':
        return `Are you sure you want to delete ${count} file(s)?`;
      case 'move_files':
        return `Are you sure you want to move ${count} file(s) to ${action.destination}?`;
      case 'rename_file':
        return `Are you sure you want to rename this file to ${action.newName}?`;
      case 'create_folder':
        return `Are you sure you want to create folder ${action.targets[0]}?`;
      case 'create_file':
        return `Are you sure you want to create file ${action.targets[0]}?`;
      case 'edit_file_content':
        return `Are you sure you want to overwrite content in ${action.targets[0]}?`;
      default:
        return 'Are you sure you want to execute this action?';
    }
  };

  const openActionTarget = (action: ActionPayload) => {
    const target = action.targets[0];
    if (!target) return;

    if (action.type === 'download_file') {
      window.open(getDownloadUrl(target), '_blank', 'noopener,noreferrer');
      return;
    }

    if (action.type === 'preview_image' || action.type === 'view_file') {
      window.open(getPreviewPageUrl(target), '_blank', 'noopener,noreferrer');
      return;
    }
  };

  const executeAction = async (msgId: string, actionTarget: ActionPayload) => {
      setLoading(true);

      try {
        const payload: ActionPayload = {
          type: actionTarget.type,
          targets: actionTarget.targets,
          destination: actionTarget.destination,
          newName: actionTarget.newName,
          fileContent: actionTarget.fileContent,
          replaceFrom: actionTarget.replaceFrom,
          replaceTo: actionTarget.replaceTo,
          requiresConfirmation: false,
        };

        const res = await fetch('/api/ai/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: payload }),
        });

        const data = await res.json();
        const runId =
          typeof data?.run_id === 'string'
            ? data.run_id
            : typeof data?.runId === 'string'
              ? data.runId
              : typeof data?.data?.run_id === 'string'
                ? data.data.run_id
                : undefined;
              appendRunId(runId);

        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, action: { ...m.action!, confirmed: true } } : m));

        if (res.ok && data.success && data.data?.success) {
          onRefresh();

          if (payload.type === 'create_folder' && payload.targets[0]) {
            const createdPath = payload.targets[0];
            onNavigate(toParentPath(createdPath), toName(createdPath));
          }

          if (payload.type === 'create_file' && payload.targets[0]) {
            const createdPath = payload.targets[0];
            onNavigate(toParentPath(createdPath), toName(createdPath));
          }

          if ((payload.type === 'rename_file' || payload.type === 'move_files' || payload.type === 'edit_file_content') && payload.targets[0]) {
            onNavigate(toParentPath(payload.targets[0]), toName(payload.targets[0]));
          }

          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Action completed successfully.', runId }]);
          return;
        }

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Action failed: ${data.error || data.data?.error || 'FAILED_TO_EXECUTE_ACTION'}`,
          runId,
        }]);
      } catch {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Action failed: Network failed.',
        }]);
      } finally {
        setLoading(false);
      }
  };

  const clearConversation = () => {
    const compact = messages.slice(-MAX_PERSISTED_MESSAGES);
    if (compact.length > 0) {
      const archiveId = activeArchiveId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nextArchive: ArchivedChat = {
        id: archiveId,
        title: toChatTitle(compact),
        preview: toChatPreview(compact),
        updatedAt: new Date().toISOString(),
        messages: compact,
      };

      setArchivedChats((prev) => {
        const without = prev.filter((chat) => chat.id !== archiveId);
        return [nextArchive, ...without].slice(0, MAX_ARCHIVED_CHATS);
      });
    }

    setActiveArchiveId(null);
    setMessages([]);
    setInput('');

    try {
      window.localStorage.removeItem(CHAT_RUN_IDS_STORAGE_KEY);
    } catch {
      // ignore localStorage failures
    }
  };

  const userHistory = archivedChats;

  const jumpToMessage = (msgId: string) => {
    const node = messageRefs.current[msgId];
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const openArchivedChat = (chatId: string) => {
    const selected = archivedChats.find((chat) => chat.id === chatId);
    if (!selected) return;

    setActiveArchiveId(chatId);
    setMessages(selected.messages.slice(-MAX_PERSISTED_MESSAGES));
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="w-full md:w-[38rem] bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 flex flex-col h-full shadow-lg z-30 transition-transform duration-300">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-900/10">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Bot size={20} className="text-purple-500" /> AI Assistant
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors">
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside className="w-56 border-r border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40 flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={clearConversation}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors"
            >
              <Plus size={14} /> New chat
            </button>
          </div>
          <div className="p-2 overflow-y-auto space-y-1">
            {userHistory.length === 0 ? (
              <div className="px-2 py-3 text-[11px] text-gray-500 dark:text-gray-400">No previous chats</div>
            ) : (
              userHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => openArchivedChat(chat.id)}
                  className={`w-full text-left p-2 rounded-lg border transition-colors ${
                    chat.id === activeArchiveId
                      ? 'border-purple-300 bg-white dark:bg-gray-800/80'
                      : 'border-transparent hover:border-purple-300 hover:bg-white dark:hover:bg-gray-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={13} className="text-purple-500" />
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 truncate">{chat.title || 'Message'}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{chat.preview}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 space-y-3 opacity-70">
                <Bot size={48} className="text-gray-300 dark:text-gray-600" />
                <p>Ask me anything about your files!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  ref={(node) => {
                    messageRefs.current[msg.id] = node;
                  }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 ${
                      msg.role === 'user'
                        ? 'bg-purple-500 text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {msg.files && msg.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.files.map(f => (
                          <div key={f.path} className="w-full flex items-center justify-between p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-400 transition-colors">
                            <button
                              onClick={() => {
                                const folderPath = f.path.substring(0, f.path.lastIndexOf('/')) || '/';
                                onNavigate(folderPath, f.name);
                              }}
                              className="flex flex-1 items-center gap-2 text-left"
                            >
                              <File size={16} className="text-purple-400 shrink-0" />
                              <div className="flex flex-col overflow-hidden">
                                <span className="truncate font-medium text-xs text-gray-700 dark:text-gray-300">{f.name}</span>
                                <span className="truncate text-[10px] text-gray-400">{f.path}</span>
                              </div>
                            </button>
                            <button
                              onClick={() => handleSend(undefined, `summarize file ${f.name}`)}
                              className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors font-medium break-keep whitespace-nowrap"
                            >
                              AI Summary
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.action && msg.action.requiresConfirmation && !msg.action.confirmed && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium mb-2">
                          <AlertTriangle size={16} /> Action Required
                        </div>
                        <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                          {getConfirmationText(msg.action)}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => msg.action && executeAction(msg.id, msg.action)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1.5 rounded transition-colors text-xs font-semibold">Confirm {getActionLabel(msg.action.type)}</button>
                          <button onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, action: { ...m.action!, confirmed: true }, content: m.content + '\n\n[Action Cancelled]' } : m))} className="flex-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 py-1.5 rounded transition-colors text-xs font-semibold">Cancel</button>
                        </div>
                      </div>
                    )}

                    {msg.action && !msg.action.requiresConfirmation && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                        <div className="text-xs text-blue-700 dark:text-blue-300 mb-2">Quick action</div>
                        <button
                          onClick={() => msg.action && openActionTarget(msg.action)}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded transition-colors text-xs font-semibold"
                        >
                          {msg.action.type === 'download_file' ? 'Download File' : msg.action.type === 'preview_image' ? 'Preview Image' : 'Open File'}
                        </button>
                      </div>
                    )}

                    {msg.role === 'assistant' ? (
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            const target = msg.runId
                              ? `/agent-runs/${encodeURIComponent(msg.runId)}`
                              : '/agent-runs';
                            window.open(target, '_blank', 'noopener,noreferrer');
                          }}
                          className="text-xs rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2.5 py-1.5 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
                        >
                          View Execution
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 rounded-bl-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <form className="relative flex items-center" onSubmit={handleSend}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 shadow-sm"
                placeholder="Search or ask for actions..."
                disabled={loading}
              />
              <button type="submit" className="absolute right-2 p-1.5 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-md transition-colors disabled:opacity-50" disabled={!input.trim() || loading}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
