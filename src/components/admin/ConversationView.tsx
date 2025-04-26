
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import MessageList from '../MessageList';
import MessageInput from '../MessageInput';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/message';
import { useToast } from '@/hooks/use-toast';

interface ConversationViewProps {
  userId: string;
  onBack?: () => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ userId, onBack }) => {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ username?: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }

        if (data) {
          setUserInfo(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${userId},and(is_admin.eq.true,sender_id.eq.${userId})`)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching messages:', error);
          toast({
            title: "Error",
            description: "Could not load messages",
            variant: "destructive"
          });
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
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: "Error",
          description: "Could not load messages",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
    fetchMessages();

    // Subscribe to new messages for this user conversation
    const channel = supabase
      .channel(`messages-${userId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `sender_id=eq.${userId}` 
        },
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
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `is_admin=eq.true,sender_id=eq.${userId}` 
        },
        (payload) => {
          const newMessage = payload.new as any;
          const formattedMessage: Message = {
            id: newMessage.id,
            content: newMessage.content,
            sender_id: newMessage.sender_id,
            is_admin: newMessage.is_admin,
            created_at: newMessage.created_at,
            sender: 'admin',
            timestamp: newMessage.created_at
          };
          setMessages(prev => [...prev, formattedMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  const getUserDisplayName = () => {
    if (userInfo.username) {
      return userInfo.username;
    }
    return `User ${userId.slice(0, 8)}`;
  };

  const handleSendMessage = async (content: string) => {
    try {
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
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
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
            Chat with {getUserDisplayName()}
          </h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ConversationView;
