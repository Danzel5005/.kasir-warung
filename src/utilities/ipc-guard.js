// ipc-guard.js — turn raw Electron IPC failures into recoverable results.
//
// WHY THIS EXISTS
// The Electron MAIN process is not hot-reloaded. After editing electron/*.cjs
// the renderer may call an IPC channel that the *running* main process has
// never registered, and `ipcRenderer.invoke` rejects with:
//
//     Error invoking remote method 'backup-stats':
//     Error: No handler registered for 'backup-stats'
//
// That surfaces as an uncaught promise in the UI and looks like an application
// bug, sending you hunting for a problem that does not exist in the source.
//
// `safeIpc` wraps an invoke so the failure becomes a normal `{ ok:false }`
// result carrying a message that tells the user what is actually wrong
// (restart needed), and logs the technical detail once for debugging.

const NO_HANDLER_RE = /No handler registered for ['"]?([\w-]+)/i;

/**
 * True when the error means the running main process lacks the IPC handler —
 * i.e. the app needs a restart (typically because electron/*.cjs changed).
 */
export function isMissingHandlerError(error) {
  const msg = String(error?.message || error || "");
  return NO_HANDLER_RE.test(msg);
}

/**
 * Extract the channel name from a "No handler registered for 'x'" error.
 * Returns null when the error is unrelated.
 */
export function missingHandlerChannel(error) {
  const msg = String(error?.message || error || "");
  const m = msg.match(NO_HANDLER_RE);
  return m ? m[1] : null;
}

export const RESTART_HINT =
  "Aplikasi perlu dimulai ulang agar fitur ini aktif.";

/**
 * Run an async IPC call, converting failures into { ok:false, error, needsRestart }.
 *
 * @param {string} label   Human-readable name for logs / fallback messages.
 * @param {() => Promise<any>} fn   The call to guard.
 * @param {{ fallback?: any }} [opts]  Value shape to spread into the error result.
 * @returns {Promise<any>} the call result, or a structured error result.
 */
export async function safeIpc(label, fn, opts = {}) {
  try {
    return await fn();
  } catch (error) {
    const channel = missingHandlerChannel(error);
    if (channel) {
      // One concise line, not a wall of stack trace.
      console.warn(
        `[ipc] '${channel}' is not registered in the running main process. ` +
        `Restart the app (npm run electron:dev) to load the latest electron/*.cjs.`
      );
      return {
        ...opts.fallback,
        ok: false,
        needsRestart: true,
        error: `${RESTART_HINT} (${label}: handler '${channel}' belum terdaftar — mulai ulang aplikasi.)`,
      };
    }
    console.error(`[ipc] ${label} failed:`, error?.message || error);
    return {
      ...opts.fallback,
      ok: false,
      error: error?.message || `${label} gagal`,
    };
  }
}
