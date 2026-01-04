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
} from '@/lib/config';
import { trackStartEstimate, startEstimateTiming, trackEstimateFailed } from '@/lib/analytics';

// Pre-compute years at module level to avoid hydration mismatch
const BASE_YEAR = 2026;
const YEARS_LIST = Array.from({ length: 35 }, (_, i) => BASE_YEAR - i);

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
  const [year, setYear] = useState('');
  const [km, setKm] = useState('');
  const [fuel, setFuel] = useState('');
  const [gearbox, setGearbox] = useState('');
  const [condition, setCondition] = useState('normale');

  // Models state
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Use pre-computed years list
  const years = useMemo(() => YEARS_LIST, []);

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
      year: parseInt(year, 10),
      km: parseInt(km.replace(/\D/g, ''), 10),
      fuel,
      gearbox,
    };
    trackStartEstimate(estimateProps);
    startEstimateTiming();

    try {
      const response = await fetch('/api/valuate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brandName,
          model: modelName,
          makeId,
          modelId,
          year: parseInt(year, 10),
          km: parseInt(km.replace(/\D/g, ''), 10),
          fuel,
          gearbox,
          condition,
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
          condition
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
          <div className="relative">
            <select
              id="brand"
              value={makeId}
              onChange={(e) => setMakeId(e.target.value ? Number(e.target.value) : '')}
              required
              className={makeId ? 'text-[var(--text-primary)]' : 'text-[var(--text-placeholder)]'}
            >
              <option value="" disabled>Seleziona marca</option>
              {CAR_MAKES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="model">Modello</label>
          <div className="relative">
            <select
              id="model"
              value={modelId}
              onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : '')}
              required
              disabled={!makeId || loadingModels}
              className={modelId ? 'text-[var(--text-primary)]' : 'text-[var(--text-placeholder)]'}
            >
              <option value="" disabled>
                {loadingModels
                  ? 'Caricamento...'
                  : makeId
                    ? 'Seleziona modello'
                    : 'Prima seleziona marca'}
              </option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {loadingModels && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <svg
                  className="animate-spin h-4 w-4 text-blue-400"
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Year and Km */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-2">
          <label htmlFor="year">Anno immatricolazione</label>
          <select
            id="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
            className={year ? 'text-[var(--text-primary)]' : 'text-[var(--text-placeholder)]'}
          >
            <option value="" disabled>Seleziona anno</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
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
          <label htmlFor="fuel">Alimentazione</label>
          <select
            id="fuel"
            value={fuel}
            onChange={(e) => setFuel(e.target.value)}
            required
            className={fuel ? 'text-[var(--text-primary)]' : 'text-[var(--text-placeholder)]'}
          >
            <option value="" disabled>Seleziona alimentazione</option>
            {FUEL_TYPES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="gearbox">Cambio</label>
          <select
            id="gearbox"
            value={gearbox}
            onChange={(e) => setGearbox(e.target.value)}
            required
            className={gearbox ? 'text-[var(--text-primary)]' : 'text-[var(--text-placeholder)]'}
          >
            <option value="" disabled>Seleziona cambio</option>
            {GEARBOX_TYPES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Condition */}
      <div className="space-y-4">
        <label>Condizione veicolo</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CONDITION_TYPES.map((c) => {
            const isSelected = condition === c.value;

            const getConditionStyles = () => {
              if (!isSelected) {
                return {
                  bg: 'bg-[var(--obsidian-700)]',
                  border: 'border-[var(--obsidian-500)] hover:border-[var(--obsidian-400)]',
                  text: 'text-[var(--text-primary)]',
                  dot: ''
                };
              }

              switch (c.value) {
                case 'scarsa':
                  return {
                    bg: 'bg-yellow-500/15',
                    border: 'border-yellow-500',
                    text: 'text-yellow-400',
                    dot: 'bg-yellow-500'
                  };
                case 'normale':
                  return {
                    bg: 'bg-blue-500/15',
                    border: 'border-blue-500',
                    text: 'text-blue-400',
                    dot: 'bg-blue-500'
                  };
                case 'ottima':
                  return {
                    bg: 'bg-green-500/15',
                    border: 'border-green-500',
                    text: 'text-green-400',
                    dot: 'bg-green-500'
                  };
                default:
                  return {
                    bg: 'bg-[var(--obsidian-700)]',
                    border: 'border-[var(--obsidian-500)]',
                    text: 'text-[var(--text-primary)]',
                    dot: ''
                  };
              }
            };

            const styles = getConditionStyles();

            return (
              <label
                key={c.value}
                className={`
                  relative flex flex-col items-center justify-center
                  px-4 py-5 sm:px-3 sm:py-6 md:px-5 md:py-6
                  rounded-xl cursor-pointer transition-all duration-200
                  border ${styles.bg} ${styles.border}
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
                <span className={`font-semibold text-base sm:text-sm md:text-base ${styles.text}`}>
                  {c.label}
                </span>
                <span className="text-xs sm:text-[11px] md:text-xs text-[var(--text-muted)] text-center mt-2 leading-relaxed px-1">
                  {c.description}
                </span>
                {isSelected && (
                  <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${styles.dot}`} />
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
            <span>Calcola valutazione</span>
          </>
        )}
      </button>
    </form>
  );
}
