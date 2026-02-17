
import { Movie, Theater, Show } from './types';

export const INITIAL_MOVIES: Movie[] = [
  {
    id: 'm1',
    title: 'Pathaan',
    poster: 'https://picsum.photos/seed/pathaan/400/600',
    genre: ['Action', 'Thriller'],
    duration: '2h 26m',
    rating: 4.5,
    description: 'An Indian spy takes on the leader of a group of mercenaries who have nefarious plans to target his homeland.',
    releaseDate: '2023-01-25'
  },
  {
    id: 'm2',
    title: 'Jawan',
    poster: 'https://picsum.photos/seed/jawan/400/600',
    genre: ['Action', 'Thriller', 'Drama'],
    duration: '2h 49m',
    rating: 4.8,
    description: 'A high-octane action thriller which outlines the emotional journey of a man who is set to rectify the wrongs in the society.',
    releaseDate: '2023-09-07'
  },
  {
    id: 'm3',
    title: 'Animal',
    poster: 'https://picsum.photos/seed/animal/400/600',
    genre: ['Action', 'Crime', 'Drama'],
    duration: '3h 21m',
    rating: 4.2,
    description: 'The complex relationship between a father and son, set against the backdrop of underworld crime and emotional volatility.',
    releaseDate: '2023-12-01'
  }
];

export const INITIAL_THEATERS: Theater[] = [
  {
    id: 't1',
    name: 'PVR Phoenix',
    city: 'Lucknow',
    screens: ['Screen 1', 'Screen 2']
  },
  {
    id: 't2',
    name: 'Inox Riverside',
    city: 'Kanpur',
    screens: ['Main Hall', 'Gold Class']
  }
];

// Helper to generate a 5x5 grid of seats
export const generateSeats = () => {
  const seats: Record<string, 'available' | 'booked'> = {};
  const rows = ['A', 'B', 'C', 'D', 'E'];
  for (const row of rows) {
    for (let i = 1; i <= 5; i++) {
      const isBooked = Math.random() < 0.2;
      seats[`${row}${i}`] = isBooked ? 'booked' : 'available';
    }
  }
  return seats;
};

export const INITIAL_SHOWS: Show[] = [
  { id: 's1', movieId: 'm1', theaterId: 't1', time: '10:00 AM', price: 250, seats: generateSeats() },
  { id: 's2', movieId: 'm1', theaterId: 't1', time: '01:30 PM', price: 300, seats: generateSeats() },
  { id: 's3', movieId: 'm2', theaterId: 't1', time: '05:00 PM', price: 350, seats: generateSeats() },
  { id: 's4', movieId: 'm3', theaterId: 't2', time: '08:00 PM', price: 400, seats: generateSeats() },
  { id: 's5', movieId: 'm2', theaterId: 't2', time: '11:00 AM', price: 280, seats: generateSeats() },
];
