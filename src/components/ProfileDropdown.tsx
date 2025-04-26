
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User } from 'lucide-react';

interface ProfileDropdownProps {
  isAuthenticated: boolean;
  onAuthClick: () => void;
  onSignOut?: () => void;
  email?: string | null;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isAuthenticated,
  onAuthClick,
  onSignOut,
  email,
}) => {
  const initial = email ? email[0].toUpperCase() : '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:opacity-80">
        <Avatar className="h-8 w-8 bg-gray-700">
          <AvatarFallback className="bg-gray-700 text-white">
            {isAuthenticated ? initial : <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isAuthenticated ? (
          <>
            <DropdownMenuItem className="cursor-default opacity-50">
              {email}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSignOut}>
              Sign out
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={onAuthClick}>
            Sign in
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
