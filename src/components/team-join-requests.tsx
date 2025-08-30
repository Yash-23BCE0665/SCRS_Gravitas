import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus, UserX } from "lucide-react";
import type { Team, User } from "@/lib/types";

interface JoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

interface TeamJoinRequestsProps {
  leaderId: string;
  team: Team;
}

export default function TeamJoinRequests({ leaderId, team }: TeamJoinRequestsProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
    // Optionally, poll every 10s
    // const interval = setInterval(fetchRequests, 10000);
    // return () => clearInterval(interval);
  }, [team.id]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/join-requests?leaderId=${leaderId}`);
      const data = await res.json();
      setRequests(data.filter((r: JoinRequest) => r.team_id === team.id && r.status === "pending"));
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: "accept" | "reject") => {
    setActionLoading(requestId + action);
    try {
      const res = await fetch("/api/teams/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      await fetchRequests();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  }

  if (!requests.length) {
    return <div className="text-muted-foreground text-sm py-2 text-center">No pending join requests.</div>;
  }

  return (
    <Card className="my-4 border-primary/30">
      <CardHeader>
        <CardTitle className="text-lg">Pending Join Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {requests.map((req) => (
            <li key={req.id} className="flex items-center justify-between bg-muted/50 rounded-md p-2">
              <span>
                <span className="font-semibold">{req.user_name}</span> <span className="text-xs text-muted-foreground">({req.user_email})</span>
              </span>
              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={actionLoading === req.id + "accept"}
                  onClick={() => handleAction(req.id, "accept")}
                >
                  {actionLoading === req.id + "accept" ? <Loader2 className="animate-spin h-4 w-4" /> : <UserPlus className="h-4 w-4" />} Accept
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={actionLoading === req.id + "reject"}
                  onClick={() => handleAction(req.id, "reject")}
                >
                  {actionLoading === req.id + "reject" ? <Loader2 className="animate-spin h-4 w-4" /> : <UserX className="h-4 w-4" />} Reject
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
