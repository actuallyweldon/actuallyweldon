import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

const ConversationList: React.FC<ConversationListProps> = ({ onSelectUser }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      
      try {
        // Get the most recent message from each unique sender along with their profile data
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(`
            sender_id,
            content,
            created_at,
            profiles!messages_sender_id_fkey (
              username
            )
          `)
          .order('created_at', { ascending: false });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          toast({
            title: "Error",
            description: "Could not load conversations",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Process the data to get unique conversations by sender_id
        const uniqueConversations: Conversation[] = [];
        const processedSenders = new Set();

        for (const message of messagesData || []) {
          if (!processedSenders.has(message.sender_id)) {
            const conversation: Conversation = {
              sender_id: message.sender_id,
              last_message: message.content,
              created_at: message.created_at,
              user_info: {
                username: message.profiles?.username
              }
            };
            
            uniqueConversations.push(conversation);
            processedSenders.add(message.sender_id);
          }
        }

        setConversations(uniqueConversations);
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

    fetchConversations();

    // Subscribe to new messages with optimized real-time updates
    const channel = supabase
      .channel('messages-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Get user profile info for this sender
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', newMessage.sender_id)
            .single();
          
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
                created_at: newMessage.created_at,
                user_info: {
                  username: profileData?.username
                }
              }, ...prev];
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">All Conversations</h2>
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
  );
};

export default ConversationList;
