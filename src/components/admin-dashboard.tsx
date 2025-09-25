"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Team } from "@/lib/types";
import { EVENTS } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Save, Loader2, Edit, Crown, LogOut, UserX, GitMerge, UserCheck } from "lucide-react";
import { useMemo } from "react";



export default function AdminDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [updatingScores, setUpdatingScores] = useState<Record<string, boolean>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [poolCount, setPoolCount] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mergeFromId, setMergeFromId] = useState<string>("");
  const [mergeToId, setMergeToId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  const [assignLeaderTeamId, setAssignLeaderTeamId] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isAssigningLeader, setIsAssigningLeader] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  function RandomPoolList() {
    const [members, setMembers] = useState<{ user_id: string; user_name: string; user_email: string; event_date: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let active = true;
      (async () => {
        try {
          const res = await fetch('/api/admin/random-pool?list=true');
          const json = await res.json();
          if (!res.ok) throw new Error(json.message || 'Failed to load random pool');
          if (active) setMembers(json.members || []);
        } catch (e) {
          if (active) setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; }
    }, []);

    if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
    if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;
    if (!members.length) return <div className="p-4 text-sm">No members in random pool.</div>;

    return (
      <div className="max-h-[60vh] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.user_id}>
                <TableCell>{m.user_name}</TableCell>
                <TableCell className="font-mono">{m.user_email}</TableCell>
                <TableCell className="font-mono">{m.event_date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Remove member handler (must be inside component for hooks)
  const handleRemoveMember = async (teamId: string, memberId: string) => {
    setUpdatingScores(prev => ({...prev, [teamId + memberId]: true}));
    try {
      const res = await fetch(`/api/teams/${teamId}/remove-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to remove member');
      }
      toast({ title: "Success", description: result.message });
      fetchTeams();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error removing member",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setUpdatingScores(prev => ({...prev, [teamId + memberId]: false}));
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      try {
        // Check session first
        const sessionRes = await fetch('/api/auth/admin/session', {
          credentials: 'include'
        });

        if (!sessionRes.ok) {
          if (mounted) {
            toast({
              variant: "destructive",
              title: "Session Error",
              description: "Please log in again.",
            });
          }
          window.location.href = '/admin/login';
          return;
        }

        const { isAuthenticated } = await sessionRes.json();
        if (!isAuthenticated) {
          if (mounted) {
            toast({
              variant: "destructive",
              title: "Authentication Error",
              description: "Session invalid. Please log in again.",
            });
          }
          window.location.href = '/admin/login';
          return;
        }

        // Session is valid, fetch dashboard data
        if (mounted) {
          await Promise.all([fetchTeams(), fetchPool()]);
        }
      } catch (error) {
        console.error('Dashboard initialization error:', error);
        if (mounted) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load dashboard. Please try again.",
          });
        }
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) {
        throw new Error("Failed to fetch teams");
      }
      const data: Team[] = await res.json();
      // Sort by event_date asc, then slot_time asc
      const sorted = [...data].sort((a, b) => {
        const da = (a as any).event_date || '';
        const db = (b as any).event_date || '';
        if (da !== db) return da.localeCompare(db);
        const sa = (a as any).slot_time || '';
        const sb = (b as any).slot_time || '';
        return sa.localeCompare(sb);
      });
      setTeams(sorted);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPool = async () => {
    try {
      const res = await fetch('/api/admin/random-pool');
      if (!res.ok) {
        throw new Error('Failed to fetch pool count');
      }
      const data = await res.json();
      setPoolCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching pool count:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch random pool count",
      });
    }
  }

  const handleGenerateRandomTeams = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/generate-random-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamSize: 4 }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to generate teams');
      }
      toast({ title: 'Success', description: `Created ${result.createdTeamIds.length} teams.` });
      fetchTeams();
      fetchPool();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsGenerating(false);
    }
  }


  const handleUpdateScore = async (teamId: string, newScore: number) => {
    setUpdatingScores(prev => ({...prev, [teamId]: true}));
    try {
      const res = await fetch(`/api/teams/${teamId}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: newScore }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to update score');
      }
      toast({ title: "Success", description: result.message });
      fetchTeams(); // Refresh data
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error updating score",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setUpdatingScores(prev => ({...prev, [teamId]: false}));
    }
  };
  
  const handleEditTeam = (team: Team) => {
    setEditingTeam({ ...team });
    setIsEditModalOpen(true);
  };
  
  const handleSaveChanges = async () => {
    if (!editingTeam) return;
    
    setUpdatingScores(prev => ({...prev, [editingTeam.id]: true}));
    try {
      const res = await fetch(`/api/teams/${editingTeam.id}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingTeam.name, score: editingTeam.score }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to update team details');
      }
      toast({ title: "Success", description: "Team updated successfully." });
      setIsEditModalOpen(false);
      setEditingTeam(null);
      fetchTeams();
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error updating team",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      if(editingTeam) {
        setUpdatingScores(prev => ({...prev, [editingTeam.id]: false}));
      }
    }
  };
  
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/admin-logout', {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error('Logout failed');
      }
      router.push('/admin/login');
      toast({title: "Logged out successfully"});
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: "destructive",
        title: "Logout Error",
        description: "Failed to logout. Please try again.",
      });
    }
  }

  const handleLoadTeamMembers = async (teamId: string) => {
    setIsLoadingMembers(true);
    try {
      const res = await fetch(`/api/admin/assign-leader?teamId=${teamId}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to load team members');
      setTeamMembers(result.members || []);
      setAssignLeaderTeamId(teamId);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleAssignLeader = async (newLeaderId: string) => {
    if (!assignLeaderTeamId) return;
    setIsAssigningLeader(true);
    try {
      const res = await fetch('/api/admin/assign-leader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: assignLeaderTeamId, newLeaderId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to assign leader');
      toast({ title: 'Success', description: `Leader assigned: ${result.newLeader.name}` });
      setAssignLeaderTeamId("");
      setTeamMembers([]);
      fetchTeams();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setIsAssigningLeader(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          Random pool: <span className="font-mono font-semibold">{poolCount}</span> participant(s)
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerateRandomTeams} disabled={isGenerating || poolCount === 0}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            Generate Random Teams
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" /> View Random Pool
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Random Pool Members</DialogTitle>
              </DialogHeader>
              <RandomPoolList />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <GitMerge className="mr-2 h-4 w-4" /> Merge Teams
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Merge Teams (same event and date only)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">From Team</label>
                  <select
                    className="w-full border rounded px-3 py-2 bg-background"
                    value={mergeFromId}
                    onChange={(e) => setMergeFromId(e.target.value)}
                  >
                    <option value="">Select source team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.event} — {t.event_date || ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Into Team</label>
                  <select
                    className="w-full border rounded px-3 py-2 bg-background"
                    value={mergeToId}
                    onChange={(e) => setMergeToId(e.target.value)}
                  >
                    <option value="">Select target team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.event} — {t.event_date || ""}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={async () => {
                    if (!mergeFromId || !mergeToId) {
                      toast({ variant: "destructive", title: "Missing selection", description: "Choose both teams." });
                      return;
                    }
                    if (mergeFromId === mergeToId) {
                      toast({ variant: "destructive", title: "Invalid selection", description: "Teams must be different." });
                      return;
                    }
                    setIsMerging(true);
                    try {
                      const res = await fetch('/api/admin/merge-teams', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sourceTeamId: mergeFromId, targetTeamId: mergeToId })
                      });
                      const result = await res.json();
                      if (!res.ok) throw new Error(result.message || 'Merge failed');
                      toast({ title: 'Merged', description: result.message });
                      setMergeFromId("");
                      setMergeToId("");
                      fetchTeams();
                    } catch (e) {
                      toast({ variant: 'destructive', title: 'Merge error', description: e instanceof Error ? e.message : 'Unknown error' });
                    } finally {
                      setIsMerging(false);
                    }
                  }}
                  disabled={isMerging}
                >
                  {isMerging ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <GitMerge className="mr-2 h-4 w-4" />}
                  Merge
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <UserCheck className="mr-2 h-4 w-4" /> Assign Leader
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Team Leader</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Select Team</label>
                  <select
                    className="w-full border rounded px-3 py-2 bg-background"
                    value={assignLeaderTeamId}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleLoadTeamMembers(e.target.value);
                      } else {
                        setAssignLeaderTeamId("");
                        setTeamMembers([]);
                      }
                    }}
                  >
                    <option value="">Select team to assign leader</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.event} — {t.event_date || ""}
                      </option>
                    ))}
                  </select>
                </div>
                {isLoadingMembers && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading team members...</span>
                  </div>
                )}
                {teamMembers.length > 0 && (
                  <div>
                    <label className="block text-sm mb-2">Select New Leader</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className={`p-3 border rounded-md cursor-pointer transition-colors ${
                            member.isCurrentLeader 
                              ? 'bg-primary/10 border-primary' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => !member.isCurrentLeader && handleAssignLeader(member.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                            <div className="flex items-center">
                              {member.isCurrentLeader && (
                                <Crown className="h-4 w-4 text-primary mr-2" />
                              )}
                              {member.isCurrentLeader ? (
                                <span className="text-sm text-primary font-medium">Current Leader</span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isAssigningLeader}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssignLeader(member.id);
                                  }}
                                >
                                  {isAssigningLeader ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Assign'
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
          </Button>
        </div>
      </div>
      <div className="border rounded-lg shadow-lg shadow-primary/10 border-primary/20">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Name</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead className="text-center">Members</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No teams have been formed yet.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{EVENTS.find(e => e.key === team.event)?.name}</TableCell>
                  <TableCell className="font-mono">{(team as any).event_date || '-'}</TableCell>
                  <TableCell className="font-mono">{(team as any).slot_time?.slice(0,5) || '-'}</TableCell>
                  <TableCell className="text-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Users className="mr-2 h-4 w-4" /> {team.members.length}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="font-headline tracking-wide">{team.name} Members</DialogTitle>
                        </DialogHeader>
                        <ul className="space-y-2 font-mono">
                          {team.members.map((member) => (
                            <li key={member.id} className="p-2 bg-muted/50 rounded-md flex items-center justify-between">
                              <span>
                                {member.name}
                                {member.id === team.leader_id && <Crown className="ml-2 h-4 w-4 text-primary" />}
                              </span>
                              <span>
                                {team.members.length > 1 && (
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    disabled={updatingScores[team.id + member.id] || member.id === team.leader_id}
                                    onClick={() => handleRemoveMember(team.id, member.id)}
                                    title={member.id === team.leader_id ? "Cannot remove leader" : "Remove member"}
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell className="text-right font-mono">{team.score}</TableCell>
                  <TableCell className="text-center">
                     <Button size="sm" onClick={() => handleEditTeam(team)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                     </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingTeam && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team: {editingTeam.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="teamName">Team Name</label>
                <Input 
                  id="teamName" 
                  value={editingTeam.name} 
                  onChange={(e) => setEditingTeam({...editingTeam, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="teamScore">Score</label>
                <Input 
                  id="teamScore" 
                  type="number"
                  value={editingTeam.score} 
                  onChange={(e) => setEditingTeam({...editingTeam, score: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <Button onClick={handleSaveChanges} disabled={updatingScores[editingTeam.id]}>
              {updatingScores[editingTeam.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
               Save Changes
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
