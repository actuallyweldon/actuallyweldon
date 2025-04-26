
import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useMessages } from '@/hooks/useMessages';

interface ChatInterfaceProps {
  userId: string | null;
  sessionId: string | null;
  onAuthRequired: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  userId,
  sessionId,
  onAuthRequired,
}) => {
  const { messages, isLoading, sendMessage } = useMessages(userId, sessionId);

  const handleSendMessage = async (content: string) => {
    const success = await sendMessage(content);
    if (!success) {
      onAuthRequired();
    }
  };

  return (
    <>
      <MessageList 
        messages={messages}
        isLoading={isLoading} 
      />
      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={!sessionId && !userId} 
      />
    </>
  );
};

export default ChatInterface;
