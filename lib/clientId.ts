// Stable per-browser client id, persisted in localStorage.
// No login required for the MVP — this id identifies a player across reloads.

const CLIENT_ID_KEY = "fb_client_id";
const NAME_KEY = "fb_player_name";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = randomId();
    window.localStorage.setItem(CLIENT_ID_KEY, id);
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
