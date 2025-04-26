import { Message } from "@/types/message";

const MESSAGES_KEY = 'actuallyWeldon_messages';
const AUTH_PREFERENCES_KEY = 'actuallyWeldon_authPrefs';

export const saveMessagesToLocalStorage = (messages: Message[]): void => {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages to localStorage:', error);
  }
};

export const getMessagesFromLocalStorage = (): Message[] => {
  try {
    const messages = localStorage.getItem(MESSAGES_KEY);
    return messages ? JSON.parse(messages) : [];
  } catch (error) {
    console.error('Error getting messages from localStorage:', error);
    return [];
  }
};

export const clearMessagesFromLocalStorage = (): void => {
  try {
    localStorage.removeItem(MESSAGES_KEY);
  } catch (error) {
    console.error('Error clearing messages from localStorage:', error);
  }
};

interface AuthPreferences {
  hasVisited: boolean;
  preferredAuthMode?: 'login' | 'signup';
}

export const getAuthPreferences = (): AuthPreferences => {
  try {
    const prefs = localStorage.getItem(AUTH_PREFERENCES_KEY);
    return prefs ? JSON.parse(prefs) : { hasVisited: false };
  } catch (error) {
    console.error('Error getting auth preferences:', error);
    return { hasVisited: false };
  }
};

export const saveAuthPreferences = (prefs: AuthPreferences): void => {
  try {
    localStorage.setItem(AUTH_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving auth preferences:', error);
  }
};
