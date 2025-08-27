import type { Team, User, EventKey, AdminUser } from './types';

interface Database {
  teams: Team[];
  admins: AdminUser[];
  // Storing users separately to manage logins and passwords
  users: User[];
  eventRegistrations: Record<EventKey, Set<string>>;
  MAX_TEAM_MEMBERS: number;
}

// In-memory "database"
// NOTE: This will reset on every server restart in development.
export const db: Database = {
  teams: [],
  admins: [
    { id: 'admin1', username: 'shadowmaster', password: 'password123' },
  ],
  // Pre-seeded users for demo purposes. In a real app, this would be a user registration system.
  users: [
      { id: '21BCE0001', name: 'John Doe', password: 'password' },
      { id: '22BCE0002', name: 'Jane Smith', password: 'password' },
      { id: '21BIT0054', name: 'Peter Jones', password: 'password' },
      { id: '21BCI0123', name: 'Mary Jane', password: 'password' },
      { id: '23BCH0003', name: 'Clark Kent', password: 'password' },
      { id: '22BCE0101', name: 'Bruce Wayne', password: 'password' },
      { id: '21BCE0456', name: 'Diana Prince', password: 'password' },
  ],
  eventRegistrations: {
    'de-crypt': new Set(['21BCE0001', '22BCE0002', '21BIT0054', '21BCI0123']),
    'code-a-thon': new Set(['23BCH0003', '21BCE0001', '22BCE0101', '21BCE0456']),
  },
  MAX_TEAM_MEMBERS: 4,
};
