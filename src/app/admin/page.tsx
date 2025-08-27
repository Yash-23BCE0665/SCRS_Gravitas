import AdminDashboard from "@/components/admin-dashboard";

export default function AdminPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="font-headline text-5xl md:text-7xl tracking-wider text-primary">Admin Dashboard</h1>
        <p className="font-body text-muted-foreground mt-2">Oversee the shadows.</p>
      </div>
      <AdminDashboard />
    </main>
  );
}
