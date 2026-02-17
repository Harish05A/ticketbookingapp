
from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    
    # Content
    path('movies/', views.MovieList.as_view(), name='movie-list'),
    path('theaters/', views.TheaterList.as_view(), name='theater-list'),
    path('shows/', views.ShowList.as_view(), name='show-list'),
    
    # Bookings
    path('bookings/', views.BookingCreate.as_view(), name='booking-create'),
    
    # Admin
    path('admin/analytics/', views.AdminAnalytics.as_view(), name='admin-analytics'),
    path('admin/create-theater-admin/', views.CreateTheaterAdmin.as_view(), name='create-theater-admin'),
]
