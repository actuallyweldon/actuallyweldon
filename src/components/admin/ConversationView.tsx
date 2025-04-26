import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, UserRound } from 'lucide-react';
import MessageList from '../MessageList';
import MessageInput from '../MessageInput';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/message';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${userId},recipient_id.is.null),` +
            `and(is_admin.eq.true,recipient_id.eq.${userId}),` +
            `and(sender_id.eq.${userId},is_admin.eq.true)`
          )
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching messages:', error);
          setError(`Could not load messages: ${error.message}`);
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
        console.error('Error processing messages:', error);
        setError(`Could not process messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
    fetchMessages();

    const channel = supabase
      .channel(`messages-${userId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.recipient_id !== userId && newMessage.sender_id !== userId) return;

          const formattedMessage: Message = {
            id: newMessage.id,
            content: newMessage.content,
            sender_id: newMessage.sender_id,
            is_admin: newMessage.is_admin,
            created_at: newMessage.created_at,
            sender: newMessage.is_admin ? 'admin' : 'user',
            timestamp: newMessage.created_at
          };
          
          setMessages((current) => [...current, formattedMessage]);
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          console.error('Supabase channel disconnected or error:', status);
          
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
  }, [userId]);

  const handleSendMessage = async (content: string) => {
    try {
      setError(null);
      const newMessage = {
        content,
        sender_id: userId,
        is_admin: true,
        recipient_id: userId
      };

      const { error: insertError } = await supabase
        .from('messages')
        .insert(newMessage);

      if (insertError) {
        console.error('Error sending message:', insertError);
        setError(`Failed to send message: ${insertError.message}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 bg-gray-700">
            <AvatarFallback className="bg-gray-700 text-white">
              <UserRound className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-semibold text-white">
            Chat with {getUserDisplayName()}
          </h2>
          {getConnectionStatusIndicator()}
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="m-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
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
