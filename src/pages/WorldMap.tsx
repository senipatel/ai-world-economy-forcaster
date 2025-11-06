import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Globe, Search, Home, BarChart3, X } from "lucide-react";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryInfo {
  name: string;
  code: string;
  region: string;
  population: string;
  capital: string;
  currency: string;
}

const WorldMap = () => {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [selectedNumericId, setSelectedNumericId] = useState<string | null>(null);
  const [selectedCountryDetails, setSelectedCountryDetails] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{x: number; y: number}>({ x: 0, y: 0 });
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [countryNames, setCountryNames] = useState<string[]>([]);
  const [ccn3ToMeta, setCcn3ToMeta] = useState<Record<string, { cca3?: string; name?: string }>>({});
  const [nameToCcn3, setNameToCcn3] = useState<Record<string, string>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Sample country data (in production, this would come from a database)
  const countryData: Record<string, CountryInfo> = {
    USA: {
      name: "United States",
      code: "USA",
      region: "North America",
      population: "331.9M",
      capital: "Washington, D.C.",
      currency: "USD"
    },
    GBR: {
      name: "United Kingdom",
      code: "GBR",
      region: "Europe",
      population: "67.3M",
      capital: "London",
      currency: "GBP"
    },
    // Add more countries as needed
  };

  const handleCountryClick = (geo: any) => {
    const countryId = String(geo.id);
    const countryInfo = {
      name: geo.properties.name as string,
      code: countryId,
      region: "Unknown",
      population: "N/A",
      capital: "N/A",
      currency: "N/A",
    } as CountryInfo;

    // Show static data immediately
    setSelectedCountry(countryInfo);
    setSelectedNumericId(countryId);
    setSelectedCountryDetails(null);

    // If we can map to cca3, fetch live details + GDP asynchronously
    const meta = ccn3ToMeta[countryId];
    if (meta?.cca3) {
      fetchCountryDetails(meta.cca3);
    }
  };

  // Load topojson and Rest Countries metadata to enable suggestions and detailed lookups
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [topoRes, countriesRes] = await Promise.all([
          fetch(geoUrl),
          fetch("https://restcountries.com/v3.1/all?fields=name,cca3,ccn3,region")
        ]);

        const topo = await topoRes.json();
        // extract country names from topojson
        const objs = topo.objects || {};
        const firstKey = Object.keys(objs)[0];
        const geoms = firstKey ? (objs as any)[firstKey].geometries : [];
        const names: string[] = geoms.map((g: any) => g.properties?.name).filter(Boolean);

        const countries = await countriesRes.json();
        const ccn3Map: Record<string, { cca3?: string; name?: string }> = {};
        const nToCcn3: Record<string, string> = {};
        countries.forEach((c: any) => {
          if (c.ccn3) {
            ccn3Map[String(c.ccn3)] = { cca3: c.cca3, name: c.name?.common };
            if (c.name?.common) nToCcn3[c.name.common] = String(c.ccn3);
          }
        });

        if (mounted) {
          setCountryNames(names.sort());
          setCcn3ToMeta(ccn3Map);
          setNameToCcn3(nToCcn3);
        }
      } catch (e) {
        // silently ignore; suggestions will degrade gracefully
        // console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchCountryDetails = async (cca3: string | undefined) => {
    if (!cca3) return;
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`https://restcountries.com/v3.1/alpha/${cca3}`);
      if (!res.ok) throw new Error("Failed to load country details");
      const data = await res.json();
      const detail = data && data[0] ? data[0] : data;
      // Try to fetch latest GDP from World Bank using ISO2 code
      try {
        const iso2 = detail.cca2 ? String(detail.cca2).toLowerCase() : undefined;
        if (iso2) {
          const wb = await fetch(`https://api.worldbank.org/v2/country/${iso2}/indicator/NY.GDP.MKTP.CD?format=json&per_page=1`);
          if (wb.ok) {
            const wbData = await wb.json();
            // wbData is usually [meta, [ { value, date } ]]
            const gdpValue = Array.isArray(wbData) && Array.isArray(wbData[1]) && wbData[1][0] ? wbData[1][0].value : null;
            detail.gdp = gdpValue;
          } else {
            detail.gdp = null;
          }
        } else {
          detail.gdp = null;
        }
      } catch (e) {
        detail.gdp = null;
      }
      setSelectedCountryDetails(detail);
    } catch (e) {
      setSelectedCountryDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDashboardClick = () => {
    const code = selectedCountryDetails?.cca3 || selectedCountry?.code;
    if (code) {
      navigate(`/dashboard/${code}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Globe className="h-8 w-8 text-accent" />
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  AI Economy Forecaster
                </span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-64 hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {/* Suggestions dropdown */}
              {searchQuery && countryNames.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-md shadow-lg z-20 max-h-56 overflow-auto">
                  {countryNames
                    .filter((n) => n.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 8)
                    .map((name) => (
                      <button
                        key={name}
                        onClick={async () => {
                          setSearchQuery(name);
                          // attempt to find ccn3 from mapping
                          const ccn3 = nameToCcn3[name];
                          if (ccn3 && ccn3ToMeta[ccn3]?.cca3) {
                            setSelectedNumericId(ccn3);
                            const cca3 = ccn3ToMeta[ccn3].cca3;
                            await fetchCountryDetails(cca3);
                          } else {
                            // fallback: fetch by name
                            setIsLoadingDetails(true);
                            try {
                              const r = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fullText=true`);
                              const d = await r.json();
                              if (d && d[0]) {
                                // Try to find ccn3 from data
                                const ccn = d[0].ccn3;
                                if (ccn) setSelectedNumericId(String(ccn));
                                setSelectedCountryDetails(d[0]);
                              }
                            } catch (e) {
                              // ignore
                            } finally {
                              setIsLoadingDetails(false);
                            }
                          }
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                </div>
              )}
              </div>
              <Button variant="ghost" onClick={() => navigate("/")}>
                <Home className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Container */}
  <div className="flex-1 relative" ref={mapRef}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 147
            }}
            className="w-full h-full"
          >
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates as [number, number]}
              onMoveEnd={(position) => setPosition(position)}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(e: any) => {
                        setHoveredCountry(geo.properties.name);
                      }}
                      onMouseMove={(e: any) => {
                        const rect = mapRef.current?.getBoundingClientRect();
                        if (rect) {
                          setHoverPos({ x: e.clientX - rect.left + 10, y: e.clientY - rect.top + 10 });
                        }
                      }}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => handleCountryClick(geo)}
                      style={{
                        default: {
                          fill: (selectedNumericId && String(geo.id) === selectedNumericId)
                            ? "hsl(var(--primary) / 0.20)"
                            : "hsl(var(--map-fill))",
                          stroke: (selectedNumericId && String(geo.id) === selectedNumericId)
                            ? "hsl(var(--primary))"
                            : "hsl(var(--map-border))",
                          strokeWidth: (selectedNumericId && String(geo.id) === selectedNumericId) ? 1 : 0.5,
                          outline: "none",
                          transition: "all 0.2s"
                        },
                        hover: {
                          fill: (selectedNumericId && String(geo.id) === selectedNumericId)
                            ? "hsl(var(--primary) / 0.20)"
                            : "hsl(var(--accent))",
                          stroke: (selectedNumericId && String(geo.id) === selectedNumericId)
                            ? "hsl(var(--primary))"
                            : "hsl(var(--accent))",
                          strokeWidth: 1,
                          outline: "none",
                          cursor: "pointer"
                        },
                        pressed: {
                          fill: "hsl(var(--primary))",
                          stroke: "hsl(var(--primary))",
                          strokeWidth: 1,
                          outline: "none"
                        }
                      }}
                    />
                  ))
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* Hover Tooltip */}
          <AnimatePresence>
            {hoveredCountry && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bg-card border border-border rounded-md px-2 py-1 shadow-md pointer-events-none z-10 text-xs"
                style={{ left: hoverPos.x, top: Math.max(hoverPos.y - 28, 4) }}
              >
                {hoveredCountry}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Controls */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setPosition({ ...position, zoom: Math.min(position.zoom * 1.5, 4) })}
            >
              +
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setPosition({ ...position, zoom: Math.max(position.zoom / 1.5, 1) })}
            >
              -
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setPosition({ coordinates: [0, 0], zoom: 1 })}
            >
              <Globe className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sidebar */}
          <AnimatePresence>
          {(selectedCountry || selectedCountryDetails || selectedNumericId) && (
            <motion.aside
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-96 border-l border-border bg-card/50 backdrop-blur-sm p-6 overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCountryDetails ? selectedCountryDetails.name.common : (selectedCountry?.name || 'Country')}</h2>
                  <p className="text-sm text-muted-foreground">{selectedCountryDetails ? selectedCountryDetails.name.official : selectedCountry?.region}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setSelectedCountry(null);
                    setSelectedNumericId(null);
                    setSelectedCountryDetails(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isLoadingDetails && (
                <div className="py-16 text-center text-muted-foreground">Loading...</div>
              )}

              {!isLoadingDetails && selectedCountryDetails && (
                <div className="space-y-6 pb-6">
                  <div>
                    <img src={selectedCountryDetails.flags?.svg || selectedCountryDetails.flags?.png} alt={`Flag of ${selectedCountryDetails.name.common}`} className="w-full h-40 object-cover rounded-lg shadow-lg border-2 border-[--border]" />
                  </div>
                  <h2 className="text-3xl font-bold text-center text-primary">{selectedCountryDetails.name.common}</h2>
                  <p className="text-lg text-center text-muted-foreground -mt-2">{selectedCountryDetails.name.official}</p>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between p-3 bg-[--map-fill] rounded-md border border-border">
                      <span className="font-semibold text-muted-foreground">Capital:</span>
                      <span className="font-medium">{(selectedCountryDetails.capital && selectedCountryDetails.capital[0]) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[--map-fill] rounded-md border border-border">
                      <span className="font-semibold text-muted-foreground">Population:</span>
                      <span className="font-medium">{selectedCountryDetails.population?.toLocaleString?.() ?? selectedCountryDetails.population ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[--map-fill] rounded-md border border-border">
                      <span className="font-semibold text-muted-foreground">GDP (current USD):</span>
                      <span className="font-medium">{selectedCountryDetails.gdp ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(selectedCountryDetails.gdp) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[--map-fill] rounded-md border border-border">
                      <span className="font-semibold text-muted-foreground">Region:</span>
                      <span className="font-medium">{selectedCountryDetails.region || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[--map-fill] rounded-md border border-border">
                      <span className="font-semibold text-muted-foreground">Subregion:</span>
                      <span className="font-medium">{selectedCountryDetails.subregion || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[--map-fill] rounded-md border border-border">
                      <span className="font-semibold text-muted-foreground">Currency:</span>
                      <span className="font-medium">
                        {selectedCountryDetails.currencies
                          ? (() => {
                              const cur = (Object.values(selectedCountryDetails.currencies)[0] as any) ?? null;
                              const name = cur?.name ?? 'N/A';
                              const symbol = cur?.symbol ?? '';
                              return `${name}${symbol ? ` (${symbol})` : ''}`;
                            })()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full mt-4"
                    onClick={handleDashboardClick}
                  >
                    <BarChart3 className="mr-2 h-5 w-5" /> View Dashboard
                  </Button>
                </div>
              )}
              {!isLoadingDetails && !selectedCountryDetails && selectedCountry && (
                <div className="space-y-6 pb-6">
                  <h2 className="text-2xl font-bold">{selectedCountry.name}</h2>
                  <Card className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region</span>
                      <span className="font-medium">{selectedCountry.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Population</span>
                      <span className="font-medium">{selectedCountry.population}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capital</span>
                      <span className="font-medium">{selectedCountry.capital}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="font-medium">{selectedCountry.currency}</span>
                    </div>
                  </Card>
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full mt-4"
                    onClick={handleDashboardClick}
                  >
                    <BarChart3 className="mr-2 h-5 w-5" /> View Dashboard
                  </Button>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorldMap;
