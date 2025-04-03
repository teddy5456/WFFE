import urllib.request
import json

url = "http://localhost:8000/api/register"
data = {
    "fullName": "Teddy Wambua",
    "email": "teddywambua5456@gmail.com",
    "phone": "0740862046",
    "business": "school",
    "password": "Teddy@2020."
}

# Convert data to JSON bytes
params = json.dumps(data).encode('utf-8')

# Create request
req = urllib.request.Request(
    url,
    data=params,
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        print("Status Code:", response.status)
        print("Response:", json.loads(response.read().decode('utf-8')))
except urllib.error.HTTPError as e:
    print("Error Status Code:", e.code)
    print("Error Response:", json.loads(e.read().decode('utf-8')))