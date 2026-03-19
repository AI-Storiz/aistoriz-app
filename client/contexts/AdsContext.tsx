import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl, apiRequest } from "@/lib/query-client";

interface Ad {
  id: number;
  type: string;
  title: string;
  content: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
}

interface AdsContextType {
  textAd: Ad | null;
  bannerAd: Ad | null;
  isLoading: boolean;
  recordImpression: (adId: number) => void;
  refreshAds: () => void;
}

const AdsContext = createContext<AdsContextType | undefined>(undefined);

export function AdsProvider({ children }: { children: ReactNode }) {
  const { token, user, isLoading: authLoading } = useAuth();
  const [textAd, setTextAd] = useState<Ad | null>(null);
  const [bannerAd, setBannerAd] = useState<Ad | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recordedImpressions, setRecordedImpressions] = useState<Set<number>>(new Set());
  const [hasFetched, setHasFetched] = useState(false);

  const fetchAds = useCallback(async () => {
    if (!token || authLoading) {
      if (!authLoading) setIsLoading(false);
      return;
    }

    try {
      const [textResponse, bannerResponse] = await Promise.all([
        fetch(new URL("/api/ads?type=text", getApiUrl()).toString(), {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        }),
        fetch(new URL("/api/ads?type=banner", getApiUrl()).toString(), {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        }),
      ]);

      if (textResponse.ok) {
        const textData = await textResponse.json();
        setTextAd(textData.ad || null);
      }

      if (bannerResponse.ok) {
        const bannerData = await bannerResponse.json();
        setBannerAd(bannerData.ad || null);
      }
    } catch (error) {
      console.error("Failed to fetch ads:", error);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [token, authLoading]);

  useEffect(() => {
    if (!hasFetched && token && !authLoading) {
      fetchAds();
    }
  }, [fetchAds, hasFetched, token, authLoading]);

  const recordImpression = useCallback((adId: number) => {
    if (recordedImpressions.has(adId) || !token) return;
    
    setRecordedImpressions(prev => new Set(prev).add(adId));
    fetch(new URL("/api/ads/impression", getApiUrl()).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ adId }),
    }).catch(console.error);
  }, [recordedImpressions, token]);

  const refreshAds = useCallback(() => {
    setRecordedImpressions(new Set());
    fetchAds();
  }, [fetchAds]);

  return (
    <AdsContext.Provider value={{ textAd, bannerAd, isLoading, recordImpression, refreshAds }}>
      {children}
    </AdsContext.Provider>
  );
}

export function useAds(): AdsContextType {
  const context = useContext(AdsContext);
  if (context === undefined) {
    return {
      textAd: null,
      bannerAd: null,
      isLoading: false,
      recordImpression: () => {},
      refreshAds: () => {},
    };
  }
  return context;
}
