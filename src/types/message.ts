
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  is_admin: boolean;
  created_at: string;
  
  // For compatibility with UI components
  sender: 'user' | 'admin';
  timestamp: string;
}
