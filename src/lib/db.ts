import type { Team, User, EventKey, AdminUser } from './types';
import { supabase } from './supabase';

export const MAX_TEAM_MEMBERS = 4;

// Admin functions
export async function getAdmin(username: string) {
  const { data, error } = await supabase
    .from('admin')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error) throw error;
  return data as AdminUser;
}

// User functions
export async function getUser(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as User;
}

// Team functions
export async function getTeam(id: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Team;
}

export async function createTeam(team: Omit<Team, 'id'>) {
  const { data, error } = await supabase
    .from('teams')
    .insert(team)
    .select()
    .single();
  
  if (error) throw error;
  return data as Team;
}

export async function updateTeam(id: string, updates: Partial<Team>) {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Team;
}

// Event registration functions


export async function getEventRegistrations(eventKey: EventKey) {
  const { data, error } = await supabase
    .from('event_registration')
    .select('user_email')
    .eq('event_key', eventKey);
  if (error) throw error;
  return new Set(data.map(r => r.user_email));
}

export async function registerForEvent(eventKey: EventKey, userEmail: string, regNo: string) {
  const { error } = await supabase
    .from('event_registration')
    .insert({ event_key: eventKey, user_email: userEmail, reg_no: regNo });
  if (error) throw error;
}
