
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/message';
import { User } from '@supabase/supabase-js';

export const messagesService = {
  async fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((msg): Message => ({
      ...msg,
      sender: msg.is_admin ? 'admin' : 'user',
      timestamp: msg.created_at,
    }));
  },

  async sendMessage(content: string, user: User, isAdmin: boolean = false) {
    const newMessage = {
      content,
      sender_id: user.id,
      is_admin: isAdmin,
      recipient_id: null
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(newMessage);

    if (error) throw error;
    return data;
  },

  subscribeToMessages(callback: (message: Message) => void) {
    const channel = supabase
      .channel('public-messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as any;
          const formattedMessage: Message = {
            ...newMessage,
            sender: newMessage.is_admin ? 'admin' : 'user',
            timestamp: newMessage.created_at
          };
          callback(formattedMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
