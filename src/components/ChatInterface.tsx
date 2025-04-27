import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MessageSquareDashed } from "lucide-react";

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
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    setTypingStatus, 
    typingUsers,
    markMessagesAsRead 
  } = useMessages(userId, sessionId);

  const handleSendMessage = async (content: string) => {
    const success = await sendMessage(content);
    if (!success) {
      onAuthRequired();
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading messages. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isTypingIndicatorVisible = typingUsers && typingUsers.length > 0;

  return (
    <>
      <MessageList 
        messages={messages}
        isLoading={isLoading}
        showTypingIndicator={typingUsers.length > 0}
        onMarkMessagesRead={markMessagesAsRead}
      />
      
      {isTypingIndicatorVisible && (
        <div className="fixed bottom-[65px] left-4 z-20 py-2 px-4 bg-gray-800 text-white text-sm rounded-full animate-pulse flex items-center">
          <MessageSquareDashed className="h-4 w-4 mr-2" />
          {typingUsers.length > 1 ? 'People are typing...' : 'Someone is typing...'}
        </div>
      )}
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        onTyping={setTypingStatus}
        disabled={!sessionId && !userId}
        placeholder={!sessionId && !userId ? "Please sign in to send messages" : "Type your message..."}
      />
    </>
  );
};

export default ChatInterface;
