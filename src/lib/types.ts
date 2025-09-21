export interface User {
  id: string; // uuid
  name: string;
  email: string;
  username?: string;
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

export type EventKey = 'escape-exe-ii';
export const DEFAULT_EVENT: EventKey = 'escape-exe-ii';
export const EVENTS: { key: EventKey; name: string }[] = [
  { key: 'escape-exe-ii', name: 'ESCAPE.EXE II' },
];
