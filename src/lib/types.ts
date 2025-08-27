export interface User {
  id: string; // registration number
  name: string;
  password?: string; // Should be hashed in a real app
}

export interface AdminUser {
  id: string;
  username: string;
  password?: string; // Should be hashed in a real app
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  members: User[];
  score: number;
  event: EventKey;
}

export type EventKey = 'de-crypt' | 'code-a-thon';
export const EVENTS: { key: EventKey; name: string }[] = [
  { key: 'de-crypt', name: 'De-Crypt' },
  { key: 'code-a-thon', name: 'Code-A-Thon' },
];
