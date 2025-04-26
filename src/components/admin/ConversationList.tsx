
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      
      // Get the most recent message from each unique sender
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id, content, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        setLoading(false);
        return;
      }

      // Process the data to get unique conversations by sender_id
      const uniqueConversations: Conversation[] = [];
      const processedSenders = new Set();

      data?.forEach((message) => {
        if (!processedSenders.has(message.sender_id)) {
          uniqueConversations.push({
            sender_id: message.sender_id,
            last_message: message.content,
            created_at: message.created_at
          });
          processedSenders.add(message.sender_id);
        }
      });

      setConversations(uniqueConversations);
      setLoading(false);
    };

    fetchConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as any;
          
          setConversations(prev => {
            // Check if we already have a conversation with this sender
            const existingIndex = prev.findIndex(c => c.sender_id === newMessage.sender_id);
            
            if (existingIndex >= 0) {
              // Update existing conversation
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                last_message: newMessage.content,
                created_at: newMessage.created_at
              };
              
              // Sort by most recent
              return updated.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            } else {
              // Add new conversation
              return [{
                sender_id: newMessage.sender_id,
                last_message: newMessage.content,
                created_at: newMessage.created_at
              }, ...prev];
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Messages</h2>
      </div>
      {conversations.length === 0 ? (
        <div className="p-4 text-center text-gray-400">
          No conversations yet
        </div>
      ) : (
        conversations.map((conversation) => (
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
        ))
      )}
    </div>
  );
};

export default ConversationList;
