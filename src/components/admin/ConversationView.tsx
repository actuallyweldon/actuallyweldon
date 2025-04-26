
import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import MessageList from '../MessageList';
import MessageInput from '../MessageInput';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/message';

interface ConversationViewProps {
  userId: string;
  onBack?: () => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ userId, onBack }) => {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        const formattedMessages = data.map((msg): Message => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          is_admin: msg.is_admin,
          created_at: msg.created_at,
          sender: msg.is_admin ? 'admin' : 'user',
          timestamp: msg.created_at
        }));
        setMessages(formattedMessages);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages for this user
    const channel = supabase
      .channel('messages-for-user')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` },
        (payload) => {
          const newMessage = payload.new as any;
          const formattedMessage: Message = {
            id: newMessage.id,
            content: newMessage.content,
            sender_id: newMessage.sender_id,
            is_admin: newMessage.is_admin,
            created_at: newMessage.created_at,
            sender: newMessage.is_admin ? 'admin' : 'user',
            timestamp: newMessage.created_at
          };
          setMessages(prev => [...prev, formattedMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleSendMessage = async (content: string) => {
    const newMessage = {
      content,
      sender_id: userId, // Keep the original sender_id for admin replies
      is_admin: true // Mark as admin message
    };

    const { error } = await supabase
      .from('messages')
      .insert(newMessage);

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b border-gray-800">
        {isMobile && onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-white"
            onClick={onBack}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        )}
        <div>
          <h2 className="text-lg font-semibold text-white">
            Chat with User {userId.slice(0, 8)}
          </h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={loading} targetUserId={userId} />
      </div>
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ConversationView;
