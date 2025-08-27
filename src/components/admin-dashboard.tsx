"use client";

import { useState, useEffect } from "react";
import type { Team } from "@/lib/types";
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
import { Users, Save, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [updatingScores, setUpdatingScores] = useState<Record<string, boolean>>({});
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
      const initialScores = data.reduce((acc, team) => {
        acc[team.id] = team.score;
        return acc;
      }, {} as Record<string, number>);
      setScores(initialScores);
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

  const handleScoreChange = (teamId: string, value: string) => {
    const newScore = parseInt(value, 10);
    setScores(prev => ({ ...prev, [teamId]: isNaN(newScore) ? 0 : newScore }));
  };

  const handleUpdateScore = async (teamId: string) => {
    setUpdatingScores(prev => ({...prev, [teamId]: true}));
    try {
      const res = await fetch(`/api/teams/${teamId}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: scores[teamId] }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to update score');
      }
      toast({ title: "Success", description: result.message });
      // Refresh data after update
      fetchTeams();
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg shadow-lg shadow-primary/10 border-primary/20">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team Name</TableHead>
            <TableHead>Members</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24">
                No teams have been formed yet.
              </TableCell>
            </TableRow>
          ) : (
            teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.name}</TableCell>
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
                          <li key={member.id} className="p-2 bg-muted/50 rounded-md">
                            {member.name} ({member.id})
                          </li>
                        ))}
                      </ul>
                    </DialogContent>
                  </Dialog>
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    value={scores[team.id] || 0}
                    onChange={(e) => handleScoreChange(team.id, e.target.value)}
                    className="max-w-[120px] ml-auto text-right"
                  />
                </TableCell>
                <TableCell className="text-center">
                   <Button size="sm" onClick={() => handleUpdateScore(team.id)} disabled={updatingScores[team.id]}>
                    {updatingScores[team.id] ? (
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                     Save
                   </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
