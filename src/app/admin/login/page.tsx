import AdminLoginForm from "@/components/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
       <div className="text-center mb-12">
        <h1 className="font-headline text-5xl md:text-7xl tracking-wider text-primary">Admin Login</h1>
        <p className="font-body text-muted-foreground mt-2">Enter the shadows.</p>
      </div>
      <AdminLoginForm />
    </main>
  );
}
