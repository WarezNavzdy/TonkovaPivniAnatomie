#!/usr/bin/env python3
"""Lokální webový server a REST API pro Tonkovu pivní anatomii."""

import json
import math
import os
import tempfile
import threading
import urllib.parse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HOST = "127.0.0.1"
PORT = 8080
MAX_BODY_BYTES = 1_048_576
BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "pubs.json"
DATA_LOCK = threading.RLock()


class PubsRequestHandler(SimpleHTTPRequestHandler):
    def load_pubs(self):
        if not DATA_FILE.exists():
            return []
        with DATA_FILE.open("r", encoding="utf-8") as data_file:
            pubs = json.load(data_file)
        if not isinstance(pubs, list) or any(not isinstance(pub, dict) for pub in pubs):
            raise ValueError("pubs.json must contain a JSON array of objects")
        return pubs

    def save_pubs(self, pubs):
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=DATA_FILE.parent,
                prefix=f"{DATA_FILE.name}.",
                suffix=".tmp",
                delete=False,
            ) as data_file:
                temporary_path = Path(data_file.name)
                json.dump(pubs, data_file, ensure_ascii=False, indent=2)
                data_file.write("\n")
            os.replace(temporary_path, DATA_FILE)
        finally:
            if temporary_path is not None and temporary_path.exists():
                temporary_path.unlink()

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError as error:
            raise ValueError("Content-Length must be a valid integer") from error
        if length <= 0:
            raise ValueError("A JSON request body is required")
        if length > MAX_BODY_BYTES:
            raise OverflowError("Request body is too large")

        body = self.rfile.read(length)
        if len(body) != length:
            raise ValueError("Request body ended unexpectedly")
        try:
            value = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError("Request body must be valid UTF-8 JSON") from error
        if not isinstance(value, dict):
            raise ValueError("Request body must be a JSON object")
        return value

    def handle_api_failure(self, error):
        self.log_error("API request failed: %s", error)
        self.send_json(500, {"error": "Server nemohl zpracovat požadavek."})

    @staticmethod
    def get_pub_id(path):
        prefix = "/api/pubs/"
        if not path.startswith(prefix):
            return None
        encoded_id = path[len(prefix):]
        if not encoded_id or "/" in encoded_id:
            return None
        return urllib.parse.unquote(encoded_id)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Allow", "GET, HEAD, POST, PUT, DELETE, OPTIONS")
        self.end_headers()

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path == "/api/pubs":
            try:
                with DATA_LOCK:
                    pubs = self.load_pubs()
                self.send_json(200, pubs)
            except (OSError, json.JSONDecodeError, ValueError) as error:
                self.handle_api_failure(error)
            return

        pub_id = self.get_pub_id(path)
        if pub_id is not None:
            try:
                with DATA_LOCK:
                    pub = next((item for item in self.load_pubs() if item.get("id") == pub_id), None)
                if pub is None:
                    self.send_json(404, {"error": "Podnik nebyl nalezen."})
                else:
                    self.send_json(200, pub)
            except (OSError, json.JSONDecodeError, ValueError) as error:
                self.handle_api_failure(error)
            return

        if path.startswith("/api/"):
            self.send_json(404, {"error": "API endpoint neexistuje."})
            return
        super().do_GET()

    def do_POST(self):
        if urllib.parse.urlsplit(self.path).path != "/api/pubs":
            self.send_json(404, {"error": "API endpoint neexistuje."})
            return

        try:
            new_pub = self.read_json_body()
        except OverflowError as error:
            self.send_json(413, {"error": str(error)})
            return
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return

        pub_id = new_pub.get("id")
        name = new_pub.get("name")
        lat = new_pub.get("lat")
        lng = new_pub.get("lng")
        if not isinstance(pub_id, str) or not pub_id.strip() or not isinstance(name, str) or not name.strip():
            self.send_json(400, {"error": "Podnik musí obsahovat neprázdné ID a název."})
            return
        if (
            isinstance(lat, bool)
            or isinstance(lng, bool)
            or not isinstance(lat, (int, float))
            or not isinstance(lng, (int, float))
            or not math.isfinite(lat)
            or not math.isfinite(lng)
            or not -90 <= lat <= 90
            or not -180 <= lng <= 180
        ):
            self.send_json(400, {"error": "Podnik musí obsahovat platné souřadnice."})
            return

        try:
            with DATA_LOCK:
                pubs = self.load_pubs()
                if any(pub.get("id") == pub_id for pub in pubs):
                    self.send_json(409, {"error": "Podnik s tímto ID už existuje."})
                    return
                pubs.insert(0, new_pub)
                self.save_pubs(pubs)
        except (OSError, json.JSONDecodeError, ValueError) as error:
            self.handle_api_failure(error)
            return
        self.send_json(201, {"success": True, "pub": new_pub})

    def do_PUT(self):
        pub_id = self.get_pub_id(urllib.parse.urlsplit(self.path).path)
        if pub_id is None:
            self.send_json(404, {"error": "API endpoint neexistuje."})
            return

        try:
            updated_data = self.read_json_body()
        except OverflowError as error:
            self.send_json(413, {"error": str(error)})
            return
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        if "id" in updated_data and updated_data["id"] != pub_id:
            self.send_json(400, {"error": "ID podniku nelze změnit."})
            return

        try:
            with DATA_LOCK:
                pubs = self.load_pubs()
                pub = next((item for item in pubs if item.get("id") == pub_id), None)
                if pub is None:
                    self.send_json(404, {"error": "Podnik nebyl nalezen."})
                    return
                pub.update(updated_data)
                self.save_pubs(pubs)
        except (OSError, json.JSONDecodeError, ValueError) as error:
            self.handle_api_failure(error)
            return
        self.send_json(200, {"success": True, "pub": pub})

    def do_DELETE(self):
        pub_id = self.get_pub_id(urllib.parse.urlsplit(self.path).path)
        if pub_id is None:
            self.send_json(404, {"error": "API endpoint neexistuje."})
            return

        try:
            with DATA_LOCK:
                pubs = self.load_pubs()
                updated_pubs = [pub for pub in pubs if pub.get("id") != pub_id]
                if len(updated_pubs) == len(pubs):
                    self.send_json(404, {"error": "Podnik nebyl nalezen."})
                    return
                self.save_pubs(updated_pubs)
        except (OSError, json.JSONDecodeError, ValueError) as error:
            self.handle_api_failure(error)
            return
        self.send_json(200, {"success": True})


if __name__ == "__main__":
    request_handler = partial(PubsRequestHandler, directory=str(BASE_DIR))
    with ThreadingHTTPServer((HOST, PORT), request_handler) as server:
        print(f"Tonkova pivní mapa běží na: http://{HOST}:{PORT}")
        print(f"REST API: http://{HOST}:{PORT}/api/pubs")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer zastaven.")
