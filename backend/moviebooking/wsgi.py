
import os
import sys
from django.core.wsgi import get_wsgi_application

# Add the backend directory to sys.path so 'api' app can be found
path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if path not in sys.path:
    sys.path.append(path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'moviebooking.settings')

application = get_wsgi_application()
app = application
