// Simple "current user" store — since there's no auth, the user picks their identity.
const KEY = "mgc_current_member_id";

export const getCurrentMemberId = (): string | null => {
  return localStorage.getItem(KEY);
};

export const setCurrentMemberId = (id: string | null) => {
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("mgc-current-member-changed"));
};
