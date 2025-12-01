import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 5500
URL = f'http://localhost:{PORT}/'

# open browser
webbrowser.open(URL)

# start server
server = HTTPServer(('localhost', PORT), SimpleHTTPRequestHandler)
print(f"Serving at {URL}")
server.serve_forever()
