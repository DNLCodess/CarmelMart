import HeroV2 from "@/components/shared/home/HeroV2";

export const metadata = {
  title: "Hero Test — Carmel Mart",
  robots: { index: false },
};

export default function HeroTestPage() {
  return (
    <main>
      <HeroV2 />
    </main>
  );
}
