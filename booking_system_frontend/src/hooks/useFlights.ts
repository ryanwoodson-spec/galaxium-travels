import { useState, useCallback } from 'react';
import { getFlights } from '../services/api';
import type { Flight } from '../types';
import toast from 'react-hot-toast';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export const useFlights = () => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await getFlights();
        setFlights(data);
        setIsLoading(false);
        return;
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          toast.error(`Failed to load flights. Retrying… (${attempt + 1}/${MAX_RETRIES})`);
          console.warn(`Retry attempt ${attempt + 1}:`, error);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        } else {
          toast.error('Failed to load flights after multiple attempts');
          console.error('Max retries reached:', error);
          setIsLoading(false);
        }
      }
    }
  }, []);

  return { flights, isLoading, reload: load };
};
