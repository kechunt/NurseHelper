import type { NurseDayHistoryItem } from '../../services/nurse.service';
import { isValidIsoYmdDateString } from './nurse-dashboard-local-date.helpers';

export interface NurseDayHistoryState {
  date: string;
  items: NurseDayHistoryItem[];
  loading: boolean;
  error: string | null;
}

export type NurseDayHistoryResponseLike = {
  date?: string | null;
  items?: NurseDayHistoryItem[] | null;
};

export function startNurseDayHistoryLoadState(currentDate: string): NurseDayHistoryState {
  const date = (currentDate || '').trim();
  if (!isValidIsoYmdDateString(date)) {
    return {
      date,
      items: [],
      loading: false,
      error: 'Fecha no válida',
    };
  }
  return {
    date,
    items: [],
    loading: true,
    error: null,
  };
}

export function finishNurseDayHistoryLoadSuccessState(
  loadingDate: string,
  response: NurseDayHistoryResponseLike
): NurseDayHistoryState {
  const responseDate = (response?.date || '').trim();
  return {
    date: isValidIsoYmdDateString(responseDate) ? responseDate : loadingDate,
    items: response?.items || [],
    loading: false,
    error: null,
  };
}

export function finishNurseDayHistoryLoadErrorState(
  currentDate: string,
  message: string
): NurseDayHistoryState {
  return {
    date: currentDate,
    items: [],
    loading: false,
    error: message,
  };
}
