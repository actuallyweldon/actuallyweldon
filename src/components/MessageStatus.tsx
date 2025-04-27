
import React from 'react';
import { Check, Clock, MailCheck } from 'lucide-react';
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
      case 'read':
        return <MailCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      default:
        return '';
    }
  };

  return (
    <div className={cn('flex items-center gap-1 opacity-70', className)} title={getStatusText()}>
      {getStatusIcon()}
    </div>
  );
};

export default MessageStatus;
