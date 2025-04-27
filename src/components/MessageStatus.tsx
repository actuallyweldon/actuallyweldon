
import React from 'react';
import { Check, Clock, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageStatusProps {
  status: string;
  className?: string;
}

const MessageStatus: React.FC<MessageStatusProps> = ({ status, className }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sent':
        return <Clock className="h-3 w-3" />;
      case 'delivered':
        return <Check className="h-3 w-3" />;
      case 'error':
        return <CircleX className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('flex items-center space-x-1 opacity-70', className)}>
      {getStatusIcon()}
    </div>
  );
};

export default MessageStatus;
