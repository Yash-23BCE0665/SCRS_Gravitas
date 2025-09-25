import { Crown } from "lucide-react";

export default function AppTitle() {
  return (
    <div className="flex flex-col items-center justify-center mb-12 text-center">
      <Crown className="w-16 h-16 text-primary animate-flicker mb-4" />
      <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl tracking-wider animate-flicker">
        escape-exe
      </h1>
      <h2 className="font-body text-xl md:text-2xl text-primary mt-2">&nbsp;</h2>
    </div>
  );
}
