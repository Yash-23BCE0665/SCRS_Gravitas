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
import { Users, Save, Loader2, Edit, Crown, LogOut, UserX } from "lucide-react";



export default function AdminDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [updatingScores, setUpdatingScores] = useState<Record<string, boolean>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [poolCount, setPoolCount] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
      setTeams(data);
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
