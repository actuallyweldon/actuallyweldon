
import React from 'react';
import { Check, Clock, MailCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageStatusProps {
  status: string;
  className?: string;
  error?: string;
}

const MessageStatus: React.FC<MessageStatusProps> = ({ status, className, error }) => {
  const getStatusIcon = () => {
    if (error) {
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    }
    
    switch (status) {
      case 'sent':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <Check className="h-3 w-3 text-gray-500" />;
      case 'read':
        return <MailCheck className="h-3 w-3 text-blue-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (error) {
      return `Error: ${error}`;
    }
    
    switch (status) {
      case 'sent':
        return 'Sent - Waiting for delivery';
      case 'delivered':
        return 'Delivered - Not yet read';
      case 'read':
        return 'Read';
      default:
        return 'Sending...';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={cn(
            'flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity', 
            error ? 'text-destructive' : '',
            className
          )}
        >
          {getStatusIcon()}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getStatusText()}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default MessageStatus;
