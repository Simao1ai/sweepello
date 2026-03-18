import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
}

export interface AddressParts {
  street: string;
  city: string;
  state: string;
  zip: string;
  full: string;
}

interface AddressSearchProps {
  value: string;
  onChange: (full: string, parts: AddressParts) => void;
  placeholder?: string;
  id?: string;
  "data-testid"?: string;
  required?: boolean;
  className?: string;
}

export function AddressSearch({
  value,
  onChange,
  placeholder = "Start typing an address...",
  id,
  "data-testid": testId,
  required,
  className,
}: AddressSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&countrycodes=us`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val, { street: val, city: "", state: "", zip: "", full: val });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    const a = result.address;
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const city = a.city || a.town || a.village || a.suburb || a.county || "";
    const state = a.state || "";
    const zip = a.postcode || "";
    const full = [street, city, state, zip].filter(Boolean).join(", ");
    setQuery(full);
    setIsOpen(false);
    setResults([]);
    onChange(full, { street, city, state, zip, full });
  };

  const formatDisplay = (r: NominatimResult) => {
    const a = r.address;
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const city = a.city || a.town || a.village || a.county || "";
    const state = a.state || "";
    const zip = a.postcode || "";
    return { primary: [street].filter(Boolean).join("") || r.display_name.split(",")[0], secondary: [city, state, zip].filter(Boolean).join(", ") };
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          data-testid={testId}
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
          {results.map((r) => {
            const { primary, secondary } = formatDisplay(r);
            return (
              <button
                key={r.place_id}
                type="button"
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b last:border-b-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(r);
                }}
              >
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{primary}</p>
                  {secondary && <p className="text-xs text-muted-foreground truncate">{secondary}</p>}
                </div>
              </button>
            );
          })}
          <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/30">
            Powered by OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
