
import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ConnectionStatus from './ConnectionStatus';
import ConversationItem from './ConversationItem';
import ConversationPagination from './ConversationPagination';
import { useConversationList } from '@/hooks/useConversationList';
import { Button } from '@/components/ui/button';

interface ConversationListProps {
  onSelectUser: (userId: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ onSelectUser }) => {
  const {
    conversations,
    loading,
    currentPage,
    totalPages,
    connectionStatus,
    setCurrentPage,
    markConversationAsRead,
    retryFetchConversations
  } = useConversationList();

  const handleSelectUser = (userId: string) => {
    markConversationAsRead(userId);
    onSelectUser(userId);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center">
          <ConnectionStatus status={connectionStatus} />
          <h2 className="text-lg font-semibold text-white">All Conversations</h2>
        </div>
        
        {!loading && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={retryFetchConversations} 
            title="Refresh conversations"
          >
            <RefreshCw className="h-4 w-4 text-gray-400" />
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            No conversations yet
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.sender_id}
              conversation={conversation}
              onClick={() => handleSelectUser(conversation.sender_id)}
            />
          ))
        )}
      </div>
      
      <ConversationPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
};

export default ConversationList;
