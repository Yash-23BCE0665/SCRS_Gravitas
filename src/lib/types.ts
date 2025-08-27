export interface User {
  id: string; // registration number
  name: string;
}

export interface Team {
  id: string;
  name: string;
  members: User[];
  score: number;
}

export type EventKey = 'de-crypt' | 'code-a-thon' | 'web-app-dev';
export const EVENTS: { key: EventKey; name: string }[] = [
  { key: 'de-crypt', name: 'De-Crypt' },
  { key: 'code-a-thon', name: 'Code-A-Thon' },
  { key: 'web-app-dev', name: 'Web App Dev' },
];
