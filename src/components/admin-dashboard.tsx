"use client";

import { useState, useEffect } from "react";
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
import { Users, Save, Loader2, Edit, Crown } from "lucide-react";

export default function AdminDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [updatingScores, setUpdatingScores] = useState<Record<string, boolean>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

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

  useEffect(() => {
    fetchTeams();
  }, []);

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
      setUpdatingScores(prev => ({...prev, [editingTeam.id]: false}));
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
                            <li key={member.id} className="p-2 bg-muted/50 rounded-md flex items-center">
                              {member.name} ({member.id})
                              {member.id === team.leaderId && <Crown className="ml-2 h-4 w-4 text-primary" title="Team Leader"/>}
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
