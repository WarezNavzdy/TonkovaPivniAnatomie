# Tonkova pivní anatomie

Jednostránková mapa pražských hospod postavená na Leafletu. Seznam a výchozí poznámky jsou v `pubs.json` a `data.js`; aplikace načítá `index.html`, `styles.css`, `app-utils.js` a `app.js`.

## Spuštění

Stránku lze otevřít přímo v prohlížeči přes `index.html`. Mapové dlaždice OpenStreetMap se načítají z internetu.

Pro lokální REST API spusť v této složce:

```powershell
python server.py
```

Pak otevři `http://localhost:8080`. Server čte a zapisuje `pubs.json`. API poskytuje:

- `GET /api/pubs` – seznam podniků
- `GET /api/pubs/<id>` – jeden podnik
- `POST /api/pubs` – přidání podniku
- `PUT /api/pubs/<id>` – úprava podniku
- `DELETE /api/pubs/<id>` – smazání podniku
- `GET /api/submissions` – návrhy čekající na schválení
- `POST /api/submissions` – odeslání návrhu do fronty
- `POST /api/submissions/<id>/approve` – schválení a přidání do mapy
- `DELETE /api/submissions/<id>` – odebrání návrhu z fronty

Bez serveru se změny ukládají v `localStorage` prohlížeče; nejde tedy o sdílené úložiště.
Neschválené návrhy se ukládají zvlášť do `pub-submissions.json` a v seznamu podniků ani na mapě se nezobrazují. Schvalovací fronta není chráněná přihlášením — kdokoli s přístupem k aplikaci může návrh schválit nebo odebrat.

## Návrhy hospod

Tlačítko **Navrhnout hospodu** otevře [Google Formulář pro návrhy](https://forms.gle/5bmLsGDhwgvkP8c88) v novém panelu. Odpovědi se spravují ve formuláři Google a nepřidávají se automaticky do mapy.

## Poznámky a data

- `userReviewed` označuje podnik, který jsme navštívili. Číselné skóre se zobrazuje pouze u vlastního hodnocení.
- U podniků bez vlastní návštěvy jsou informace zobrazené jako informace o podniku, ne jako naše zkušenost.
- U existujících záznamů nejsou data návštěvy ani ověření ceny k dispozici. Detail umožňuje je doplnit.
- Ceny a nabídka se mohou měnit; datum ověření se uvádí pouze tehdy, když je známé.
- Vlastní poznámky a data z detailu se ukládají do místního prohlížeče, případně přes server do `pubs.json`.
