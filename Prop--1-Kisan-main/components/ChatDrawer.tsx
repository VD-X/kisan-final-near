import React, { useState, useEffect, useRef } from 'react';
import { Message, Offer } from '../types';
import { Button, Input, Card } from './UI'; // Assuming UI components are exported from UI.tsx or available
import { X, Send, User, MessageCircle, Clock, CheckCircle, XCircle, AlertCircle, ArrowRightLeft } from 'lucide-react'; // Assuming lucide-react is used

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  offers: Offer[];
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
  listingId?: string; // Context for the chat
  orderId?: string;   // Context for the chat
  offerId?: string;   // Context for negotiation history
  onSendMessage: (text: string, listingId?: string, orderId?: string) => void;
}

type TimelineItem = 
  | { type: 'message'; data: Message }
  | { type: 'event'; data: NonNullable<Offer['history']>[0]; id: string };

export function ChatDrawer({
  open,
  onClose,
  messages,
  offers,
  currentUserId,
  targetUserId,
  targetUserName,
  listingId,
  orderId,
  offerId,
  onSendMessage
}: ChatDrawerProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find relevant offer if offerId is provided
  const relevantOffer = offerId ? offers.find(o => o.id === offerId) : null;

  // Filter messages relevant to this conversation context
  const conversationMessages = messages.filter(m => 
    ((m.fromUserId === currentUserId && m.toUserId === targetUserId) ||
     (m.fromUserId === targetUserId && m.toUserId === currentUserId)) &&
    (listingId ? m.listingId === listingId : true) &&
    (orderId ? m.orderId === orderId : true)
  );

  // Merge messages and offer history
  const timeline: TimelineItem[] = [
    ...conversationMessages.map(m => ({ type: 'message' as const, data: m, timestamp: new Date(m.timestamp).getTime() })),
    ...(relevantOffer?.history || []).map((h, i) => ({ 
        type: 'event' as const, 
        data: h, 
        id: `hist_${i}`,
        timestamp: new Date(h.timestamp).getTime() 
    }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [timeline.length, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col animate-in slide-in-from-right-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                {targetUserName ? targetUserName.charAt(0) : '?'}
            </div>
            <div>
                <h3 className="font-bold text-slate-900">{targetUserName || 'Chat'}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                   <MessageCircle className="w-3 h-3" />
                    {listingId ? 'Negotiation Chat' : orderId ? 'Order Chat' : 'Chat'}
                </p>
            </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {timeline.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
                No messages yet. Start the conversation!
            </div>
        ) : (
            timeline.map((item) => {
                if (item.type === 'message') {
                    const m = item.data;
                    const isMe = m.fromUserId === currentUserId;
                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                                isMe 
                                ? 'bg-blue-600 text-white rounded-tr-none shadow-md' 
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                            }`}>
                                <p>{m.text}</p>
                                <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                } else {
                    const h = item.data;
                    return (
                        <div key={item.id} className="flex justify-center my-4">
                            <div className="bg-slate-100 border border-slate-200 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm">
                                {h.action === 'offer' && <Clock className="w-3 h-3 text-blue-500" />}
                                {h.action === 'counter' && <ArrowRightLeft className="w-3 h-3 text-amber-500" />}
                                {h.action === 'accept' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                {h.action === 'reject' && <XCircle className="w-3 h-3 text-red-500" />}
                                
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    {h.role === 'buyer' ? 'Buyer' : 'Farmer'} {h.action === 'offer' ? 'Offered' : h.action}ed:
                                </span>
                                <span className="text-xs font-black text-slate-800">
                                    ₹{h.price}/{h.quantity}kg
                                </span>
                            </div>
                        </div>
                    );
                }
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <form 
            onSubmit={(e) => {
                e.preventDefault();
                if (newMessage.trim()) {
                    onSendMessage(newMessage, listingId, orderId);
                    setNewMessage('');
                }
            }}
            className="flex gap-2"
        >
            <input 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
            />
            <button 
                type="submit" 
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-600/20"
                disabled={!newMessage.trim()}
            >
                <Send className="w-4 h-4" />
            </button>
        </form>
      </div>
    </div>
  );
}
