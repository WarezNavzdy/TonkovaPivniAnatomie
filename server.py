#!/usr/bin/env python3
"""
Jednoduchý lokální server s REST API pro Pražskou pivní mapu.
Spuštění: python server.py
Webová adresa: http://localhost:8080
API endpointy:
  - GET  /api/pubs       (vrátí všechny hospody)
  - GET  /api/pubs/<id>  (vrátí detail jedné hospody)
  - POST /api/pubs       (přidá novou hospodu)
  - PUT  /api/pubs/<id>  (aktualizuje poznámky / hodnocení)
  - DELETE /api/pubs/<id>(smaže hospodu)
"""

import http.server
import socketserver
import json
import os
import sys
import urllib.parse

# Zajištění podpory UTF-8 na Windows konzoli
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PORT = 8080
DATA_FILE = os.path.join(os.path.dirname(__file__), "pubs.json")
SUBMISSIONS_FILE = os.path.join(os.path.dirname(__file__), "pub-submissions.json")

# Pokud pubs.json ještě neexistuje, inicializujeme ho z data.js
def ensure_data_file():
    if not os.path.exists(DATA_FILE):
        try:
            with open(os.path.join(os.path.dirname(__file__), "data.js"), "r", encoding="utf-8") as f:
                content = f.read()
                # Extrahujeme pole initialPubs
                start = content.find("const initialPubs = [")
                if start != -1:
                    start = content.find("[", start)
                    end = content.find("];\n", start) + 1
                    json_text = content[start:end]
                    # Nahradíme případné komentáře nebo načteme přes node/json
                    # Pro jistotu použijeme fallback python parser nebo spuštění node
                    pass
        except Exception:
            pass

ensure_data_file()

class PubsRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Povolit CORS pro snadný vývoj
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def load_pubs(self):
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def save_pubs(self, pubs):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(pubs, f, ensure_ascii=False, indent=2)

    def load_submissions(self):
        if os.path.exists(SUBMISSIONS_FILE):
            with open(SUBMISSIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def save_submissions(self, submissions):
        with open(SUBMISSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(submissions, f, ensure_ascii=False, indent=2)

    def send_json(self, status, payload):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))

    def read_json_body(self):
        length = int(self.headers.get('Content-Length', 0))
        try:
            value = json.loads(self.rfile.read(length).decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None
        return value if isinstance(value, dict) else None

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/pubs":
            pubs = self.load_pubs()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(pubs, ensure_ascii=False).encode('utf-8'))
            return
        elif parsed.path == "/api/submissions":
            self.send_json(200, self.load_submissions())
            return
        elif parsed.path.startswith("/api/pubs/"):
            pub_id = parsed.path.replace("/api/pubs/", "")
            pubs = self.load_pubs()
            pub = next((p for p in pubs if p.get("id") == pub_id), None)
            if pub:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(pub, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(404)
                self.end_headers()
            return

        # Statické soubory
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/submissions":
            submission = self.read_json_body()
            if not submission or not isinstance(submission.get("id"), str):
                self.send_json(400, {"error": "Návrh musí obsahovat ID."})
                return

            submissions = self.load_submissions()
            if any(item.get("id") == submission["id"] for item in submissions):
                self.send_json(409, {"error": "Návrh s tímto ID už existuje."})
                return

            submissions.insert(0, submission)
            self.save_submissions(submissions)
            self.send_json(201, {"success": True, "submission": submission})
            return

        path_parts = [urllib.parse.unquote(part) for part in parsed.path.strip("/").split("/")]
        if len(path_parts) == 4 and path_parts[:2] == ["api", "submissions"] and path_parts[3] == "approve":
            submission_id = path_parts[2]
            submissions = self.load_submissions()
            submission = next((item for item in submissions if item.get("id") == submission_id), None)
            pubs = self.load_pubs()
            existing_pub = next((pub for pub in pubs if pub.get("id") == submission_id), None)
            if submission is None:
                if existing_pub is not None:
                    self.send_json(200, {"success": True, "pub": existing_pub})
                else:
                    self.send_json(404, {"error": "Návrh nebyl nalezen."})
                return

            approved_pub = {key: value for key, value in submission.items() if key != "submittedAt"}
            if existing_pub is None:
                pubs.insert(0, approved_pub)
                self.save_pubs(pubs)
            submissions = [item for item in submissions if item.get("id") != submission_id]
            self.save_submissions(submissions)
            self.send_json(200, {"success": True, "pub": approved_pub})
            return

        if self.path == "/api/pubs":
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            new_pub = json.loads(body.decode('utf-8'))

            pubs = self.load_pubs()
            pubs.insert(0, new_pub)
            self.save_pubs(pubs)

            self.send_response(201)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "pub": new_pub}, ensure_ascii=False).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def do_PUT(self):
        if self.path.startswith("/api/pubs/"):
            pub_id = self.path.replace("/api/pubs/", "")
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            updated_data = json.loads(body.decode('utf-8'))

            pubs = self.load_pubs()
            for i, p in enumerate(pubs):
                if p.get("id") == pub_id:
                    pubs[i].update(updated_data)
                    self.save_pubs(pubs)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "pub": pubs[i]}, ensure_ascii=False).encode('utf-8'))
                    return

            self.send_response(404)
            self.end_headers()
            return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path_parts = [urllib.parse.unquote(part) for part in parsed.path.strip("/").split("/")]
        if len(path_parts) == 3 and path_parts[:2] == ["api", "submissions"]:
            submission_id = path_parts[2]
            submissions = self.load_submissions()
            updated = [item for item in submissions if item.get("id") != submission_id]
            if len(updated) == len(submissions):
                self.send_json(404, {"error": "Návrh nebyl nalezen."})
                return
            self.save_submissions(updated)
            self.send_json(200, {"success": True})
            return

        if self.path.startswith("/api/pubs/"):
            pub_id = self.path.replace("/api/pubs/", "")
            pubs = self.load_pubs()
            new_pubs = [p for p in pubs if p.get("id") != pub_id]
            self.save_pubs(new_pubs)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == "__main__":
    # Vytvoření pubs.json z data.js pomocí node, pokud neexistuje
    if not os.path.exists(DATA_FILE):
        try:
            import subprocess
            subprocess.run(["node", "-e", "const { initialPubs } = require('./data.js'); require('fs').writeFileSync('pubs.json', JSON.stringify(initialPubs, null, 2));"])
        except Exception:
            pass

    server_address = ('', PORT)
    with socketserver.TCPServer(server_address, PubsRequestHandler) as httpd:
        print(f"🍺 Tonkova pivní mapa běží na: http://localhost:{PORT}")
        print(f"📡 REST API je dostupné na:   http://localhost:{PORT}/api/pubs")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer zastaven.")
