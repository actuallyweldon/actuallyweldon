
import React from 'react';
import { Button } from '@/components/ui/button';
import { CircleUser } from 'lucide-react';
import { useToast } from '@/components/ui/toaster';

interface ChatHeaderProps {
  onAuthClick: () => void;
  isAuthenticated: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onAuthClick, isAuthenticated }) => {
  const { toast } = useToast();
  
  const handleProfileClick = () => {
    if (isAuthenticated) {
      toast({
        title: "Signed in",
        description: "You are currently signed in"
      });
    } else {
      onAuthClick();
    }
  };
  
  return (
    <div className="flex justify-between items-center p-4 bg-black border-b border-gray-800">
      <div className="w-10"></div>
      <h1 className="text-imessage-header font-semibold text-center">
        actuallyweldon
      </h1>
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-imessage-header"
        onClick={handleProfileClick}
      >
        <CircleUser className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default ChatHeader;
