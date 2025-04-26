
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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .maybeSingle();

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
        // Fetch messages for this conversation with better error handling
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
          return;
        }

        if (data) {
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

    // Set up more robust real-time subscriptions with reconnection logic
    const channel = supabase
      .channel(`messages-${userId}-admin`)
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
      // Also listen for message updates
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId}`
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id 
                ? {
                    ...msg,
                    content: updatedMessage.content,
                    updated_at: updatedMessage.updated_at
                  }
                : msg
            )
          );
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          
          // Auto-reconnect after delay
          setTimeout(() => {
            channel.subscribe();
            setConnectionStatus('connecting');
          }, 5000);
        } else {
          setConnectionStatus('connecting');
        }
      });

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

  const getConnectionStatusIndicator = () => {
    if (connectionStatus === 'connected') {
      return <span className="h-2 w-2 rounded-full bg-green-500 ml-2" title="Connected"></span>;
    } else if (connectionStatus === 'disconnected') {
      return <span className="h-2 w-2 rounded-full bg-red-500 ml-2" title="Disconnected"></span>;
    } else {
      return <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse ml-2" title="Connecting..."></span>;
    }
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
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-white">
            Chat with {getUserDisplayName()}
          </h2>
          {getConnectionStatusIndicator()}
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
