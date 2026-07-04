import { cn } from "@/lib/utils";

interface PageHeroProps {
  image: string;
  title: string;
  subtitle?: string;
  height?: "sm" | "md" | "lg";
  overlay?: boolean;
  children?: React.ReactNode;
}

export default function PageHero({
  image,
  title,
  subtitle,
  height = "md",
  overlay = true,
  children,
}: PageHeroProps) {
  const heights = { sm: "h-32", md: "h-44", lg: "h-56" };

  return (
    <div
      className={cn(
        "relative w-full rounded-xl overflow-hidden mb-6",
        heights[height]
      )}
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/80 via-neutral-950/50 to-transparent" />
      )}
      <div className="relative z-10 flex flex-col justify-center h-full px-6">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-neutral-300 mt-1 max-w-lg drop-shadow">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
