import AppTitle from "@/components/app-title";
import HomePage from "@/components/home-page";
import LoginForm from "@/components/login-form";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <AppTitle />
      <HomePage />
    </main>
  );
}
