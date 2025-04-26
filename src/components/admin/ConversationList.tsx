import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Loader2, UserRound } from 'lucide-react';
import ProfileDropdown from '../ProfileDropdown';
import { User } from '@supabase/supabase-js';

interface UserInfo {
  email?: string;
  username?: string;
}

interface Conversation {
  id: string;
  sender_id: string | null;
  session_id: string | null;
  last_message: string;
  created_at: string;
  user_info?: UserInfo;
}

interface ConversationListProps {
  onSelectUser: (userId: string) => void;
  user: User | null;
  isAdmin?: boolean;
  onSignOut?: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ 
  onSelectUser, 
  user,
  isAdmin,
  onSignOut 
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    setLoading(true);
    console.log('Fetching conversations...');
    
    try {
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .or('session_id.is.not.null,sender_id.is.not.null')
        .order('created_at', { ascending: false });

      if (messageError) {
        console.error('Error fetching messages:', messageError);
        setLoading(false);
        return;
      }

      if (!messageData?.length) {
        console.log('No messages found');
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationMap = new Map<string, Conversation>();

      for (const message of messageData) {
        const conversationId = message.sender_id || message.session_id;
        if (!conversationId) continue;

        if (!conversationMap.has(conversationId)) {
          conversationMap.set(conversationId, {
            id: conversationId,
            sender_id: message.sender_id,
            session_id: message.session_id,
            last_message: message.content,
            created_at: message.created_at,
            user_info: undefined
          });
        }
      }

      const userConversations = Array.from(conversationMap.values()).filter(conv => conv.sender_id);
      
      for (const conv of userConversations) {
        if (conv.sender_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', conv.sender_id)
            .maybeSingle();

          if (profileData) {
            conv.user_info = { username: profileData.username };
          }
        }
      }

      const sortedConversations = Array.from(conversationMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log(`Found ${sortedConversations.length} conversations`);
      setConversations(sortedConversations);

    } catch (err) {
      console.error('Error processing conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    const channel = supabase.channel('admin-messages-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new as any;
          console.log('New message received:', newMessage);
          
          const conversationId = newMessage.sender_id || newMessage.session_id;
          if (!conversationId) {
            console.log('Invalid message: no sender_id or session_id');
            return;
          }
          
          try {
            let userInfo = undefined;
            if (newMessage.sender_id) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', newMessage.sender_id)
                .maybeSingle();
              
              if (profileData) {
                userInfo = { username: profileData.username };
              }
            }
            
            setConversations(prev => {
              const existingIndex = prev.findIndex(c => 
                c.id === conversationId
              );
              
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  last_message: newMessage.content,
                  created_at: newMessage.created_at,
                  user_info: userInfo || updated[existingIndex].user_info
                };
                
                return updated.sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
              } else {
                return [{
                  id: conversationId,
                  sender_id: newMessage.sender_id,
                  session_id: newMessage.session_id,
                  last_message: newMessage.content,
                  created_at: newMessage.created_at,
                  user_info: userInfo
                }, ...prev];
              }
            });
          } catch (err) {
            console.error('Error handling real-time message:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getUserDisplayName = (conversation: Conversation) => {
    if (conversation.user_info?.username) {
      return conversation.user_info.username;
    }
    if (conversation.sender_id) {
      return `User ${conversation.sender_id.slice(0, 8)}`;
    }
    return `Anonymous ${conversation.session_id?.slice(0, 8)}`;
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
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Messages</h2>
        <ProfileDropdown
          isAuthenticated={!!user}
          onAuthClick={() => {}}
          onSignOut={onSignOut}
          email={user?.email}
          isAdmin={isAdmin}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            No conversations yet
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="p-4 border-b border-gray-800 hover:bg-gray-900 cursor-pointer flex items-center space-x-4"
              onClick={() => onSelectUser(conversation.sender_id || conversation.session_id || '')}
            >
              <Avatar className="h-10 w-10 bg-gray-700">
                <AvatarFallback className="bg-gray-700 text-white">
                  <UserRound className="h-5 w-5" />
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
                {format(new Date(conversation.created_at), 'MMM d')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
