
import { Movie, Theater, Show } from './types';

// Cleared for Real-World Usage
export const INITIAL_MOVIES: Movie[] = [];
export const INITIAL_THEATERS: Theater[] = [];
export const INITIAL_SHOWS: Show[] = [];

/**
 * Helper to generate a dynamic grid of seats for any theater layout.
 * Used during the administrative "Add Show" process.
 */
export const generateSeats = (rows: string[] = ['A', 'B', 'C', 'D', 'E'], cols: number = 5) => {
  const seats: Record<string, 'available' | 'booked'> = {};
  for (const row of rows) {
    for (let i = 1; i <= cols; i++) {
      // Production starts with all seats available unless manually blocked
      seats[`${row}${i}`] = 'available';
    }
  }
  return seats;
};
