
import React from 'react';
import { Check, Clock, MailCheck, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
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
      case 'sending':
        return <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />;
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
      case 'sending':
        return 'Sending...';
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

  // Get color and animation classes based on status
  const getStatusClasses = () => {
    if (error) return 'text-destructive';
    
    switch (status) {
      case 'sending':
        return 'text-gray-400';
      case 'sent':
        return 'text-gray-400';
      case 'delivered':
        return 'text-gray-500';
      case 'read':
        return 'text-blue-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity', 
              getStatusClasses(),
              className
            )}
            aria-label={getStatusText()}
          >
            {getStatusIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getStatusText()}</p>
          {status === 'read' && (
            <p className="text-xs text-gray-400">The recipient has seen this message</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MessageStatus;
