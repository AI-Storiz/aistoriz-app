import { Platform } from "react-native";
import Constants from "expo-constants";

export type RewardedAdResult = "earned" | "dismissed" | "fallback";

/**
 * Shows a Google rewarded ad when running in a dev/production native build.
 * Returns `fallback` when ads are not available (Expo Go, web, or SDK error) so the app can use a timed placeholder instead.
 */
export async function showRewardedAd(): Promise<RewardedAdResult> {
  if (Platform.OS === "web") {
    return "fallback";
  }

  const isExpoGo = Constants.appOwnership === "expo";
  if (isExpoGo) {
    return "fallback";
  }

  try {
    const mobileAds = (await import("react-native-google-mobile-ads")).default;
    const {
      RewardedAd,
      RewardedAdEventType,
      TestIds,
      AdEventType,
    } = await import("react-native-google-mobile-ads");

    await mobileAds().initialize();

    const rewarded = RewardedAd.createForAdRequest(TestIds.REWARDED);

    return await new Promise<RewardedAdResult>((resolve) => {
      let earned = false;
      const unsubs: Array<() => void> = [];
      let settled = false;

      let timeout: ReturnType<typeof setTimeout>;
      const done = (result: RewardedAdResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        unsubs.forEach((u) => {
          try {
            u();
          } catch {
            /* ignore */
          }
        });
        resolve(result);
      };

      timeout = setTimeout(() => done("fallback"), 45000);

      unsubs.push(
        rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        }),
      );

      unsubs.push(
        rewarded.addAdEventListener(AdEventType.CLOSED, () => {
          done(earned ? "earned" : "dismissed");
        }),
      );

      unsubs.push(
        rewarded.addAdEventListener(AdEventType.ERROR, () => {
          done("fallback");
        }),
      );

      let unsubLoaded: (() => void) | undefined;
      unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        unsubLoaded?.();
        try {
          rewarded.show();
        } catch {
          done("fallback");
        }
      });
      unsubs.push(() => unsubLoaded?.());

      rewarded.load();
    });
  } catch {
    return "fallback";
  }
}
