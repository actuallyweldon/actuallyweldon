import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ConnectionStatus from './ConnectionStatus';
import ConversationItem from './ConversationItem';
import ConversationPagination from './ConversationPagination';

interface ConversationListProps {
  onSelectUser: (userId: string) => void;
}

const CONVERSATIONS_PER_PAGE = 10;

const ConversationList: React.FC<ConversationListProps> = ({ onSelectUser }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const { toast } = useToast();

  const fetchConversations = async (page: number) => {
    setLoading(true);
    
    try {
      const { data: senderData, error: senderError, count } = await supabase
        .from('messages')
        .select('sender_id', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * CONVERSATIONS_PER_PAGE, page * CONVERSATIONS_PER_PAGE - 1);

      if (senderError) {
        console.error('Error fetching sender data:', senderError);
        toast({
          title: "Error",
          description: "Could not load conversations",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (!senderData?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      if (count) {
        setTotalPages(Math.ceil(count / CONVERSATIONS_PER_PAGE));
      }

      const uniqueSenderIds = Array.from(new Set(senderData.map(item => item.sender_id)));

      const conversationsPromises = uniqueSenderIds.map(async (senderId) => {
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('*')
          .eq('sender_id', senderId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (messageError) {
          console.error(`Error fetching message for sender ${senderId}:`, messageError);
          return null;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', senderId)
          .maybeSingle();

        if (profileError) {
          console.error(`Error fetching profile for sender ${senderId}:`, profileError);
        }

        return {
          sender_id: senderId,
          last_message: messageData.content,
          created_at: messageData.created_at,
          user_info: {
            username: profileData?.username
          }
        };
      });

      const conversationsResults = await Promise.all(conversationsPromises);
      const validConversations = conversationsResults.filter(conv => conv !== null) as Conversation[];

      validConversations.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setConversations(validConversations);
    } catch (err) {
      console.error('Error processing conversations:', err);
      toast({
        title: "Error",
        description: "Could not process conversation data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(currentPage);

    const channel = supabase
      .channel('admin-messages-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new as any;
          
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', newMessage.sender_id)
              .maybeSingle();
            
            setConversations(prev => {
              const existingIndex = prev.findIndex(c => c.sender_id === newMessage.sender_id);
              
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  last_message: newMessage.content,
                  created_at: newMessage.created_at
                };
                
                return updated.sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
              } else if (currentPage === 1) {
                return [{
                  sender_id: newMessage.sender_id,
                  last_message: newMessage.content,
                  created_at: newMessage.created_at,
                  user_info: {
                    username: profileData?.username
                  }
                }, ...prev];
              }
              return prev;
            });
          } catch (err) {
            console.error('Error handling real-time message:', err);
          }
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        async (payload) => {
          const updatedMessage = payload.new as any;
          
          setConversations(prev => {
            const updatedConversations = [...prev];
            const existingIndex = updatedConversations.findIndex(
              c => c.sender_id === updatedMessage.sender_id
            );
            
            if (existingIndex >= 0) {
              updatedConversations[existingIndex] = {
                ...updatedConversations[existingIndex],
                last_message: updatedMessage.content,
                created_at: updatedMessage.created_at
              };
            }
            
            return updatedConversations;
          });
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        } else {
          setConnectionStatus('connecting');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, currentPage]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center">
        <ConnectionStatus status={connectionStatus} />
        <h2 className="text-lg font-semibold text-white">All Conversations</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            No conversations yet
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.sender_id}
              senderId={conversation.sender_id}
              lastMessage={conversation.last_message}
              createdAt={conversation.created_at}
              userInfo={conversation.user_info}
              onClick={() => onSelectUser(conversation.sender_id)}
            />
          ))
        )}
      </div>
      
      <ConversationPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
};

export default ConversationList;
