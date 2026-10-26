import type { EditorStore } from '@/store';

const LOCK = 'resume-builder:editor';
const STEAL_FLAG = 'resume-builder:take-over';
/** How long a new tab waits for the lock before deciding another tab is editing (covers a reload's hand-off). */
const WAIT_MS = 1500;
/** After stealing, give the old tab a moment to flush its last edits before this tab reads storage. */
const HANDOFF_MS = 400;

const forever = () => new Promise<never>(() => undefined);

/**
 * One editing tab at a time (Web Locks). Resolves once this tab knows whether it holds the lock, so storage loads
 * only after a take-over has let the other tab flush. A tab that loses the lock (stolen) flushes and shows the
 * guard; a tab without the lock picks it up (by reloading) when the editing tab closes. Where Web Locks are
 * missing, every tab edits, as before M7.
 */
export async function claimEditorLock(store: EditorStore, onLost: () => void): Promise<void> {
  if (!('locks' in navigator)) {
    store.setTabState('active');
    return;
  }
  const steal = sessionStorage.getItem(STEAL_FLAG) === '1';
  sessionStorage.removeItem(STEAL_FLAG);
  let settled = false;
  const mine = await new Promise<boolean>((settle) => {
    const options: LockOptions = steal ? { steal: true } : { signal: AbortSignal.timeout(WAIT_MS) };
    navigator.locks
      .request(LOCK, options, () => {
        settled = true;
        settle(true);
        return forever();
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          settle(false); // timed out: another tab is editing
          return;
        }
        store.setTabState('elsewhere'); // stolen by a newer tab
        onLost();
        waitForEditorLock();
      });
  });
  store.setTabState(mine ? 'active' : 'elsewhere');
  if (!mine) waitForEditorLock();
  if (mine && steal) await new Promise((r) => setTimeout(r, HANDOFF_MS));
}

/** "Use this tab instead": reload and steal the lock on the way up. */
export function takeOverEditor(): void {
  sessionStorage.setItem(STEAL_FLAG, '1');
  location.reload();
}

/** Queue for the lock; when the editing tab closes, reload to read what it saved and edit here. */
function waitForEditorLock(): void {
  void navigator.locks.request(LOCK, () => {
    location.reload();
    return forever();
  });
}
