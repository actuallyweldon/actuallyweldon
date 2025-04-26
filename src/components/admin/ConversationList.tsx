
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';

interface UserInfo {
  email?: string;
  username?: string;
}

interface Conversation {
  sender_id: string;
  last_message: string;
  created_at: string;
  user_info?: UserInfo;
}

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
      // First, get unique sender_ids with their most recent message
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

      // Calculate total pages
      if (count) {
        setTotalPages(Math.ceil(count / CONVERSATIONS_PER_PAGE));
      }

      // Get unique sender IDs
      const uniqueSenderIds = Array.from(new Set(senderData.map(item => item.sender_id)));

      // For each unique sender, get their most recent message and profile info
      const conversationsPromises = uniqueSenderIds.map(async (senderId) => {
        // Get the most recent message from this sender
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

        // Get user profile info
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

      // Sort by most recent
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

    // Setup WebSocket connection for real-time updates
    const channel = supabase
      .channel('admin-messages-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new as any;
          
          try {
            // Get user profile info for this sender
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', newMessage.sender_id)
              .maybeSingle();
            
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
              } else if (currentPage === 1) {
                // Add new conversation only if on first page
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
      // Also listen for updates to messages
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
      // Listen for connection status
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getUserDisplayName = (conversation: Conversation) => {
    if (conversation.user_info?.username) {
      return conversation.user_info.username;
    }
    return `User ${conversation.sender_id.slice(0, 8)}`;
  };

  const getAvatarLetters = (conversation: Conversation) => {
    if (conversation.user_info?.username) {
      return conversation.user_info.username.slice(0, 2).toUpperCase();
    }
    return conversation.sender_id.slice(0, 2).toUpperCase();
  };

  const getConnectionStatusIndicator = () => {
    if (connectionStatus === 'connected') {
      return <span className="h-2 w-2 rounded-full bg-green-500 mr-2" title="Connected"></span>;
    } else if (connectionStatus === 'disconnected') {
      return <span className="h-2 w-2 rounded-full bg-red-500 mr-2" title="Disconnected"></span>;
    } else {
      return <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse mr-2" title="Connecting..."></span>;
    }
  };

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
        {getConnectionStatusIndicator()}
        <h2 className="text-lg font-semibold text-white">All Conversations</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
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
                    {getAvatarLetters(conversation)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {getUserDisplayName(conversation)}
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
      
      {totalPages > 1 && (
        <div className="p-2 border-t border-gray-800">
          <Pagination>
            <PaginationContent>
              {Array.from({ length: totalPages }).map((_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    isActive={currentPage === index + 1}
                    onClick={() => handlePageChange(index + 1)}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default ConversationList;
