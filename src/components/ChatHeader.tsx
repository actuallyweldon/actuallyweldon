
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';

interface ChatHeaderProps { 
  onAuthClick: () => void;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  onSignOut?: () => void;
  email?: string | null;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  onAuthClick, 
  isAuthenticated, 
  isAdmin,
  onSignOut,
  email
}) => {
  return (
    <div className="flex justify-between items-center p-4 bg-black border-b border-gray-800">
      <div className="w-10">
        {/* Removed settings icon */}
      </div>
      <h1 className="text-imessage-header font-semibold text-center flex gap-2 items-center">
        actuallyweldon
        {isAuthenticated && isAdmin && (
          <Link to="/admin">
            <Button variant="outline" size="sm" className="text-xs ml-2">
              Admin Dashboard
            </Button>
          </Link>
        )}
      </h1>
      <ProfileDropdown
        isAuthenticated={isAuthenticated}
        onAuthClick={onAuthClick}
        onSignOut={onSignOut}
        email={email}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default ChatHeader;
