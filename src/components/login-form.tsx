"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/lib/types";
import { Loader2, LogIn } from "lucide-react";

const formSchema = z.object({
  regNo: z
    .string()
    .regex(/^2[1-4](BCE|BIT|BCH|BEC)\d{4}$/i, "Invalid VIT Registration Number."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof formSchema>;

interface LoginFormProps {
    onLoginSuccess: (user: User) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      regNo: "",
      password: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/auth/participant-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                regNo: values.regNo.toUpperCase(),
                password: values.password
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Login failed.');
        }

        toast({
            title: "Login Successful",
            description: `Welcome, ${result.user.name}!`,
        });

        sessionStorage.setItem("gravitas-user", JSON.stringify(result.user));
        onLoginSuccess(result.user);

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Login Error",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg shadow-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle>Participant Login</CardTitle>
        <CardDescription>
          Enter your credentials to manage your team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <FormField
                control={form.control}
                name="regNo"
                render={({ field }) => (
                  <FormItem>
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                   <FormDescription>
                    For this prototype, the password for all users is 'password'.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2"/>}
              Login
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
