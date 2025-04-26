
import React from 'react';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface ConnectionStatusProps {
  status: ConnectionStatus;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  if (status === 'connected') {
    return <span className="h-2 w-2 rounded-full bg-green-500 mr-2" title="Connected"></span>;
  } else if (status === 'disconnected') {
    return <span className="h-2 w-2 rounded-full bg-red-500 mr-2" title="Disconnected"></span>;
  } else {
    return <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse mr-2" title="Connecting..."></span>;
  }
};

export default ConnectionStatus;
