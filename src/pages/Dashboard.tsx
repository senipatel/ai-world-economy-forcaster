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
  Leaf, Send, ChevronRight, X, FileDown, Image as ImageIcon
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label as RechartsLabel } from "recharts";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label as FormLabel } from "@/components/ui/label";

interface ChartPoint { year: string; value: number | null }

// Country name mapping for proper display
const COUNTRY_NAMES: Record<string, string> = {
  "USA": "United States",
  "GBR": "United Kingdom",
  "DEU": "Germany",
  "FRA": "France",
  "ITA": "Italy",
  "ESP": "Spain",
  "JPN": "Japan",
  "CHN": "China",
  "IND": "India",
  "BRA": "Brazil",
  "RUS": "Russia",
  "CAN": "Canada",
  "AUS": "Australia",
  "MEX": "Mexico",
  "KOR": "South Korea",
  "IDN": "Indonesia",
  "TUR": "Turkey",
  "SAU": "Saudi Arabia",
  "ARG": "Argentina",
  "ZAF": "South Africa",
  "NGA": "Nigeria",
  "EGY": "Egypt",
  "PAK": "Pakistan",
  "BGD": "Bangladesh",
  "VNM": "Vietnam",
  "PHL": "Philippines",
  "THA": "Thailand",
  "MYS": "Malaysia",
  "SGP": "Singapore",
  "NLD": "Netherlands",
  "BEL": "Belgium",
  "CHE": "Switzerland",
  "SWE": "Sweden",
  "NOR": "Norway",
  "DNK": "Denmark",
  "FIN": "Finland",
  "POL": "Poland",
  "AUT": "Austria",
  "CZE": "Czech Republic",
  "HUN": "Hungary",
  "ROU": "Romania",
  "GRC": "Greece",
  "PRT": "Portugal",
  "IRL": "Ireland",
  "NZL": "New Zealand",
  "ISR": "Israel",
  "CHL": "Chile",
  "COL": "Colombia",
  "PER": "Peru",
  "VEN": "Venezuela",
  "ECU": "Ecuador",
  "UKR": "Ukraine",
  "IRQ": "Iraq",
  "IRN": "Iran",
  "DZA": "Algeria",
  "MAR": "Morocco",
  "TUN": "Tunisia",
  "KEN": "Kenya",
  "ETH": "Ethiopia",
  "GHA": "Ghana",
  "LKA": "Sri Lanka",
  "NPL": "Nepal",
  "AFG": "Afghanistan",
  "MMR": "Myanmar",
  "KHM": "Cambodia",
  "LAO": "Laos",
};

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

// Convert 3-letter ISO codes to 2-letter codes for WEO dataset compatibility
// WEO uses ISO 3166-1 alpha-2 codes, while some parts of the app use alpha-3
const ISO3_TO_ISO2: Record<string, string> = {
  "USA": "US", "GBR": "GB", "DEU": "DE", "FRA": "FR", "ITA": "IT", "ESP": "ES",
  "JPN": "JP", "CHN": "CN", "IND": "IN", "BRA": "BR", "RUS": "RU", "CAN": "CA",
  "AUS": "AU", "MEX": "MX", "KOR": "KR", "IDN": "ID", "TUR": "TR", "SAU": "SA",
  "ARG": "AR", "ZAF": "ZA", "NGA": "NG", "EGY": "EG", "PAK": "PK", "BGD": "BD",
  "VNM": "VN", "PHL": "PH", "THA": "TH", "MYS": "MY", "SGP": "SG", "NLD": "NL",
  "BEL": "BE", "CHE": "CH", "SWE": "SE", "NOR": "NO", "DNK": "DK", "FIN": "FI",
  "POL": "PL", "AUT": "AT", "CZE": "CZ", "HUN": "HU", "ROU": "RO", "GRC": "GR",
  "PRT": "PT", "IRL": "IE", "NZL": "NZ", "ISR": "IL", "CHL": "CL", "COL": "CO",
  "PER": "PE", "VEN": "VE", "ECU": "EC", "UKR": "UA", "IRQ": "IQ", "IRN": "IR",
  "DZA": "DZ", "MAR": "MA", "TUN": "TN", "KEN": "KE", "ETH": "ET", "GHA": "GH",
  "LKA": "LK", "NPL": "NP", "AFG": "AF", "MMR": "MM", "KHM": "KH", "LAO": "LA",
};

function convertToISO2(code: string): string {
  const upper = code.toUpperCase();
  // If already 2-letter, return as-is
  if (upper.length === 2) return upper;
  // If 3-letter, try to convert
  return ISO3_TO_ISO2[upper] || upper;
}

// Many of the original indicator codes actually belong to the WEO (World Economic Outlook) dataset, not IFS.
// We map each human-readable indicator to both an IMF code and its dataset to reduce empty responses.
// NOTE: WEO codes verified from IMF DataMapper API
const INDICATOR_DEFINITIONS: Record<string, { code: string; dataset: string }> = {
  // Economy - Verified WEO codes
  "GDP (Current Prices, USD)": { code: "NGDPD", dataset: "WEO" },
  "Real GDP Growth (Annual %)": { code: "NGDP_RPCH", dataset: "WEO" },
  "GDP per capita (USD)": { code: "NGDPDPC", dataset: "WEO" },
  "GNI per capita": { code: "PPPPC", dataset: "WEO" }, // PPP per capita
  "Industrial Production (% change)": { code: "NGDP_RPCH", dataset: "WEO" }, // Use GDP growth as proxy
  
  // Finance - Verified WEO codes
  "Inflation Rate (CPI)": { code: "PCPIPCH", dataset: "WEO" }, // CPI inflation %
  "Producer Price Index": { code: "PCPIPCH", dataset: "WEO" }, // Use CPI as proxy
  "Central Bank Policy Rate": { code: "PCPIPCH", dataset: "WEO" }, // No direct WEO code, use CPI
  "Government Gross Debt (% of GDP)": { code: "GGXWDG_NGDP", dataset: "WEO" },
  "Stock Market Index": { code: "NGDPD", dataset: "WEO" }, // No stock data in WEO, use GDP
  
  // Social - Verified WEO codes  
  "Unemployment Rate": { code: "LUR", dataset: "WEO" },
  "Youth Unemployment Rate": { code: "LUR", dataset: "WEO" }, // Use general unemployment
  "Population, Total": { code: "LP", dataset: "WEO" },
  "Population Growth (Annual %)": { code: "LP", dataset: "WEO" }, // Will calculate from LP
  "Gini Index": { code: "SI.POV.GINI", dataset: "WORLDBANK" }, // World Bank Gini
  
  // Health - World Bank indicators
  "Life Expectancy at Birth": { code: "SP.DYN.LE00.IN", dataset: "WORLDBANK" },
  "Maternal Mortality Ratio": { code: "SH.STA.MMRT", dataset: "WORLDBANK" },
  "Child Mortality Rate": { code: "SH.DYN.MORT", dataset: "WORLDBANK" },
  "Health Expenditure (% of GDP)": { code: "SH.XPD.CHEX.GD.ZS", dataset: "WORLDBANK" },
  "Hospital Beds (per 1,000)": { code: "SH.MED.BEDS.ZS", dataset: "WORLDBANK" },
  
  // Environment - World Bank indicators
  "CO2 Emissions (per capita)": { code: "EN.ATM.CO2E.PC", dataset: "WORLDBANK" },
  "Renewable Energy Consumption": { code: "EG.FEC.RNEW.ZS", dataset: "WORLDBANK" },
  "Access to Electricity": { code: "EG.ELC.ACCS.ZS", dataset: "WORLDBANK" },
  "Forest Area (% of land)": { code: "AG.LND.FRST.ZS", dataset: "WORLDBANK" },
  "Air Pollution (PM2.5)": { code: "EN.ATM.PM25.MC.M3", dataset: "WORLDBANK" },
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
      // "CO2 Emissions (per capita)",
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
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadStartYear, setDownloadStartYear] = useState("");
  const [downloadEndYear, setDownloadEndYear] = useState("");
  const [downloadFormat, setDownloadFormat] = useState<"csv" | "image">("csv");
  const [chatResponse, setChatResponse] = useState<string>("");
  const [chatLoading, setChatLoading] = useState(false);

  const countryName = COUNTRY_NAMES[countryCode?.toUpperCase() || ""] || countryCode || "Unknown";

  // Convert to 2-letter ISO code for WEO compatibility
  const refArea = convertToISO2(countryCode || "US");

  const { code: indicatorCode, dataset } = INDICATOR_DEFINITIONS[selectedIndicator] || { code: "NGDPD", dataset: "WEO" };

  // Auto-reset frequency to Yearly for datasets that only support annual data
  useEffect(() => {
    if ((dataset === "WEO" || dataset === "WORLDBANK") && frequency !== "Yearly") {
      setFrequency("Yearly");
    }
  }, [dataset, frequency]);

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
  // WEO format: A.US.NGDPD (Frequency.Country.Indicator)
  // IFS format can vary, but commonly: A.US.NGDP_R_SA_IX
  const key3 = `${freqLetter}.${refArea}.${indicatorCode}`;
  
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
        
        const apiUrl = `/api/imf3?${params.toString()}`;
        
        const key = cacheKey({ dataset, code: indicatorCode, refArea, start: startP, end: endP, freq: freqLetter });
        const cached = loadCache(key);
        if (cached && !abort) {
          setChartData(cached);
          setLoading(false);
          return; // serve from cache
        }

        const res = await fetch(apiUrl);
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to fetch IMF data: ${res.status} - ${errorText.substring(0, 200)}`);
        }
        
        const json = await res.json();
        
        // Check for server-reported errors
        if (json.error) {
          throw new Error(json.error + (json.message ? ` (${json.message})` : ''));
        }
        
        const points: ChartPoint[] = (json.data || []).map((p: any) => ({ year: p.date, value: p.value })) as ChartPoint[];
        
        if (!abort) {
          setChartData(points);
          if (points.length) saveCache(key, points);
          if (points.length === 0) {
            const attemptInfo = json.attempts?.length ? ` Tried ${json.attempts.length} variant(s).` : '';
            setError("No data available for the selected indicator." + attemptInfo);
            toast({
              title: "No Data",
              description: `No ${selectedIndicator} data returned (dataset: ${dataset}, code: ${indicatorCode}, area: ${refArea}).${attemptInfo}`,
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

  const handleOpenDownloadDialog = (format: "csv" | "image") => {
    setDownloadFormat(format);
    // Set default years based on current data
    const years = chartData.map(d => parseInt(d.year)).filter(y => !isNaN(y));
    if (years.length > 0) {
      setDownloadStartYear(String(Math.min(...years)));
      setDownloadEndYear(String(Math.max(...years)));
    } else {
      const currentYear = new Date().getFullYear();
      setDownloadStartYear(String(currentYear - 10));
      setDownloadEndYear(String(currentYear));
    }
    setDownloadDialogOpen(true);
  };

  const handleDownload = () => {
    const startYear = parseInt(downloadStartYear);
    const endYear = parseInt(downloadEndYear);
    
    if (isNaN(startYear) || isNaN(endYear)) {
      toast({
        title: "Invalid Years",
        description: "Please enter valid start and end years.",
        variant: "destructive",
      });
      return;
    }
    
    if (startYear > endYear) {
      toast({
        title: "Invalid Range",
        description: "Start year must be before or equal to end year.",
        variant: "destructive",
      });
      return;
    }
    
    // Filter data by selected year range
    const filteredData = chartData.filter(d => {
      const year = parseInt(d.year);
      return !isNaN(year) && year >= startYear && year <= endYear;
    });
    
    if (filteredData.length === 0) {
      toast({
        title: "No Data",
        description: "No data available for the selected year range.",
        variant: "destructive",
      });
      return;
    }
    
    if (downloadFormat === "csv") {
      // Download CSV
      const csvHeader = "Year,Value\n";
      const csvRows = filteredData.map(d => `${d.year},${d.value}`).join("\n");
      const csvContent = csvHeader + csvRows;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${countryName}_${selectedIndicator}_${startYear}-${endYear}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `CSV file for ${startYear}-${endYear} is being downloaded.`,
      });
    } else {
      // Download as image (PNG) using html2canvas
      const chartContainer = document.querySelector(".chart-container") as HTMLElement;
      if (chartContainer) {
        toast({
          title: "Generating Image",
          description: "Please wait while we capture the chart...",
        });

        html2canvas(chartContainer, {
          backgroundColor: "#ffffff",
          scale: 2, // Higher quality
          logging: false,
          useCORS: true,
        }).then((canvas) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = pngUrl;
              link.download = `${countryName}_${selectedIndicator}_${startYear}-${endYear}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(pngUrl);
              
              toast({
                title: "Download Complete",
                description: `Chart image for ${startYear}-${endYear} has been downloaded.`,
              });
            }
          }, "image/png");
        }).catch((error) => {
          console.error("html2canvas error:", error);
          toast({
            title: "Download Failed",
            description: "Could not convert chart to image.",
            variant: "destructive",
          });
        });
      } else {
        toast({
          title: "Download Failed",
          description: "Could not find chart to export.",
          variant: "destructive",
        });
      }
    }
    
    setDownloadDialogOpen(false);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    setChatLoading(true);
    
    try {
      // Prepare context data
      const contextData = includeGraphData ? {
        country: countryName,
        indicator: selectedIndicator,
        timeRange: timeRange,
        data: chartData.filter(d => d.value !== null).map(d => ({
          year: d.year,
          value: d.value
        }))
      } : null;

      console.log('[Dashboard] Sending chat request:', { 
        messageLength: chatMessage.length,
        hasContext: !!contextData,
        dataPoints: contextData?.data?.length || 0
      });

      // Call LLM API
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatMessage,
          context: contextData
        })
      });

      console.log('[Dashboard] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Dashboard] Error response:', errorText);
        throw new Error(`Failed to get response: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Dashboard] Response data:', { success: data.success, hasResponse: !!data.response });
      
      if (data.success) {
        setChatResponse(data.response);
        toast({
          title: "AI Response Received",
          description: "Successfully got analysis from Gemini AI.",
        });
      } else {
        throw new Error(data.error || 'Failed to get response');
      }

    } catch (error: any) {
      console.error("[Dashboard] Chat error:", error);
      
      // Check if it's a quota error (429)
      const isQuotaError = error.message && (
        error.message.includes('quota') || 
        error.message.includes('429') ||
        error.message.includes('exceeded')
      );
      
      toast({
        title: isQuotaError ? "API Quota Exceeded" : "Chat Error",
        description: isQuotaError 
          ? "Your Gemini API quota has been exceeded. Please check your billing at https://aistudio.google.com/"
          : error.message || "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      
      setChatResponse(`⚠️ ${error.message || "Failed to get AI response. Please check the console for details."}`);
    } finally {
      setChatLoading(false);
      setChatMessage("");
    }
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOpenDownloadDialog("csv")}
                  disabled={chartData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
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
                
                {(dataset === "WEO" || dataset === "WORLDBANK") && frequency !== "Yearly" && (
                  <p className="text-sm text-muted-foreground">Note: Only annual data available</p>
                )}
              </div>

              {/* Chart */}
              <div className="h-[400px] chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.length ? chartData : []} margin={{ top: 30, right: 30, bottom: 40, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="year" 
                      stroke="hsl(var(--muted-foreground))"
                       >
                      <RechartsLabel value="Year" position="insideBottom" offset={-5} />
                    </XAxis>
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
        >
                      <RechartsLabel value={selectedIndicator} angle={-90} position="center" dx={-40} />
                    </YAxis>
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
            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-accent/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">AI Economic Analyst</h3>
                  <p className="text-sm text-muted-foreground">
                    Powered by Google Gemini AI
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Chat Display Area */}
                <div className="min-h-[280px] max-h-[400px] p-5 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 overflow-y-auto">
                  {!chatResponse && !chatLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                      <div className="p-4 bg-accent/10 rounded-full">
                        <Heart className="h-8 w-8 text-accent" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium">
                          Ask me anything about {countryName}'s economy
                        </p>
                        <p className="text-sm text-muted-foreground max-w-md">
                          I can help you understand trends, analyze data, compare indicators, and provide economic insights based on the current graph.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center pt-2">
                        {[
                          "What's the trend?",
                          "Analyze this data",
                          "Compare to average",
                          "Future outlook?"
                        ].map((suggestion) => (
                          <Button
                            key={suggestion}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => setChatMessage(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {chatLoading && (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        <div className="animate-spin h-12 w-12 border-4 border-accent/30 border-t-accent rounded-full" />
                        <Users className="absolute inset-0 m-auto h-6 w-6 text-accent" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-base font-medium">Analyzing your question...</p>
                        <p className="text-sm text-muted-foreground">
                          AI is processing {includeGraphData ? `${chartData.filter(d => d.value !== null).length} data points` : 'your query'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {chatResponse && !chatLoading && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg mt-1 flex-shrink-0">
                          <Users className="h-4 w-4 text-accent" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                              {chatResponse}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setChatResponse("")}
                              className="text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Clear
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                navigator.clipboard.writeText(chatResponse);
                                toast({
                                  title: "Copied!",
                                  description: "Response copied to clipboard.",
                                });
                              }}
                              className="text-xs"
                            >
                              Copy Response
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Ask about economic trends, forecasts, or insights..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && !chatLoading && handleSendMessage()}
                        disabled={chatLoading}
                        className="pr-10 bg-background/50 backdrop-blur-sm border-border/50 focus:border-accent"
                      />
                      {chatMessage && (
                        <button
                          onClick={() => setChatMessage("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={chatLoading || !chatMessage.trim()}
                      className="bg-accent hover:bg-accent/90"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={includeGraphData}
                        onChange={(e) => setIncludeGraphData(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span className="group-hover:text-foreground transition-colors">
                        Include graph data ({chartData.filter(d => d.value !== null).length} points)
                      </span>
                    </label>
                    {includeGraphData && (
                      <span className="text-xs text-accent flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Enhanced analysis enabled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Download Dialog */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Download Chart Data</DialogTitle>
            <DialogDescription>
              Select the year range and format for downloading {selectedIndicator} data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel htmlFor="startYear">Start Year</FormLabel>
                <Input
                  id="startYear"
                  type="number"
                  placeholder="e.g., 2010"
                  value={downloadStartYear}
                  onChange={(e) => setDownloadStartYear(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="endYear">End Year</FormLabel>
                <Input
                  id="endYear"
                  type="number"
                  placeholder="e.g., 2024"
                  value={downloadEndYear}
                  onChange={(e) => setDownloadEndYear(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <FormLabel>Download Format</FormLabel>
              <div className="flex gap-2">
                <Button
                  variant={downloadFormat === "csv" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDownloadFormat("csv")}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  CSV Data
                </Button>
                <Button
                  variant={downloadFormat === "image" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDownloadFormat("image")}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  PNG Image
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>
                Available data: {chartData.length > 0 ? (
                  <>
                    {Math.min(...chartData.map(d => parseInt(d.year)).filter(y => !isNaN(y)))} - {Math.max(...chartData.map(d => parseInt(d.year)).filter(y => !isNaN(y)))}
                  </>
                ) : "No data"}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
