export interface User {
  id: string; // uuid
  name: string;
  email: string;
  password?: string; // nullable, for fallback login
}

export interface AdminUser {
  id: string;
  username: string;
  password?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export interface Team {
  id: string;
  name: string;
  leader_id: string;
  members: TeamMember[];
  score: number;
  event: EventKey;
}

export type EventKey = 'de-crypt' | 'code-a-thon';
export const EVENTS: { key: EventKey; name: string }[] = [
  { key: 'de-crypt', name: 'De-Crypt' },
  { key: 'code-a-thon', name: 'Code-A-Thon' },
];
