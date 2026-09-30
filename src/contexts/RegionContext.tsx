"use client";
import React, { createContext, useContext, useState } from "react";

export type Region = "IN" | "EU" | "US" | "AU";

export interface RegionConfig {
  code: Region;
  name: string;
  currency: string;
  symbol: string;
}

export const REGIONS: Record<Region, RegionConfig> = {
  IN: { code: "IN", name: "India", currency: "INR", symbol: "₹" },
  EU: { code: "EU", name: "Europe", currency: "EUR", symbol: "€" },
  US: { code: "US", name: "USA", currency: "USD", symbol: "$" },
  AU: { code: "AU", name: "Australia", currency: "AUD", symbol: "A$" },
};

interface RegionContextType {
  region: Region;
  setRegion: (region: Region) => void;
  config: RegionConfig;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export const RegionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [region, setRegion] = useState<Region>("IN");

  const value: RegionContextType = {
    region,
    setRegion,
    config: REGIONS[region],
  };

  return (
    <RegionContext.Provider value={value}>
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error("useRegion must be used within RegionProvider");
  }
  return context;
};
