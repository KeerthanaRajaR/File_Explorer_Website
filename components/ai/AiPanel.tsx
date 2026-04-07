"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, File, AlertTriangle } from 'lucide-react';

interface AiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string, highlight?: string) => void;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: Array<{ name: string; path: string }>;
  action?: { type: string; targets: string[]; confirmed?: boolean };
}

export function AiPanel({ isOpen, onClose, onNavigate }: AiPanelProps) {
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
        body: JSON.stringify({ query: textToSend })
      });
      const data = await res.json();
      
      if (data.success) {
        const results = data.data || [];
        const summary = data.summary || '';
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: summary || (results.length > 0 
            ? `I found ${results.length} file(s) matching your search:` 
            : `I couldn't find any files matching "${textToSend}".`),
          files: results.map((r: any) => ({ name: r.name, path: r.path }))
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

  const executeAction = async (msgId: string, actionTarget: any) => {
      // In a real setup, hits /api/ai/actions
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, action: { ...m.action!, confirmed: true } } : m));
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Action executed successfully!` }]);
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
                  {msg.action && !msg.action.confirmed && (
                     <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium mb-2">
                           <AlertTriangle size={16} /> Action Required
                        </div>
                        <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                           Are you sure you want to {msg.action.type} {msg.action.targets.length} item(s)?
                        </p>
                        <div className="flex gap-2">
                           <button onClick={() => executeAction(msg.id, msg.action)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1.5 rounded transition-colors text-xs font-semibold">Confirm</button>
                           <button onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, action: { ...m.action!, confirmed: true }, content: m.content + '\n\n[Action Cancelled]' } : m))} className="flex-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 py-1.5 rounded transition-colors text-xs font-semibold">Cancel</button>
                        </div>
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
