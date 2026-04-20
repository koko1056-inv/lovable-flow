import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MemberAvatar({
  member,
  size = "md",
  className,
}: {
  member?: Member | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs", lg: "h-10 w-10 text-sm" };
  if (!member) {
    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center bg-muted text-muted-foreground border border-dashed",
          sizes[size],
          className,
        )}
        title="未割当"
      >
        ?
      </div>
    );
  }
  const initial = member.avatar || member.name.charAt(0);
  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-semibold text-white shrink-0", sizes[size], className)}
      style={{ backgroundColor: member.color }}
      title={member.name}
    >
      {initial}
    </div>
  );
}
