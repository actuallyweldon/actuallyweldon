
export interface Conversation {
  sender_id: string;
  last_message: string;
  created_at: string;
  user_info: {
    username?: string;
  };
}

export interface UserInfo {
  username?: string;
}
