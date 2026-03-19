// Haptic feedback utility
// Uses the Vibration API (supported on Chrome Android, Safari iOS 16.4+)
// Fails silently on unsupported browsers/desktop

function vibrate(pattern: number | number[]): void {
  try {
    if (navigator && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (_) {
    // Silently ignore - not supported
  }
}

/** Light tap - tab switches, selections, toggles */
export function hapticLight(): void {
  vibrate(10);
}

/** Medium tap - button presses, demon selection, form submit */
export function hapticMedium(): void {
  vibrate(25);
}

/** Success - quest completed, level up */
export function hapticSuccess(): void {
  vibrate([20, 50, 30]);
}

/** Fail - quest abandoned, penalty */
export function hapticFail(): void {
  vibrate([40, 30, 40]);
}

/** Heavy - delete, clear data */
export function hapticHeavy(): void {
  vibrate(50);
}
