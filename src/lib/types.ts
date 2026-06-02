export type AssetType = "STOCK_KR" | "STOCK_US" | "CRYPTO" | "ETF" | "FUND";
export type TransactionType = "BUY" | "SELL" | "DIVIDEND";

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  STOCK_KR: "국내주식",
  STOCK_US: "해외주식",
  CRYPTO: "가상화폐",
  ETF: "ETF",
  FUND: "펀드",
};

export const ASSET_TYPE_COLOR: Record<AssetType, string> = {
  STOCK_KR: "#6366f1",
  STOCK_US: "#22c55e",
  CRYPTO: "#f59e0b",
  ETF: "#3b82f6",
  FUND: "#ec4899",
};

export interface MemberWithAssets {
  id: number;
  name: string;
  role: string | null;
  color: string;
  assets: AssetWithValue[];
  totalValue: number;
  totalCost: number;
  profitLoss: number;
  profitLossPct: number;
}

export interface AssetWithValue {
  id: number;
  memberId: number;
  memberName: string;
  type: AssetType;
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currency: string;
  currentPrice: number;
  currentValue: number;
  cost: number;
  profitLoss: number;
  profitLossPct: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  profitLoss: number;
  profitLossPct: number;
  memberCount: number;
  assetCount: number;
}
