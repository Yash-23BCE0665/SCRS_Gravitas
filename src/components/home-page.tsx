"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Team, User, EventKey } from "@/lib/types";
import { EVENTS } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Copy,
  LogIn,
  PlusCircle,
  Shuffle,
  Users,
  Loader2,
  Crown,
} from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  regNo: z
    .string()
    .regex(/^2[1-4](BCE|BIT|BCH|BEC)\d{4}$/i, "Invalid VIT Registration Number."),
  teamName: z.string().optional(),
  teamId: z.string().optional(),
  event: z.custom<EventKey>((val) => val, 'Please select an event.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function HomePage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTeamViewLoading, setIsTeamViewLoading] = useState(true);

  useEffect(() => {
    const user = sessionStorage.getItem("gravitas-user");
    const teamId = sessionStorage.getItem("gravitas-teamId");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    if (teamId) {
      fetchTeam(teamId);
    } else {
      setIsTeamViewLoading(false);
    }
  }, []);

  const fetchTeam = async (teamId: string) => {
    setIsTeamViewLoading(true);
    try {
      const response = await fetch(`/api/teams?id=${teamId}`);
      if (!response.ok) throw new Error("Team not found");
      const team = await response.json();
      setCurrentTeam(team);
    } catch (error) {
      console.error(error);
      // If team not found, clear session
      sessionStorage.removeItem("gravitas-teamId");
      setCurrentTeam(null);
    } finally {
      setIsTeamViewLoading(false);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      regNo: "",
      teamName: "",
      teamId: "",
    },
  });

  const handleApiResponse = async (response: Response) => {
    const result = await response.json();
    if (!response.ok) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.message,
      });
      return null;
    }
    toast({
      title: "Success",
      description: result.message,
    });
    sessionStorage.setItem("gravitas-user", JSON.stringify(result.user));
    sessionStorage.setItem("gravitas-teamId", result.team.id);
    setCurrentUser(result.user);
    setCurrentTeam(result.team);
    return result;
  };

  const onSubmit = async (
    values: FormValues,
    endpoint: "create" | "join" | "join-random"
  ) => {
    setIsLoading(true);
    try {
      let body;
      let url;

      if (!values.event) {
        toast({ variant: "destructive", title: "Error", description: "Please select an event." });
        setIsLoading(false);
        return;
      }
      
      const commonPayload = {
        userName: values.name,
        regNo: values.regNo.toUpperCase(),
        event: values.event,
      };

      switch (endpoint) {
        case "create":
          body = JSON.stringify({ ...commonPayload, teamName: values.teamName });
          url = "/api/teams";
          break;
        case "join":
          body = JSON.stringify({ ...commonPayload, teamId: values.teamId });
          url = "/api/teams/join";
          break;
        case "join-random":
          body = JSON.stringify(commonPayload);
          url = "/api/teams/join-random";
          break;
      }
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      await handleApiResponse(response);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "An unexpected error occurred.",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyTeamId = () => {
    if (!currentTeam) return;
    navigator.clipboard.writeText(currentTeam.id);
    toast({ title: "Team ID copied to clipboard!" });
  };
  
  const isLeader = currentUser?.id === currentTeam?.leaderId;

  if (isTeamViewLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUser && currentTeam) {
    return (
      <Card className="max-w-2xl mx-auto shadow-lg shadow-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="font-headline text-4xl text-primary tracking-wide">
            Welcome, {currentUser.name}
          </CardTitle>
          <CardDescription>You are part of team:</CardDescription>
          <p className="font-headline text-3xl text-foreground pt-2">
            {currentTeam.name}
          </p>
          <CardDescription>Event: {EVENTS.find(e => e.key === currentTeam.event)?.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Input value={currentTeam.id} readOnly className="font-mono" />
            <Button variant="outline" size="icon" onClick={copyTeamId} title="Copy Team ID">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full" variant="secondary">
                <Users className="mr-2 h-4 w-4" /> View Team Members ({currentTeam.members.length}/{4})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl text-primary tracking-wide">
                  {currentTeam.name}
                </DialogTitle>
              </DialogHeader>
              <ul className="space-y-2 font-mono">
                {currentTeam.members.map((member) => (
                  <li key={member.id} className="p-2 bg-muted/50 rounded-md flex items-center">
                    {member.name} ({member.id})
                    {member.id === currentTeam.leaderId && <Crown className="ml-2 h-4 w-4 text-primary" title="Team Leader"/>}
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>

          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              sessionStorage.clear();
              setCurrentUser(null);
              setCurrentTeam(null);
              toast({ title: "You have left your team." });
              // Here you would also call an API to remove the user from the team in a real app
            }}
            disabled={isLeader && currentTeam.members.length > 1}
            title={isLeader && currentTeam.members.length > 1 ? "Leader cannot leave a team with members." : "Leave Team"}
          >
            Leave Team
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="create" className="max-w-2xl mx-auto">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="create">Create</TabsTrigger>
        <TabsTrigger value="join" disabled={!!currentTeam}>Join</TabsTrigger>
        <TabsTrigger value="random" disabled={!!currentTeam}>Random</TabsTrigger>
      </TabsList>
      <Form {...form}>
        <form>
          <Card className="mt-4 shadow-lg shadow-primary/10 border-primary/20">
            <CardHeader>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="regNo"
                render={({ field }) => (
                  <FormItem className="pt-4">
                    <FormLabel>VIT Registration No.</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="21BCE0001"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="event"
                render={({ field }) => (
                  <FormItem className="pt-4">
                    <FormLabel>Event</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENTS.map((event) => (
                          <SelectItem key={event.key} value={event.key}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Ensure you are registered for this event on the VIT
                      portal.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardHeader>

            <TabsContent value="create">
              <CardContent>
                <FormField
                  control={form.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input placeholder="The Shadow Syndicate" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <Button
                disabled={isLoading}
                onClick={form.handleSubmit((v) => onSubmit(v, "create"))}
                className="w-full rounded-t-none"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                Create Team
              </Button>
            </TabsContent>

            <TabsContent value="join">
              <CardContent>
                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Team ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <Button
                disabled={isLoading}
                onClick={form.handleSubmit((v) => onSubmit(v, "join"))}
                className="w-full rounded-t-none"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Join Team
              </Button>
            </TabsContent>

            <TabsContent value="random">
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No team? No problem. We'll find a spot for you, or forge a
                  new team from the shadows.
                </p>
              </CardContent>
              <Button
                disabled={isLoading}
                onClick={form.handleSubmit((v) => onSubmit(v, "join-random"))}
                className="w-full rounded-t-none"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shuffle className="mr-2 h-4 w-4" />
                )}
                Join Random Team
              </Button>
            </TabsContent>
          </Card>
        </form>
      </Form>
    </Tabs>
  );
}
