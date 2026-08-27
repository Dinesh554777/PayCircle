import { useCallback, useEffect, useRef, useState } from "react";
import {
  isSoundEnabled,
  setSoundEnabled,
  playNotificationSound,
  unlockAudio,
} from "../utils/notificationSound";

/**
 * Hook that manages notification sound playback.
 *
 * - Tracks the previous unread count to detect NEW notifications.
 * - Plays a chime when the unread count increases.
 * - Handles browser autoplay policy by unlocking audio on first interaction.
 * - Exposes ON/OFF toggle backed by localStorage.
 */
export function useNotificationSound(unreadCount) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const prevCount = useRef(unreadCount);
  const unlocked = useRef(false);

  // Unlock audio on first user interaction (browser autoplay policy)
  useEffect(() => {
    if (unlocked.current) return;

    function handleInteraction() {
      if (!unlocked.current) {
        unlocked.current = true;
        unlockAudio();
      }
    }

    // Listen for the first click/tap/keydown anywhere
    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("keydown", handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { once: true });

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  // Detect new notifications and play sound
  useEffect(() => {
    if (unreadCount > prevCount.current) {
      playNotificationSound();
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      return next;
    });
  }, []);

  return { soundOn, toggleSound };
}
