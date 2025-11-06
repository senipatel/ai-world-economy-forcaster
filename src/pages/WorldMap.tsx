import { useState, useEffect } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });
  const [countryNames, setCountryNames] = useState<string[]>([]);

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
    const countryCode = geo.id;
    const countryInfo = countryData[countryCode] || {
      name: geo.properties.name,
      code: countryCode,
      region: "Unknown",
      population: "N/A",
      capital: "N/A",
      currency: "N/A"
    };
    setSelectedCountry(countryInfo);
  };

  // Load list of country names from the geo JSON for search suggestions
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(geoUrl);
        const data = await res.json();
        const features = (data.objects && Object.values(data.objects)[0] && (data.objects && Object.values(data.objects)[0] as any).geometries)
          ? undefined
          : undefined;

        // The world-atlas topojson structure stores country names under `objects` -> [key] -> `geometries` -> properties.name
        const objs = data.objects || {};
        const firstKey = Object.keys(objs)[0];
        const geoms = firstKey ? (objs as any)[firstKey].geometries : [];
        const names: string[] = geoms.map((g: any) => g.properties?.name).filter(Boolean);
        if (mounted) setCountryNames(names.sort());
      } catch (e) {
        // ignore failures — suggestions will simply be empty
        // console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDashboardClick = () => {
    if (selectedCountry) {
      navigate(`/dashboard/${selectedCountry.code}`);
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
                          onClick={() => {
                            setSearchQuery(name);
                            setSelectedCountry({
                              name,
                              code: name.slice(0, 3).toUpperCase(),
                              region: "Unknown",
                              population: "N/A",
                              capital: "N/A",
                              currency: "N/A",
                            });
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
        <div className="flex-1 relative">
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
                      onMouseEnter={() => setHoveredCountry(geo.properties.name)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => handleCountryClick(geo)}
                      style={{
                        default: {
                          fill: "hsl(var(--map-fill))",
                          stroke: "hsl(var(--map-border))",
                          strokeWidth: 0.5,
                          outline: "none",
                          transition: "all 0.2s"
                        },
                        hover: {
                          fill: "hsl(var(--accent))",
                          stroke: "hsl(var(--accent))",
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
            {hoveredCountry && !selectedCountry && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-4 py-2 shadow-lg pointer-events-none z-10"
              >
                <p className="text-sm font-medium">{hoveredCountry}</p>
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
          {selectedCountry && (
            <motion.aside
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-96 border-l border-border bg-card/50 backdrop-blur-sm p-6 overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold">{selectedCountry.name}</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedCountry(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Card className="p-4 mb-6 space-y-3">
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
                className="w-full"
                onClick={handleDashboardClick}
              >
                <BarChart3 className="mr-2 h-5 w-5" />
                View Dashboard
              </Button>

              <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Explore detailed economic indicators, historical trends, and AI-powered insights for {selectedCountry.name}.
                </p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorldMap;
