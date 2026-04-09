"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, File, AlertTriangle } from 'lucide-react';
import { ActionPayload } from '@/types/ai';

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
  files?: Array<{ name: string; path: string }>;
  action?: ActionPayload & { confirmed?: boolean };
}

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
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
          files: results.map((r: { name: string; path: string }) => ({ name: r.name, path: r.path })),
          action: action ? { ...action, confirmed: action.requiresConfirmation ? false : true } : undefined,
        }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${data.error || 'Search failed'}` }]);
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

          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Action completed successfully.' }]);
          return;
        }

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Action failed: ${data.error || data.data?.error || 'FAILED_TO_EXECUTE_ACTION'}`,
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

  if (!isOpen) return null;

  return (
    <div className="w-80 md:w-96 bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 flex flex-col h-full shadow-lg z-30 transition-transform duration-300">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-900/10">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Bot size={20} className="text-purple-500" /> AI Assistant
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors">
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 space-y-3 opacity-70">
             <Bot size={48} className="text-gray-300 dark:text-gray-600" />
             <p>Ask me anything about your files!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] rounded-2xl p-3 ${
                  msg.role === 'user' 
                    ? 'bg-purple-500 text-white rounded-br-sm' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-200 dark:border-gray-700'
               }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* File Result Rendering */}
                  {msg.files && msg.files.length > 0 && (
                     <div className="mt-3 space-y-2">
                        {msg.files.map(f => (
                           <div key={f.path} className="w-full flex items-center justify-between p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-400 transition-colors">
                              <button 
                                onClick={() => {
                                  // Find parent folder path to navigate to
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

                  {/* Smart Actions / Confirmation Dialog */}
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
  );
}
