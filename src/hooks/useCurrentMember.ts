import { useEffect, useState } from "react";
import { getCurrentMemberId, setCurrentMemberId } from "@/lib/store";

export const useCurrentMember = () => {
  const [memberId, setMemberId] = useState<string | null>(getCurrentMemberId());
  useEffect(() => {
    const handler = () => setMemberId(getCurrentMemberId());
    window.addEventListener("mgc-current-member-changed", handler);
    return () => window.removeEventListener("mgc-current-member-changed", handler);
  }, []);
  return { memberId, setMemberId: setCurrentMemberId };
};
