import { Sim } from "@/components/sim";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-hidden"
      style={{
        background:
          "linear-gradient(180deg, #5da9e0 0%, #87ceeb 40%, #a8d8a8 68%, #228B22 70%)",
      }}
    >
      <Sim />
    </main>
  );
}
