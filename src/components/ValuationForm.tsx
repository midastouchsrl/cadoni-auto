'use client';

/**
 * VibeCar Valuation Form
 * Form con dropdown dinamici per marca/modello da AutoScout24
 */

import { useState, useMemo, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CAR_MAKES } from '@/lib/autoscout-data';
import {
  FUEL_TYPES,
  GEARBOX_TYPES,
  CONDITION_TYPES,
  POWER_RANGES,
  ITALIAN_REGIONS,
} from '@/lib/config';
import {
  trackStartEstimate,
  startEstimateTiming,
  trackEstimateFailed,
  getEstimateContext,
  getAnonId,
} from '@/lib/analytics';
import SearchableSelect, { toSelectOptions } from './SearchableSelect';

// Convert power ranges to select options format
const POWER_OPTIONS = POWER_RANGES.map((p) => ({ value: p.value, label: p.label }));

// Pre-compute years at module level to avoid hydration mismatch
const BASE_YEAR = 2026;
const YEARS_LIST = Array.from({ length: 35 }, (_, i) => BASE_YEAR - i);

// Convert years to select options format
const YEAR_OPTIONS = YEARS_LIST.map((y) => ({ value: String(y), label: String(y) }));

// Convert fuel and gearbox to consistent format
const FUEL_OPTIONS = FUEL_TYPES.map((f) => ({ value: f.value, label: f.label }));
const GEARBOX_OPTIONS = GEARBOX_TYPES.map((g) => ({ value: g.value, label: g.label }));

// Convert regions to select options format
const REGION_OPTIONS = ITALIAN_REGIONS.map((r) => ({ value: r.value, label: r.label }));

interface Model {
  id: number;
  name: string;
}

export default function ValuationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [makeId, setMakeId] = useState<number | ''>('');
  const [modelId, setModelId] = useState<number | ''>('');
  const [year, setYear] = useState<string | ''>('');
  const [km, setKm] = useState('');
  const [fuel, setFuel] = useState<string | ''>('');
  const [gearbox, setGearbox] = useState<string | ''>('');
  const [condition, setCondition] = useState('normale');
  const [powerRange, setPowerRange] = useState<string>('');
  const [region, setRegion] = useState<string>('');

  // Models state
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Dynamic fuels state
  const [availableFuels, setAvailableFuels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingFuels, setLoadingFuels] = useState(false);
  const [fuelsLoaded, setFuelsLoaded] = useState(false);

  // Dynamic years state
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [yearsLoaded, setYearsLoaded] = useState(false);

  // Convert CAR_MAKES to select options format
  const makeOptions = useMemo(() => toSelectOptions(CAR_MAKES), []);

  // Convert models to select options format
  const modelOptions = useMemo(() => toSelectOptions(models), [models]);

  // Fetch models when make changes
  useEffect(() => {
    if (!makeId) {
      setModels([]);
      setModelId('');
      return;
    }

    const fetchModels = async () => {
      setLoadingModels(true);
      setModelId('');

      try {
        const response = await fetch(`/api/models/${makeId}`);
        const data = await response.json();

        if (data.models) {
          setModels(data.models);
        }
      } catch (err) {
        console.error('Error fetching models:', err);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [makeId]);

  // Fetch available years when model changes
  useEffect(() => {
    if (!makeId || !modelId) {
      setAvailableYears([]);
      setYearsLoaded(false);
      // Reset year selection when model changes
      setYear('');
      return;
    }

    const fetchYears = async () => {
      setLoadingYears(true);
      setYear(''); // Reset year when loading new options

      try {
        const response = await fetch(`/api/years/${makeId}/${modelId}`);
        const data = await response.json();

        if (data.years && data.years.length > 0) {
          setAvailableYears(data.years);
          setYearsLoaded(true);
        } else {
          // Fallback to default years if no specific ones found
          setAvailableYears(YEARS_LIST);
          setYearsLoaded(true);
        }
      } catch (err) {
        console.error('Error fetching years:', err);
        // Fallback to default years on error
        setAvailableYears(YEARS_LIST);
        setYearsLoaded(true);
      } finally {
        setLoadingYears(false);
      }
    };

    fetchYears();
  }, [makeId, modelId]);

  // Fetch available fuels when model changes
  useEffect(() => {
    if (!makeId || !modelId) {
      setAvailableFuels([]);
      setFuelsLoaded(false);
      // Reset fuel selection when model changes
      setFuel('');
      return;
    }

    const fetchFuels = async () => {
      setLoadingFuels(true);
      setFuel(''); // Reset fuel when loading new options

      try {
        const response = await fetch(`/api/fuels/${makeId}/${modelId}`);
        const data = await response.json();

        if (data.fuels && data.fuels.length > 0) {
          setAvailableFuels(data.fuels);
          setFuelsLoaded(true);
        } else {
          // Fallback to default fuels if no specific ones found
          setAvailableFuels(FUEL_OPTIONS);
          setFuelsLoaded(true);
        }
      } catch (err) {
        console.error('Error fetching fuels:', err);
        // Fallback to default fuels on error
        setAvailableFuels(FUEL_OPTIONS);
        setFuelsLoaded(true);
      } finally {
        setLoadingFuels(false);
      }
    };

    fetchFuels();
  }, [makeId, modelId]);

  // Compute year options: use available years if loaded, otherwise default
  const yearOptions = useMemo(() => {
    if (yearsLoaded && availableYears.length > 0) {
      return availableYears.map((y) => ({ value: String(y), label: String(y) }));
    }
    return YEAR_OPTIONS;
  }, [yearsLoaded, availableYears]);

  // Compute fuel options: use available fuels if loaded, otherwise default
  const fuelOptions = useMemo(() => {
    if (fuelsLoaded && availableFuels.length > 0) {
      return availableFuels;
    }
    return FUEL_OPTIONS;
  }, [fuelsLoaded, availableFuels]);

  // Get selected make and model names for submission
  const getSelectedMakeName = () => {
    const make = CAR_MAKES.find((m) => m.id === makeId);
    return make?.name || '';
  };

  const getSelectedModelName = () => {
    const model = models.find((m) => m.id === modelId);
    return model?.name || '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const brandName = getSelectedMakeName();
    const modelName = getSelectedModelName();

    if (!brandName || !modelName) {
      setError('Seleziona marca e modello');
      setLoading(false);
      return;
    }

    // Track estimate start and begin timing
    const estimateProps = {
      brand: brandName,
      model: modelName,
      year: parseInt(String(year), 10),
      km: parseInt(km.replace(/\D/g, ''), 10),
      fuel: String(fuel),
      gearbox: String(gearbox),
    };
    trackStartEstimate(estimateProps);
    startEstimateTiming();

    // Get tracking context
    const estimateContext = getEstimateContext();
    const anonId = getAnonId();

    try {
      const response = await fetch('/api/valuate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brandName,
          model: modelName,
          makeId,
          modelId,
          year: parseInt(String(year), 10),
          km: parseInt(km.replace(/\D/g, ''), 10),
          fuel,
          gearbox,
          condition,
          powerRange: powerRange || undefined,
          region: region || undefined,
          // Tracking fields for persistence
          estimate_id: estimateContext?.estimate_id,
          anon_id: anonId,
          origin_ref: estimateContext?.origin_ref,
          origin_sid: estimateContext?.origin_sid,
        }),
      });

      const data = await response.json();

      if (data.error) {
        trackEstimateFailed(estimateProps, data.message);
        setError(data.message + (data.suggestion ? ` ${data.suggestion}` : ''));
        setLoading(false);
        return;
      }

      // Save result to sessionStorage and navigate
      sessionStorage.setItem('vibecar_result', JSON.stringify(data));
      sessionStorage.setItem(
        'vibecar_input',
        JSON.stringify({
          brand: brandName,
          model: modelName,
          makeId,
          modelId,
          year,
          km,
          fuel,
          gearbox,
          condition,
          powerRange: powerRange || undefined,
          region: region || undefined,
        })
      );
      router.push('/risultato');
    } catch (err) {
      console.error(err);
      setError('Errore di connessione. Riprova.');
      setLoading(false);
    }
  };

  // Format km with thousand separator
  const formatKm = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
      {/* Brand and Model */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-2">
          <label htmlFor="brand">Marca</label>
          <SearchableSelect
            id="brand"
            options={makeOptions}
            value={makeId}
            onChange={setMakeId}
            placeholder="Cerca marca..."
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="model">Modello</label>
          <SearchableSelect
            id="model"
            options={modelOptions}
            value={modelId}
            onChange={setModelId}
            placeholder="Cerca modello..."
            disabled={!makeId}
            loading={loadingModels}
            loadingText="Caricamento..."
            disabledText="Prima seleziona marca"
          />
        </div>
      </div>

      {/* Year and Km */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-2">
          <label htmlFor="year">
            Anno immatricolazione
            {yearsLoaded && availableYears.length > 0 && availableYears.length < YEARS_LIST.length && (
              <span className="ml-2 text-xs text-[var(--text-muted)]">
                ({availableYears[availableYears.length - 1]}-{availableYears[0]})
              </span>
            )}
          </label>
          <SearchableSelect
            id="year"
            options={yearOptions}
            value={year}
            onChange={setYear}
            placeholder="Cerca anno..."
            disabled={!modelId}
            loading={loadingYears}
            loadingText="Caricamento..."
            disabledText="Prima seleziona modello"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="km">Chilometraggio</label>
          <input
            type="text"
            id="km"
            value={km}
            onChange={(e) => setKm(formatKm(e.target.value))}
            placeholder="es. 50.000"
            required
          />
        </div>
      </div>

      {/* Fuel and Gearbox */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-2">
          <label htmlFor="fuel">
            Alimentazione
            {fuelsLoaded && availableFuels.length > 0 && availableFuels.length < FUEL_OPTIONS.length && (
              <span className="ml-2 text-xs text-[var(--text-muted)]">
                ({availableFuels.length} disponibil{availableFuels.length === 1 ? 'e' : 'i'})
              </span>
            )}
          </label>
          <SearchableSelect
            id="fuel"
            options={fuelOptions}
            value={fuel}
            onChange={setFuel}
            placeholder="Cerca alimentazione..."
            disabled={!modelId}
            loading={loadingFuels}
            loadingText="Caricamento..."
            disabledText="Prima seleziona modello"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="gearbox">Cambio</label>
          <SearchableSelect
            id="gearbox"
            options={GEARBOX_OPTIONS}
            value={gearbox}
            onChange={setGearbox}
            placeholder="Cerca cambio..."
          />
        </div>
      </div>

      {/* Power Range and Region */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-2">
          <label htmlFor="power">
            Potenza (CV)
            <span className="ml-2 text-xs text-[var(--text-muted)]">opzionale</span>
          </label>
          <SearchableSelect
            id="power"
            options={POWER_OPTIONS}
            value={powerRange}
            onChange={setPowerRange}
            placeholder="Non so / Qualsiasi"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="region">
            Regione
            <span className="ml-2 text-xs text-[var(--text-muted)]">opzionale</span>
          </label>
          <SearchableSelect
            id="region"
            options={REGION_OPTIONS}
            value={region}
            onChange={setRegion}
            placeholder="Seleziona regione..."
          />
        </div>
      </div>

      {/* Condition */}
      <div className="space-y-4">
        <label>Condizione veicolo</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CONDITION_TYPES.map((c) => {
            const isSelected = condition === c.value;

            const getConditionConfig = () => {
              switch (c.value) {
                case 'scarsa':
                  return {
                    bg: isSelected ? 'bg-yellow-500/15' : 'bg-[var(--obsidian-700)]',
                    border: isSelected ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-[var(--obsidian-500)] hover:border-yellow-500/50',
                    text: isSelected ? 'text-yellow-400' : 'text-[var(--text-primary)]',
                    iconBg: isSelected ? 'bg-yellow-500/20' : 'bg-[var(--obsidian-600)]',
                    iconColor: isSelected ? 'text-yellow-400' : 'text-[var(--text-muted)]',
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    )
                  };
                case 'normale':
                  return {
                    bg: isSelected ? 'bg-blue-500/15' : 'bg-[var(--obsidian-700)]',
                    border: isSelected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-[var(--obsidian-500)] hover:border-blue-500/50',
                    text: isSelected ? 'text-blue-400' : 'text-[var(--text-primary)]',
                    iconBg: isSelected ? 'bg-blue-500/20' : 'bg-[var(--obsidian-600)]',
                    iconColor: isSelected ? 'text-blue-400' : 'text-[var(--text-muted)]',
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                      </svg>
                    )
                  };
                case 'ottima':
                  return {
                    bg: isSelected ? 'bg-green-500/15' : 'bg-[var(--obsidian-700)]',
                    border: isSelected ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'border-[var(--obsidian-500)] hover:border-green-500/50',
                    text: isSelected ? 'text-green-400' : 'text-[var(--text-primary)]',
                    iconBg: isSelected ? 'bg-green-500/20' : 'bg-[var(--obsidian-600)]',
                    iconColor: isSelected ? 'text-green-400' : 'text-[var(--text-muted)]',
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    )
                  };
                default:
                  return {
                    bg: 'bg-[var(--obsidian-700)]',
                    border: 'border-[var(--obsidian-500)]',
                    text: 'text-[var(--text-primary)]',
                    iconBg: 'bg-[var(--obsidian-600)]',
                    iconColor: 'text-[var(--text-muted)]',
                    icon: null
                  };
              }
            };

            const config = getConditionConfig();

            return (
              <label
                key={c.value}
                className={`
                  relative flex flex-col items-center
                  px-4 py-6 sm:px-3 sm:py-5 md:px-5 md:py-6
                  rounded-xl cursor-pointer transition-all duration-300
                  border ${config.bg} ${config.border}
                  group
                `}
              >
                <input
                  type="radio"
                  name="condition"
                  value={c.value}
                  checked={isSelected}
                  onChange={(e) => setCondition(e.target.value)}
                  className="sr-only"
                />

                {/* Icon container */}
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center mb-3
                  transition-all duration-300 ${config.iconBg}
                  ${!isSelected ? 'group-hover:scale-110' : ''}
                `}>
                  <span className={`transition-colors duration-300 ${config.iconColor}`}>
                    {config.icon}
                  </span>
                </div>

                {/* Label */}
                <span className={`font-semibold text-base sm:text-sm md:text-base transition-colors duration-300 ${config.text}`}>
                  {c.label}
                </span>

                {/* Description */}
                <span className="text-xs sm:text-[11px] md:text-xs text-[var(--text-muted)] text-center mt-1.5 leading-relaxed px-1">
                  {c.description}
                </span>

                {/* Selected checkmark */}
                {isSelected && (
                  <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center
                    ${c.value === 'scarsa' ? 'bg-yellow-500' : c.value === 'normale' ? 'bg-blue-500' : 'bg-green-500'}
                  `}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-[var(--error-muted)] border border-[var(--error)]/30">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-[var(--error)] flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Calcolo in corso...</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z"
              />
            </svg>
            <span>Calcola il valore reale</span>
          </>
        )}
      </button>

      {/* Disclaimer */}
      <p className="text-xs text-[var(--text-muted)] text-center mt-3">
        Valutazione indicativa basata su dati di mercato. Non costituisce offerta di acquisto.
      </p>
    </form>
  );
}
