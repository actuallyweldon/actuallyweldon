
import React from 'react';
import { Button } from '@/components/ui/button';
import { CircleUser, LogOut, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface ChatHeaderProps {
  onAuthClick: () => void;
  isAuthenticated: boolean;
  onSignOut?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onAuthClick, isAuthenticated, onSignOut }) => {
  const { toast } = useToast();
  const { isAdmin, loading } = useAdminAuth();
  
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
      <div className="w-10">
        {isAuthenticated && onSignOut && (
          <Button 
            variant="ghost" 
            size="icon"
            className="text-imessage-header"
            onClick={onSignOut}
          >
            <LogOut className="h-6 w-6" />
          </Button>
        )}
      </div>
      <h1 className="text-imessage-header font-semibold text-center flex gap-2 items-center">
        actuallyweldon
        {isAdmin && !loading && (
          <Link to="/admin">
            <Button variant="outline" size="sm" className="text-xs">
              Admin Dashboard
            </Button>
          </Link>
        )}
      </h1>
      {isAuthenticated ? (
        <Button 
          variant="ghost" 
          size="icon"
          className="text-imessage-header"
        >
          <Settings className="h-6 w-6" />
        </Button>
      ) : (
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-imessage-header"
          onClick={handleProfileClick}
        >
          <CircleUser className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default ChatHeader;
