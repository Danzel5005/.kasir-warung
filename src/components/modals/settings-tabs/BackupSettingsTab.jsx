import BackupRestorePanel from "../../BackupRestorePanel.jsx";

// BackupSettingsTab — thin wrapper so the settings modal can render the
// standalone BackupRestorePanel through the same `{ settingsH, menu, cats }`
// prop contract as every other tab.
export function BackupSettingsTab({ settingsH }) {
  return <BackupRestorePanel toast_={settingsH?.toast_} />;
}
