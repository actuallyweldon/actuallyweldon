
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'anonymous_session_id';

export const useAnonymousSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    console.log('Initializing anonymous session');
    let existingSession = localStorage.getItem(SESSION_KEY);
    
    if (!existingSession) {
      console.log('No existing session found, creating new one');
      existingSession = uuidv4();
      localStorage.setItem(SESSION_KEY, existingSession);
    } else {
      console.log('Found existing session:', existingSession);
    }
    
    setSessionId(existingSession);
  }, []);

  return { sessionId };
};
