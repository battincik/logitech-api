import type { BatteryEvent, BatteryPayload, StoredBatteryState } from "./types";

export const LOW_BATTERY_THRESHOLDS = [20, 10, 5, 3] as const;

export function initialStoredState(payload: BatteryPayload): StoredBatteryState {
  return {
    percentage: payload.percentage,
    charging: Boolean(payload.charging),
    fullyCharged: Boolean(payload.fullyCharged || payload.percentage >= 100),
    notifiedThresholds: [],
    emptyNotified: payload.percentage <= 0,
  };
}

export function detectBatteryEvents(
  previous: StoredBatteryState | undefined,
  current: BatteryPayload,
): { state: StoredBatteryState; events: BatteryEvent[] } {
  if (!previous) {
    return {
      state: initialStoredState(current),
      events: current.charging
        ? [{ type: "charging", percentage: Math.max(0, Math.min(100, Math.round(current.percentage))) }]
        : [],
    };
  }

  const percentage = Math.max(0, Math.min(100, Math.round(current.percentage)));
  const charging = Boolean(current.charging);
  const fullyCharged = Boolean(current.fullyCharged || percentage >= 100);
  const events: BatteryEvent[] = [];

  let notifiedThresholds = [...previous.notifiedThresholds];
  let emptyNotified = previous.emptyNotified;

  if (!previous.charging && charging) {
    events.push({ type: "charging", percentage });
    notifiedThresholds = [];
    emptyNotified = false;
  }

  if (fullyCharged && !previous.fullyCharged) {
    events.push({ type: "full", percentage });
  }

  if (!charging && percentage < previous.percentage) {
    if (percentage <= 0 && !emptyNotified) {
      events.push({ type: "empty", percentage: 0 });
      emptyNotified = true;
      notifiedThresholds = [...LOW_BATTERY_THRESHOLDS];
    } else {
      const reached = LOW_BATTERY_THRESHOLDS.filter(
        (threshold) =>
          percentage <= threshold &&
          previous.percentage > threshold &&
          !notifiedThresholds.includes(threshold),
      );

      if (reached.length > 0) {
        const mostCritical = Math.min(...reached);
        events.push({
          type: "low",
          percentage,
          threshold: mostCritical,
        });
        notifiedThresholds = [
          ...new Set([...notifiedThresholds, ...reached]),
        ];
      }
    }
  }

  return {
    state: {
      percentage,
      charging,
      fullyCharged,
      notifiedThresholds,
      emptyNotified,
    },
    events,
  };
}
