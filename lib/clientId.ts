// Anonymous, per-TAB client id — aligned with the shared room-matching spec.
//
// The client id lives in sessionStorage (per-tab), NOT localStorage: localStorage
// is shared across tabs, so two tabs of one browser would collapse into a single
// seat — breaking multi-tab testing. sessionStorage survives in-tab reloads (so
// reconnect still works) but gives each tab a distinct player.
//
// The display name is remembered across sessions in localStorage.

const CLIENT_ID_KEY = "fb_client_id";
const NAME_KEY = "fb_player_name";

function newClientId(): string {
  return `c_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = window.sessionStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = newClientId();
    window.sessionStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function getSavedName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

export function saveName(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name);
}
