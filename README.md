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

## Návrhy k návštěvě přes GitHub Pages

GitHub Pages neumí samo zapisovat do souborů. Připravený Cloudflare Worker proto ukládá návrhy do `visit-suggestions.json` v tomto repozitáři. Návrhy se zobrazují v aplikaci v části **Návrhy k návštěvě**, ale nepřidávají se do mapových dat. Soubor je veřejný a kdokoli ho může číst; návštěvníci webu ho nemohou přepisovat ani mazat. Nový návrh lze přidat pouze se soukromým přístupovým klíčem, který Worker ověří.
Odesílání je navíc omezené na 10 pokusů za minutu z jedné IP adresy.

1. Přihlas se do Cloudflare a autorizuj Wrangler:

   ```powershell
   cd worker
   npx wrangler login
   ```

2. V GitHubu vytvoř fine-grained access token omezený na repozitář `TonkovaPivniAnatomie` s oprávněním **Contents: Read and write**. Vlož ho jako Worker secret; vytvoř také vlastní dlouhý přístupový klíč pro odesílání návrhů:

   ```powershell
   npx wrangler secret put GITHUB_TOKEN
   npx wrangler secret put SUBMISSION_PASSWORD
   npx wrangler deploy
   ```

   Hodnoty se zadávají interaktivně a nepatří do zdrojových souborů. Worker umí návrhy pouze přidávat; nemá endpoint pro úpravu ani mazání. Přístupový token se nikdy neposílá do prohlížeče.

3. Wrangler při nasazení vypíše adresu Workeru ve tvaru `https://tonkova-pivni-navrhy.<subdoména>.workers.dev`. Tuto adresu vlož do `api-config.js`:

   ```js
   window.PUB_SUBMISSIONS_API = "https://tonkova-pivni-navrhy.<subdoména>.workers.dev";
   ```

4. Změnu `api-config.js` nahraj do `main`. Po nasazení Pages načte seznam návrhů z Workeru; při odesílání se zadává `SUBMISSION_PASSWORD`.

Soubor lze veřejně zobrazit na `https://wareznavzdy.github.io/TonkovaPivniAnatomie/visit-suggestions.json`. Návrhy proto neobsahují soukromé poznámky. Vlastník repozitáře si samozřejmě ponechává možnost soubory měnit přímo na GitHubu.

## Poznámky a data

- `userReviewed` označuje podnik, který jsme navštívili. Číselné skóre se zobrazuje pouze u vlastního hodnocení.
- U podniků bez vlastní návštěvy jsou informace zobrazené jako informace o podniku, ne jako naše zkušenost.
- U existujících záznamů nejsou data návštěvy ani ověření ceny k dispozici. Detail umožňuje je doplnit.
- Ceny a nabídka se mohou měnit; datum ověření se uvádí pouze tehdy, když je známé.
- Vlastní poznámky a data z detailu se ukládají do místního prohlížeče, případně přes server do `pubs.json`.
