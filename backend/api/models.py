
from django.db import models
from django.contrib.auth.models import User

class Movie(models.Model):
    title = models.CharField(max_length=255)
    poster = models.URLField()
    genre = models.CharField(max_length=255) # Comma separated
    duration = models.CharField(max_length=50)
    rating = models.FloatField(default=0.0)
    description = models.TextField()
    release_date = models.DateField()

    def __str__(self):
        return self.title

class Theater(models.Model):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    screens = models.IntegerField(default=1)
    # Each theater is managed by a specific user
    manager = models.OneToOneField(User, on_delete=models.SET_NULL, related_name='managed_theater', null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.city}"

class Show(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='shows')
    theater = models.ForeignKey(Theater, on_delete=models.CASCADE, related_name='shows')
    time = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"{self.movie.title} at {self.theater.name} ({self.time})"

class Booking(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    show = models.ForeignKey(Show, on_delete=models.CASCADE)
    seats = models.CharField(max_length=255) # Comma separated seat IDs
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Booking {self.id} for {self.user.username}"
