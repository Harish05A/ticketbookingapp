
from django.core.management.base import BaseCommand
from api.models import Movie, Theater, Show
from datetime import date
from decimal import Decimal

class Command(BaseCommand):
    help = 'Seeds the database with sample movies and theaters'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # Movies
        movies_data = [
            {
                'title': 'Pathaan',
                'poster': 'https://picsum.photos/seed/pathaan/400/600',
                'genre': 'Action, Thriller',
                'duration': '2h 26m',
                'rating': 4.5,
                'description': 'An Indian spy takes on mercenaries with nefarious plans.',
                'release_date': date(2023, 1, 25)
            },
            {
                'title': 'Jawan',
                'poster': 'https://picsum.photos/seed/jawan/400/600',
                'genre': 'Action, Drama',
                'duration': '2h 49m',
                'rating': 4.8,
                'description': 'A man set to rectify the wrongs in the society.',
                'release_date': date(2023, 9, 7)
            },
            {
                'title': 'Animal',
                'poster': 'https://picsum.photos/seed/animal/400/600',
                'genre': 'Action, Crime',
                'duration': '3h 21m',
                'rating': 4.2,
                'description': 'The complex relationship between a father and son.',
                'release_date': date(2023, 12, 1)
            }
        ]

        movies = []
        for m_data in movies_data:
            movie, _ = Movie.objects.get_or_create(title=m_data['title'], defaults=m_data)
            movies.append(movie)

        # Theaters in UP
        theaters_data = [
            {'name': 'PVR Phoenix', 'city': 'Lucknow', 'screens': 4},
            {'name': 'Inox Riverside', 'city': 'Kanpur', 'screens': 6}
        ]

        theaters = []
        for t_data in theaters_data:
            theater, _ = Theater.objects.get_or_create(name=t_data['name'], defaults=t_data)
            theaters.append(theater)

        # Shows
        times = ['10:00 AM', '01:30 PM', '05:00 PM', '08:15 PM', '11:30 PM']
        prices = [250, 300, 350, 400, 450]

        for movie in movies:
            for theater in theaters:
                for i in range(5):
                    Show.objects.get_or_create(
                        movie=movie,
                        theater=theater,
                        time=times[i],
                        defaults={'price': Decimal(prices[i])}
                    )

        self.stdout.write(self.style.SUCCESS('Successfully seeded database!'))
