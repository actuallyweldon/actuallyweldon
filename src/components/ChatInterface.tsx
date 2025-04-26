
import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
  const { messages, isLoading, error, sendMessage } = useMessages(userId, sessionId);

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

  return (
    <>
      <MessageList 
        messages={messages}
        isLoading={isLoading}
      />
      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={!sessionId && !userId}
        placeholder={!sessionId && !userId ? "Please sign in to send messages" : "Type your message..."}
      />
    </>
  );
};

export default ChatInterface;
