
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}

export interface Movie {
  id: string;
  title: string;
  poster: string;
  genre: string[];
  duration: string;
  rating: number;
  description: string;
  releaseDate: string;
}

export interface Theater {
  id: string;
  name: string;
  city: string;
  screens: string[];
}

export interface Show {
  id: string;
  movieId: string;
  theaterId: string;
  time: string;
  price: number;
  seats: Record<string, 'available' | 'booked' | 'selected'>;
  theater_name?: string;
}

export interface Booking {
  id: string;
  userId: string;
  showId: string;
  movieTitle: string;
  theaterName: string;
  time: string;
  seats: string[];
  amount: number;
  status: BookingStatus;
  timestamp: number;
}

export interface User {
  id: string | number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  managedTheater?: {
    id: string;
    name: string;
  };
}
