
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .models import Movie, Theater, Show, Booking
from .serializers import MovieSerializer, TheaterSerializer, ShowSerializer, BookingSerializer, UserSerializer
import razorpay
from django.conf import settings

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

# --- AUTH VIEWS ---

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.create_user(username=username, password=password, email=email)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            user_data = UserSerializer(user).data
            # Inject managed theater data for frontend console
            if hasattr(user, 'managed_theater'):
                user_data['managedTheater'] = {
                    'id': user.managed_theater.id,
                    'name': user.managed_theater.name
                }
            user_data['is_superuser'] = user.is_superuser
            user_data['is_staff'] = user.is_staff
            return Response({'token': token.key, 'user': user_data})
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class CreateTheaterAdmin(APIView):
    permission_classes = [permissions.IsAdminUser] # Superuser is technically an admin user
    def post(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Only superusers can create theaters'}, status=status.HTTP_403_FORBIDDEN)
            
        username = request.data.get('username')
        password = request.data.get('password')
        t_name = request.data.get('theaterName')
        city = request.data.get('city')
        screens = request.data.get('screens', 1)

        # 1. Create User
        user = User.objects.create_user(username=username, password=password, is_staff=True)
        
        # 2. Create Theater
        theater = Theater.objects.create(
            name=t_name,
            city=city,
            screens=screens,
            manager=user
        )
        
        return Response({'success': True, 'theater_id': theater.id}, status=status.HTTP_201_CREATED)

# --- CORE BUSINESS VIEWS ---

class MovieList(generics.ListCreateAPIView):
    queryset = Movie.objects.all()
    serializer_class = MovieSerializer
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

class TheaterList(generics.ListAPIView):
    queryset = Theater.objects.all()
    serializer_class = TheaterSerializer

class ShowList(generics.ListAPIView):
    serializer_class = ShowSerializer
    def get_queryset(self):
        movie_id = self.request.query_params.get('movie_id')
        if movie_id:
            return Show.objects.filter(movie_id=movie_id)
        return Show.objects.all()

class BookingCreate(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        data = request.data.copy()
        data['user'] = request.user.id
        serializer = BookingSerializer(data=data)
        if serializer.is_valid():
            booking = serializer.save()
            try:
                order_data = {
                    "amount": int(booking.amount * 100),
                    "currency": "INR",
                    "receipt": f"receipt_{booking.id}",
                }
                payment_order = client.order.create(data=order_data)
                return Response({
                    "booking": serializer.data,
                    "payment_order": payment_order
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": f"Payment Gateway Error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminAnalytics(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        # Scoped Analytics
        if request.user.is_superuser:
            bookings = Booking.objects.filter(status='CONFIRMED')
            movies = Movie.objects.all()
        else:
            # Filter by the theater managed by the user
            theater = getattr(request.user, 'managed_theater', None)
            if not theater:
                return Response({'error': 'No theater associated'}, status=400)
            bookings = Booking.objects.filter(show__theater=theater, status='CONFIRMED')
            movies = Movie.objects.filter(shows__theater=theater).distinct()

        total_revenue = sum(b.amount for b in bookings)
        total_bookings = bookings.count()
        movie_stats = []
        for movie in movies:
            count = bookings.filter(show__movie=movie).count()
            movie_stats.append({"name": movie.title, "bookings": count})
            
        return Response({
            "total_revenue": total_revenue,
            "total_bookings": total_bookings,
            "movie_popularity": movie_stats
        })
