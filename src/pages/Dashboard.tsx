import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { 
  Globe, Home, Download, Calendar, 
  TrendingUp, DollarSign, Users, Heart, 
  Leaf, Send, ChevronRight 
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartPoint { year: string; value: number | null }

// --- Local cache helpers (simple localStorage with TTL) ---
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
function cacheKey(parts: Record<string, string>) {
  return `imf:${parts.dataset}:${parts.code}:${parts.refArea}:${parts.start}:${parts.end}:${parts.freq}`;
}
function loadCache(key: string): ChartPoint[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.t > CACHE_TTL_MS) return null;
    return Array.isArray(parsed.d) ? parsed.d : null;
  } catch {
    return null;
  }
}
function saveCache(key: string, data: ChartPoint[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data }));
  } catch {}
}

// Map UI frequency to SDMX letters (used for cache key and future SDMX v3 calls)
const FREQ_LETTER: Record<string, string> = { Monthly: "M", Quarterly: "Q", Yearly: "A" };

// Many of the original indicator codes actually belong to the WEO (World Economic Outlook) dataset, not IFS.
// We map each human-readable indicator to both an IMF code and its dataset to reduce empty responses.
// NOTE: Codes are best-effort and may need refinement after validating against IMF metadata.
const INDICATOR_DEFINITIONS: Record<string, { code: string; dataset: string }> = {
  "GDP (Current Prices, USD)": { code: "NGDPD", dataset: "WEO" },
  "Real GDP Growth (Annual %)": { code: "NGDP_RPCH", dataset: "WEO" },
  "GDP per capita (USD)": { code: "NGDPDPC", dataset: "WEO" },
  "Inflation Rate (CPI)": { code: "PCPI_IX", dataset: "WEO" },
  // Placeholders below – need proper code/dataset verification
  "GNI per capita": { code: "NGNI_PC", dataset: "WEO" }, // tentative
  "Industrial Production (% change)": { code: "IPI_RPCH", dataset: "IFS" }, // example IFS-style placeholder
  "Producer Price Index": { code: "PPPI_IX", dataset: "WEO" },
  "Central Bank Policy Rate": { code: "FPOLM_PA", dataset: "IFS" },
  "Government Gross Debt (% of GDP)": { code: "GGXWDG_NGDP", dataset: "WEO" },
  "Stock Market Index": { code: "STOCK_IX", dataset: "IFS" },
  "Unemployment Rate": { code: "LUR_PT", dataset: "WEO" },
  "Youth Unemployment Rate": { code: "LURY_PT", dataset: "WEO" },
  "Population, Total": { code: "LP", dataset: "WEO" },
  "Population Growth (Annual %)": { code: "LP_RPCH", dataset: "WEO" },
  "Gini Index": { code: "GINI", dataset: "WEO" },
  "Life Expectancy at Birth": { code: "LE", dataset: "WEO" },
  "Maternal Mortality Ratio": { code: "MATMORT", dataset: "WEO" },
  "Child Mortality Rate": { code: "CHILDMORT", dataset: "WEO" },
  "Health Expenditure (% of GDP)": { code: "HEXP_NGDP", dataset: "WEO" },
  "Hospital Beds (per 1,000)": { code: "HOSPBEDS_PT", dataset: "WEO" },
  "CO2 Emissions (per capita)": { code: "EN_ATM_CO2E_PC", dataset: "WEO" },
  "Renewable Energy Consumption": { code: "RENEW_EN", dataset: "WEO" },
  "Access to Electricity": { code: "ELEC_ACCESS_PT", dataset: "WEO" },
  "Forest Area (% of land)": { code: "FOREST_PT", dataset: "WEO" },
  "Air Pollution (PM2.5)": { code: "PM25", dataset: "WEO" },
};

const indicators = [
  {
    category: "Economy",
    icon: TrendingUp,
    items: [
      "GDP (Current Prices, USD)",
      "Real GDP Growth (Annual %)",
      "GDP per capita (USD)",
      "GNI per capita",
      "Industrial Production (% change)",
    ]
  },
  {
    category: "Finance",
    icon: DollarSign,
    items: [
      "Inflation Rate (CPI)",
      "Producer Price Index",
      "Central Bank Policy Rate",
      "Government Gross Debt (% of GDP)",
      "Stock Market Index",
    ]
  },
  {
    category: "Social",
    icon: Users,
    items: [
      "Unemployment Rate",
      "Youth Unemployment Rate",
      "Population, Total",
      "Population Growth (Annual %)",
      "Gini Index",
    ]
  },
  {
    category: "Medical",
    icon: Heart,
    items: [
      "Life Expectancy at Birth",
      "Maternal Mortality Ratio",
      "Child Mortality Rate",
      "Health Expenditure (% of GDP)",
      "Hospital Beds (per 1,000)",
    ]
  },
  {
    category: "Nature",
    icon: Leaf,
    items: [
      "CO2 Emissions (per capita)",
      "Renewable Energy Consumption",
      "Access to Electricity",
      "Forest Area (% of land)",
      "Air Pollution (PM2.5)",
    ]
  },
];

const Dashboard = () => {
  const { countryCode } = useParams();
  const navigate = useNavigate();
  const [selectedIndicator, setSelectedIndicator] = useState("GDP (Current Prices, USD)");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("5Y");
  const [frequency, setFrequency] = useState("Yearly");
  const [chatMessage, setChatMessage] = useState("");
  const [includeGraphData, setIncludeGraphData] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>("Economy");

  const countryName = countryCode === "USA" ? "United States" : countryCode || "Unknown";

  // Resolve reference area code (IMF often expects 2-letter; we pass the route param and let server attempt conversion).
  const refArea = (countryCode || "US").toUpperCase();

  const { code: indicatorCode, dataset } = INDICATOR_DEFINITIONS[selectedIndicator] || { code: "PCPI_IX", dataset: "WEO" };

  useEffect(() => {
    let abort = false;
    // derive time window
    const nowYear = new Date().getFullYear();
    const endP = String(nowYear);
    const startP = (() => {
      switch (timeRange) {
        case "1Y": return String(nowYear - 1);
        case "3Y": return String(nowYear - 3);
        case "5Y": return String(nowYear - 5);
        case "10Y": return String(nowYear - 10);
        case "Max": default: return "1980";
      }
    })();

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
  const freqLetter = FREQ_LETTER[frequency] || "A";
  // WEO dataset is annual only; omit frequency in key for better compatibility.
  const key3 = dataset === "WEO" ? `${refArea}.${indicatorCode}` : `${freqLetter}.${refArea}.${indicatorCode}`;
        const params = new URLSearchParams({
          type: "data",
          resourceID: dataset,
          key: key3,
          startPeriod: startP,
          endPeriod: endP,
        });
        // pass client-side meta to the API for logging/diagnostics
        params.set("freq", freqLetter);
        params.set("indicatorLabel", selectedIndicator);
        params.set("timeRange", timeRange);
        params.set("clientTs", new Date().toISOString());
        const key = cacheKey({ dataset, code: indicatorCode, refArea, start: startP, end: endP, freq: freqLetter });
        const cached = loadCache(key);
        if (cached && !abort) {
          setChartData(cached);
          setLoading(false);
          return; // serve from cache
        }

        const res = await fetch(`/api/imf3?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to fetch IMF data: ${res.status}`);
        const json = await res.json();
        const points: ChartPoint[] = (json.data || []).map((p: any) => ({ year: p.date, value: p.value })) as ChartPoint[];
        if (!abort) {
          setChartData(points);
          if (points.length) saveCache(key, points);
          if (points.length === 0) {
            setError("No data available for the selected indicator.");
            toast({
              title: "No Data",
              description: `No ${selectedIndicator} data returned (dataset: ${dataset}, code: ${indicatorCode}, area: ${refArea}).`,
              variant: "destructive",
            });
          }
        }
      } catch (e: any) {
        if (!abort) {
          setError(e.message || "Unknown error");
          toast({
            title: "IMF Data Error",
            description: e.message || "Unknown error fetching data.",
            variant: "destructive",
          });
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }
    loadData();
    return () => { abort = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicatorCode, refArea, dataset, selectedIndicator, timeRange, frequency]);

  const handleDownloadCSV = () => {
    // Download CSV functionality
    console.log("Downloading CSV...");
  };

  const handleDownloadImage = () => {
    // Download image functionality
    console.log("Downloading image...");
  };

  const handleSendMessage = () => {
    // Send chat message
    console.log("Sending message:", chatMessage);
    setChatMessage("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Globe className="h-8 w-8 text-accent" />
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  AI Economy Forecaster
                </span>
              </button>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-lg font-semibold">{countryName}</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/map")}>
                <Globe className="h-4 w-4 mr-2" />
                Map
              </Button>
              <Button variant="ghost" onClick={() => navigate("/")}>
                <Home className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Indicators */}
        <aside className="w-80 border-r border-border bg-card/30 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold mb-2">Economic Indicators</h2>
            <p className="text-sm text-muted-foreground">Select an indicator to view</p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {indicators.map((category) => (
                <div key={category.category}>
                  <button
                    onClick={() => setOpenCategory(openCategory === category.category ? null : category.category)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <category.icon className="h-5 w-5 text-accent" />
                      <span className="font-medium">{category.category}</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${openCategory === category.category ? "rotate-90" : ""}`} />
                  </button>
                  
                  {openCategory === category.category && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="pl-4 space-y-1 mt-1"
                    >
                      {category.items.map((item) => (
                        <button
                          key={item}
                          onClick={() => setSelectedIndicator(item)}
                          className={`w-full text-left p-2 rounded text-sm transition-colors ${
                            selectedIndicator === item
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/10"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Graph Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{selectedIndicator}</h3>
                  <p className="text-sm text-muted-foreground">
                    Data retrieved on: {new Date().toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadImage}>
                    <Download className="h-4 w-4 mr-2" />
                    Image
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex gap-2">
                  {["1Y", "3Y", "5Y", "10Y", "Max"].map((range) => (
                    <Button
                      key={range}
                      size="sm"
                      variant={timeRange === range ? "default" : "outline"}
                      onClick={() => setTimeRange(range)}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex gap-2">
                  {["Monthly", "Quarterly", "Yearly"].map((freq) => (
                    <Button
                      key={freq}
                      size="sm"
                      variant={frequency === freq ? "default" : "outline"}
                      onClick={() => setFrequency(freq)}
                    >
                      {freq}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.length ? chartData : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="year" 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--accent))", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {loading && (
                <p className="text-xs text-muted-foreground mt-2">Loading IMF data…</p>
              )}
              {error && !loading && (
                <p className="text-xs text-destructive mt-2">{error}</p>
              )}
              {!loading && !error && chartData.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">No data available for the selected indicator.</p>
              )}
            </Card>

            {/* AI Chat Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">AI Economic Analyst</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeGraphData}
                    onChange={(e) => setIncludeGraphData(e.target.checked)}
                    className="rounded"
                  />
                  Include Graph Data
                </label>
              </div>

              <div className="space-y-4">
                <div className="min-h-[200px] p-4 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground text-sm">
                    Ask me anything about {countryName}'s economy, trends, or comparisons with other countries...
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about economic trends, forecasts, or insights..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
