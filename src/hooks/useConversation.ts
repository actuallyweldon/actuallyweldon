
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/message';
import { UserInfo } from '@/types/conversation';
import { useToast } from '@/hooks/use-toast';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export const useConversation = (userId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
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

  const handleSendMessage = async (content: string) => {
    try {
      const newMessage = {
        content,
        sender_id: userId,
        is_admin: true
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

  return {
    messages,
    loading,
    userInfo,
    connectionStatus,
    handleSendMessage
  };
};
