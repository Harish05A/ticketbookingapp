# CineQuest

**CineQuest** is a production-grade Movie Ticket Booking Management System built for high concurrency and real-world business constraints. It features a hybrid real-time architecture with Firebase Firestore for seat locking and Django REST Framework for persistent logic. [github](https://github.com/EgonSaks/cinema-ticket-booking-system)

## Features

- **Hybrid Real-Time Architecture**: Firebase for live seat updates, Django for bookings and payments.
- **Reservation Guard**: ₹5 penalty for abandoned holds to prevent seat squatting.
- **Hierarchical RBAC**: Super Admins (global) and Theater Managers (venue-specific).
- **E-Ticket System**: Dynamic QR codes for check-ins.
- **Payment Integration**: Razorpay sandbox-ready.
- **Seeding Engine**: `seed_data` command populates movies like Pathaan, Jawan.
- **Atomic Transactions**: Firestore `runTransaction` prevents double-booking.
- **PWA Ready**: Mobile-optimized for India with high-contrast UI. [geeksforgeeks](https://www.geeksforgeeks.org/system-design/design-movie-ticket-booking-system-like-bookmyshow/)

## Tech Stack

| Component | Technologies |
|-----------|--------------|
| Frontend | React 19, Vite, Tailwind CSS, Lucide-React, React Router 7 |
| Backend | Django 4.2, DRF |
| Database | Firestore (real-time), SQLite/PostgreSQL (transactions) |
| Middleware | Whitenoise, CORS Headers |
| Background | Firebase Cloud Functions V2 |
| Payments | Razorpay [github](https://github.com/imranmatin23/fullstack-web-app-template)

## Architecture Overview

```
[User Browser (React App)] --> [Firebase Auth/Firestore (real-time seats)] 
                           --> [Django Backend (bookings/payments)] 
                           --> [SQLite/PG (persistent records)]
```

See diagrams in repo for detailed flows: System Architecture, Seat Booking Workflow, Admin Dashboard. [github](https://github.com/imranmatin23/fullstack-web-app-template/blob/main/README.md)

## Quick Start

### Prerequisites
- Node.js 18+, Python 3.11+
- Firebase project (Auth + Firestore)
- Razorpay test keys

### Setup
1. Clone repo: `git clone <repo-url>`
2. **Frontend**:
   ```
   cd frontend
   npm install
   npm run dev
   ```
3. **Backend**:
   ```
   cd backend
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_data  # Populates initial data
   python manage.py runserver
   ```
4. **Firebase**: Add `firebaseConfig` to frontend `src/services/firebase.ts`.
5. Access: `http://localhost:5173` (Vite), backend at `http://localhost:8000`. [github](https://github.com/imranmatin23/fullstack-web-app-template)

## Production Deployment

- **Database**: Swap SQLite for Vercel Postgres/Supabase.
- **Auth**: Whitelist production domain in Firebase.
- **Payments**: Use Razorpay live keys in `settings.py`.
- **Deploy**: Monorepo-ready `vercel.json` for Vercel (frontend + backend).
- Scale with PostgreSQL for >1000 bookings. [github](https://github.com/EgonSaks/cinema-ticket-booking-system)

## Key Workflows

### Booking Flow
1. Browse movies/shows.
2. Select seats → Firestore transaction locks (5min hold).
3. Confirm → Final transaction + Razorpay.
4. Success page with QR + email.

### Admin Flow
- Super Admins create theaters → Auto-provisions Manager accounts via Cloud Functions.
- Add movies/shows via dashboard.

### Collision Handling
Firestore transactions ensure only one user locks a seat; others get "unavailable" instantly. [geeksforgeeks](https://www.geeksforgeeks.org/system-design/design-movie-ticket-booking-system-like-bookmyshow/)

## Unique Selling Points

- Solves "abandoned cart" with hold fines.
- Real-time updates via `onSnapshot`.
- Production-ready: Atomic ops, RBAC, PWA. [github](https://github.com/projectworldsofficial/Online-Movie-Ticket-Booking-System-in-php)

## Contributing

1. Fork repo.
2. Create feature branch: `git checkout -b feature/AmazingFeature`.
3. Commit: `git commit -m 'Add amazing feature'`.
4. Push: `git push origin feature/AmazingFeature`.
5. Open PR.

## License

MIT License. See `LICENSE` file.
