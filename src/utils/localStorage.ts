
import { Message } from "@/types/message";

const MESSAGES_KEY = 'actuallyWeldon_messages';

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

