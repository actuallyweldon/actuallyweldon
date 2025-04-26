
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'anonymous_session_id';

export const useAnonymousSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Try to get existing session from localStorage
    let existingSession = localStorage.getItem(SESSION_KEY);
    
    if (!existingSession) {
      // Create new session if none exists
      existingSession = uuidv4();
      localStorage.setItem(SESSION_KEY, existingSession);
    }
    
    setSessionId(existingSession);
  }, []);

  return { sessionId };
};
