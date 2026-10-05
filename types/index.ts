// Power Law calculation types
export interface PowerLawParams {
  coefficient: number;
  exponent: number;
}

export interface PowerLawDataPoint {
  date: Date;
  timestamp: number;
  days: number;
  fairPrice: number;
  supportPrice: number;
  resistancePrice: number;
}

// Historical Bitcoin price data
export interface PricePoint {
  date: string;
  price: number;
}

export interface PriceQuote {
  price: number;
  observedAt: string;
}

export interface HistoricalPricePoint extends PricePoint {
  daysSinceGenesis: number;
}

export interface HistoricalData {
  metadata: {
    lastUpdated: string;
    source: string;
    currency: string;
  };
  prices: HistoricalPricePoint[];
}

// Chart data point combining power law and actual prices
export interface ChartDataPoint {
  date: string;
  timestamp: number;
  days: number;
  fairPrice: number;
  supportPrice: number;
  resistancePrice: number;
  bandBase: number;
  bandWidth: number;
  actualPrice: number | null;
}

// App state
export interface DateRange {
  start: Date;
  end: Date;
}

export interface AppState {
  exponent: number;
  coefficient: number;
  isLogScale: boolean;
  dateRange: DateRange;
}

// Hook return types
export interface UseBitcoinPriceReturn {
  data: PricePoint[];
  quote: PriceQuote | null;
  isLoading: boolean;
  error: string | null;
  isUsingFallback: boolean;
  refetch: () => void;
  now: number;
}

export interface UseChartDataReturn {
  chartData: ChartDataPoint[];
  isLoading: boolean;
  error: string | null;
  currentPrice: number | null;
  currentFairPrice: number;
  observedAt: string | null;
  isStale: boolean;
  isUsingFallback: boolean;
  refetch: () => void;
}
