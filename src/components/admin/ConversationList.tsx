
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface Conversation {
  sender_id: string;
  last_message: string;
  created_at: string;
}

interface ConversationListProps {
  onSelectUser: (userId: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ onSelectUser }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id, content, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      setConversations(data || []);
    };

    fetchConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as Conversation;
          setConversations(prev => {
            const existing = prev.find(c => c.sender_id === newMessage.sender_id);
            if (!existing) {
              return [...prev, newMessage];
            }
            return prev.map(c => 
              c.sender_id === newMessage.sender_id ? newMessage : c
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Messages</h2>
      </div>
      {conversations.map((conversation) => (
        <div
          key={conversation.sender_id}
          className="p-4 border-b border-gray-800 hover:bg-gray-900 cursor-pointer"
          onClick={() => onSelectUser(conversation.sender_id)}
        >
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarFallback>
                {conversation.sender_id.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                User {conversation.sender_id.slice(0, 8)}
              </p>
              <p className="text-sm text-gray-400 truncate">
                {conversation.last_message}
              </p>
            </div>
            <div className="text-xs text-gray-500">
              {format(new Date(conversation.created_at), 'MMM d, h:mm a')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationList;
