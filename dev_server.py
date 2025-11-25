"""
Lokaler Entwicklungsserver mit sauberem MIME-Type für ES-Module.

Dieser Server erweitert ``http.server`` um eine korrekte Auslieferung von
``.mjs``-Dateien als ``application/javascript``. Damit funktionieren die Engine-
Imports im lokalen Betrieb genauso wie auf GitHub Pages.

Verwendung (wie bisher in ``index_start.bat``):
    python dev_server.py --port 8000 --bind 127.0.0.1 --directory .

Designentscheidungen
--------------------
* Wir nutzen ``ThreadingHTTPServer`` für parallele Requests; das entspricht dem
  Verhalten von ``python -m http.server``.
* Die Methode ``guess_type`` wird defensiv überschrieben, damit ``.mjs`` immer
  einen JavaScript-MIME-Type erhält – unabhängig von der Python-Version oder
  lokalen MIME-Datenbank.
"""
from __future__ import annotations

import argparse
import contextlib
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class ModuleAwareRequestHandler(SimpleHTTPRequestHandler):
    """HTTP-Handler, der ``.mjs``-Dateien korrekt als JavaScript ausliefert.

    ``SimpleHTTPRequestHandler`` nutzt das ``mimetypes``-Modul, das nicht
    garantiert weiß, dass ``.mjs`` JavaScript ist (gerade auf Windows oder mit
    neuen Python-Versionen). Durch das Überschreiben von ``guess_type`` sorgen
    wir dafür, dass ES-Module lokal zuverlässig geladen werden.
    """

    # Fallback-MIME-Type für ES-Module
    MJS_MIME_TYPE: str = "application/javascript"

    def guess_type(self, path: str) -> str:
        """Gibt den MIME-Type für den angefragten Pfad zurück.

        Parameters
        ----------
        path: str
            Der angefragte Dateipfad relativ zum Server-Stamm.

        Returns
        -------
        str
            Der ermittelte MIME-Type. Für ``.mjs`` erzwingen wir
            ``application/javascript``; für alle anderen Dateien verwenden wir
            die Standard-Erkennung.
        """

        # Erkennen wir eine ``.mjs``-Datei, liefern wir sie explizit als
        # JavaScript aus, damit Browser den Modul-Import akzeptieren.
        if path.endswith(".mjs"):
            return self.MJS_MIME_TYPE

        # Für alle anderen Dateitypen verwenden wir die robuste
        # Standard-Implementierung.
        return super().guess_type(path)


def parse_arguments() -> argparse.Namespace:
    """Parst die CLI-Parameter für den Entwicklungsserver.

    Returns
    -------
    argparse.Namespace
        Enthält Bind-Adresse, Port und Basisverzeichnis.
    """

    parser = argparse.ArgumentParser(description="Leichter Entwicklungsserver mit .mjs-Unterstützung")
    parser.add_argument("--bind", default="127.0.0.1", help="Adresse, an die der Server gebunden wird (Default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port, den der Server nutzt (Default: 8000)")
    parser.add_argument(
        "--directory",
        default=os.getcwd(),
        help="Basisverzeichnis für statische Dateien (Default: aktuelles Arbeitsverzeichnis)",
    )
    return parser.parse_args()


def run_server(bind_address: str, port: int, directory: str) -> None:
    """Startet den Entwicklungsserver mit Modul-Unterstützung.

    Parameters
    ----------
    bind_address: str
        IP-Adresse oder Hostname, auf den der Server lauscht.
    port: int
        TCP-Port, den der Server nutzt.
    directory: str
        Verzeichnis, aus dem statische Dateien ausgeliefert werden.
    """

    # Wir kapseln den Directory-Wechsel, damit der Handler korrekt relativ
    # zur Projektwurzel arbeitet und Browser alle Assets finden.
    with change_working_directory(directory):
        handler = ModuleAwareRequestHandler
        server = ThreadingHTTPServer((bind_address, port), handler)

        print(f"Starte Entwicklungsserver auf http://{bind_address}:{port} (root: {directory})")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStoppe Server (KeyboardInterrupt)")
        finally:
            server.server_close()


@contextlib.contextmanager
def change_working_directory(path: str):
    """Kontextmanager zum temporären Wechsel des Arbeitsverzeichnisses.

    Parameters
    ----------
    path: str
        Zielverzeichnis für den Kontext.

    Yields
    ------
    None
        Der Kontext gibt nichts zurück; nach Verlassen wird das ursprüngliche
        Verzeichnis wiederhergestellt.
    """

    original_cwd = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(original_cwd)


def main() -> None:
    """CLI-Einstiegspunkt für den Entwicklungsserver."""

    args = parse_arguments()
    run_server(bind_address=args.bind, port=args.port, directory=args.directory)


if __name__ == "__main__":
    main()
