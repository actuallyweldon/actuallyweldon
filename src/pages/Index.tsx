import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import AuthModal from '../components/AuthModal';
import { Message } from '../types/message';
import { 
  saveMessagesToLocalStorage, 
  getMessagesFromLocalStorage 
} from '../utils/localStorage';
import { initAudio, playMessageSound } from '../utils/sound';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedMessages = getMessagesFromLocalStorage();
    if (storedMessages.length === 0) {
      const welcomeMessage: Message = {
        id: uuidv4(),
        content: 'Hello.',
        sender: 'admin',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
      saveMessagesToLocalStorage([welcomeMessage]);
    } else {
      setMessages(storedMessages);
    }

    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
    };
    document.addEventListener('click', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToLocalStorage(messages);
    }
  }, [messages]);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    if (!isInitialLoad && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'admin') {
        playMessageSound();
      }
    } else if (isInitialLoad && messages.length > 0) {
      setIsInitialLoad(false);
    }
  }, [messages, isInitialLoad]);

  const handleSendMessage = (content: string) => {
    const newUserMessage: Message = {
      id: uuidv4(),
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    
    setTimeout(() => {
      const adminMessage: Message = {
        id: uuidv4(),
        content: getRandomAdminResponse(),
        sender: 'admin',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, adminMessage]);
    }, Math.random() * 2000 + 500);
  };

  const getRandomAdminResponse = () => {
    const responses = [
      "I'll get back to you soon.",
      "Thanks for reaching out.",
      "I'm currently away from my phone.",
      "I'll respond when I can.",
      "Got your message!",
      "I appreciate your message.",
      "I'll check this out.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsAuthenticated(true);
      toast({
        title: "Signed in",
        description: "You are now signed in"
      });
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsAuthenticated(true);
      toast({
        title: "Account created",
        description: "Your account has been created and you're now signed in"
      });
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-imessage-background">
      <ChatHeader 
        onAuthClick={() => setIsAuthModalOpen(true)} 
        isAuthenticated={isAuthenticated}
      />
      <MessageList messages={messages} />
      <MessageInput onSendMessage={handleSendMessage} />
      
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />
    </div>
  );
};

export default Index;
