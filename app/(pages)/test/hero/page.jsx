import HeroDesignA from "@/components/shared/home/HeroDesignA";
import HeroDesignB from "@/components/shared/home/HeroDesignB";

export const metadata = {
  title: "Hero Test — Carmel Mart",
  robots: { index: false },
};

function Label({ letter, title, description }) {
  return (
    <div className="bg-gray-950 border-y border-gray-800 px-8 py-4 flex items-center gap-4">
      <span className="w-8 h-8 rounded-full bg-gray-800 text-white text-sm font-bold flex items-center justify-center shrink-0">
        {letter}
      </span>
      <div>
        <p className="text-white text-sm font-bold">{title}</p>
        <p className="text-gray-500 text-xs">{description}</p>
      </div>
    </div>
  );
}

export default function HeroTestPage() {
  return (
    <main className="bg-gray-950">
      <Label
        letter="A"
        title="Diagonal Split"
        description="Solid brand panel with diagonal edge, full-bleed image, text-only category strip"
      />
      <HeroDesignA />

      <Label
        letter="B"
        title="Feature Card Gallery"
        description="Three portrait cards on a dark stage — center card is spotlit with info panel inside"
      />
      <HeroDesignB />
    </main>
  );
}
