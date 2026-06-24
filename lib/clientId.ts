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

// When a player intentionally leaves a room we mark it here so the room page's
// link-based auto-join does not immediately re-seat them on the next realtime
// refresh (which can fire before the route change unmounts the page).
const LEFT_ROOM_KEY = "fb_left_room";

export function markRoomLeft(code: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LEFT_ROOM_KEY, code.toUpperCase());
}

/** True (and clears the flag) if this client just left the given room. */
export function consumeRoomLeft(code: string): boolean {
  if (typeof window === "undefined") return false;
  const left = window.sessionStorage.getItem(LEFT_ROOM_KEY) === code.toUpperCase();
  if (left) window.sessionStorage.removeItem(LEFT_ROOM_KEY);
  return left;
}
