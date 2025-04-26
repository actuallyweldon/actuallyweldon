
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileDropdownProps {
  isAuthenticated: boolean;
  onAuthClick: () => void;
  onSignOut?: () => void;
  email?: string | null;
  isAdmin?: boolean;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isAuthenticated,
  onAuthClick,
  onSignOut,
  email,
  isAdmin,
}) => {
  const initial = email ? email[0].toUpperCase() : '?';

  if (!isAuthenticated) {
    return (
      <Avatar className="h-8 w-8 bg-gray-700 cursor-pointer hover:opacity-80" onClick={onAuthClick}>
        <AvatarFallback className="bg-gray-700 text-white">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:opacity-80">
        <Avatar className="h-8 w-8 bg-gray-700">
          <AvatarFallback className="bg-gray-700 text-white">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="cursor-default opacity-50">
          {email}
        </DropdownMenuItem>
        {isAdmin && (
          <Link to="/admin">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Admin Dashboard
            </DropdownMenuItem>
          </Link>
        )}
        <DropdownMenuItem onClick={onSignOut}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
