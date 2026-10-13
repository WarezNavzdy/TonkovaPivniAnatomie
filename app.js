// Tonkova pivní anatomie - Aplikační logika
(function () {
  const STORAGE_KEY = "prague_pubs_data_v1";
  const SUBMISSIONS_KEY = "prague_pubs_submissions_v1";
  const submissionsApiUrl = typeof window.PUB_SUBMISSIONS_API === "string"
    ? window.PUB_SUBMISSIONS_API.replace(/\/+$/, "")
    : "";
  const usesRemoteSubmissions = Boolean(submissionsApiUrl);
  const {
    escapeHtml,
    getBeerSummary,
    getPubNotes,
    getPubTags,
    getPubText,
    getRatingBadgeClass
  } = window.PubMapUtils;

  function getFallbackPubs() {
    return Array.isArray(window.initialPubs) ? window.initialPubs : [];
  }

  function formatDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Neuvedeno";
    const [year, month, day] = value.split("-");
    return `${day}.${month}.${year}`;
  }

  // Načti výchozí data hned, aby byl seznam dostupný ještě před čtením úložiště.
  let pubs = JSON.parse(JSON.stringify(getFallbackPubs()));
  let pendingPubs = [];

  let currentFilter = "all";
  let currentSearch = "";
  let currentSort = "rating-desc";
  let activePubId = null;
  let map = null;
  let markers = {};
  let currentRoutePolyline = null;
  let currentTileLayer = null;
  let activeDialog = null;
  let previouslyFocusedElement = null;

  // Mapové vrstvy - 100% ZDARMA, BEZ VODOZNAKŮ A BEZ NUTNOSTI JAKÉHOKOLIV API KLÍČE!
  const tileConfig = {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> přispěvatelé',
    maxZoom: 19
  };

  // Načtení dat (nejdřív localStorage, pokud tam jsou platná data, jinak fallback)
  function loadPubsData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          pubs = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn("Chyba při čtení localStorage:", e);
    }

    const fallback = getFallbackPubs();
    if (fallback.length > 0) {
      pubs = JSON.parse(JSON.stringify(fallback));
    }
  }

  function loadPendingPubs() {
    if (usesRemoteSubmissions) {
      pendingPubs = [];
      renderSubmissionCount();
      return;
    }

    try {
      const saved = localStorage.getItem(SUBMISSIONS_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      pendingPubs = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Chyba při čtení návrhů z localStorage:", error);
      pendingPubs = [];
    }
    renderSubmissionCount();
  }

  function savePendingPubs() {
    if (usesRemoteSubmissions) {
      renderSubmissionCount();
      return true;
    }

    try {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(pendingPubs));
      renderSubmissionCount();
      return true;
    } catch (error) {
      console.warn("Uložení návrhů do localStorage se nezdařilo:", error);
      showToast("Návrh se nepodařilo uložit.");
      return false;
    }
  }

  function renderSubmissionCount() {
    const button = document.getElementById("btn-submissions");
    if (!button) return;
    button.hidden = pendingPubs.length === 0;
    const label = usesRemoteSubmissions ? "Návrhy k návštěvě" : "Návrhy ke schválení";
    button.textContent = `${label} (${pendingPubs.length})`;
  }

  // Asynchronní pokus o načtení z backendového REST API (pokud běží server.py)
  async function syncWithBackendIfAvailable() {
    if (!window.location.protocol.startsWith("http")) return;
    if (window.location.hostname.endsWith(".github.io")) return;

    if (usesRemoteSubmissions) {
      try {
        const response = await fetch(`${submissionsApiUrl}/api/submissions`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const suggestions = await response.json();
        if (!Array.isArray(suggestions)) throw new Error("Neplatný seznam návrhů");
        pendingPubs = suggestions;
        renderSubmissionCount();
      } catch (error) {
        console.warn("Načtení návrhů z GitHubu se nezdařilo:", error);
        showToast("Návrhy se nepodařilo načíst z GitHubu.");
      }
      return;
    }

    try {
      const resp = await fetch("/api/pubs");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const apiPubs = await resp.json();
      if (Array.isArray(apiPubs) && apiPubs.length > 0) {
        pubs = apiPubs;
        renderMarkers();
        renderList();
      }
      const submissionsResponse = await fetch("/api/submissions");
      if (!submissionsResponse.ok) throw new Error(`HTTP ${submissionsResponse.status}`);
      const apiSubmissions = await submissionsResponse.json();
      if (!Array.isArray(apiSubmissions)) throw new Error("Neplatný seznam návrhů");
      const serverSubmissionIds = new Set(apiSubmissions.map(pub => pub.id));
      const publishedIds = new Set(Array.isArray(apiPubs) ? apiPubs.map(pub => pub.id) : []);
      const unsynced = pendingPubs.filter(pub =>
        pub.pendingSync && !serverSubmissionIds.has(pub.id) && !publishedIds.has(pub.id)
      );
      pendingPubs = [...apiSubmissions, ...unsynced];
      savePendingPubs();

      const unsyncedIds = new Set();
      for (const proposal of unsynced) {
        const payload = { ...proposal };
        delete payload.pendingSync;
        try {
          const response = await fetch("/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!response.ok && response.status !== 409) throw new Error(`HTTP ${response.status}`);
        } catch (error) {
          console.warn(`Synchronizace návrhu "${proposal.name}" se nezdařila:`, error);
          unsyncedIds.add(proposal.id);
        }
      }
      if (unsynced.length > 0) {
        const refreshedResponse = await fetch("/api/submissions");
        if (!refreshedResponse.ok) throw new Error(`HTTP ${refreshedResponse.status}`);
        const refreshed = await refreshedResponse.json();
        if (!Array.isArray(refreshed)) throw new Error("Neplatný seznam návrhů");
        const refreshedIds = new Set(refreshed.map(pub => pub.id));
        pendingPubs = [
          ...refreshed,
          ...unsynced.filter(pub => unsyncedIds.has(pub.id) && !refreshedIds.has(pub.id))
        ];
        savePendingPubs();
      }
    } catch (error) {
      console.warn("Synchronizace s REST API se nezdařila:", error);
      showToast("Serverové API není dostupné. Data zůstávají uložená v tomto prohlížeči.");
    }
  }

  function savePubsData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pubs));
      return true;
    } catch (error) {
      console.warn("Uložení dat do localStorage se nezdařilo:", error);
      showToast("Data se nepodařilo uložit do tohoto prohlížeče.");
      return false;
    }
  }

  async function sendBackendRequest(path, options) {
    if (!window.location.protocol.startsWith("http")) return;

    try {
      const response = await fetch(path, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.warn("Uložení do REST API se nezdařilo:", error);
      showToast("Změna zůstala uložená jen v tomto prohlížeči; server ji nepřijal.");
    }
  }

  // Inicializace mapy Leaflet
  function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    // Střed historické Prahy
    map = L.map("map", {
      center: [50.0862, 14.419],
      zoom: 14,
      zoomControl: false
    });

    // Zoom tlačítka vpravo dole
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Výchozí světlá vrstva OSM (funguje 100% bez API klíče a bez vodoznaků)
    setMapTheme("light");

    // Vykreslit všechny hospody na mapě
    renderMarkers();

    // Map click pro výběr souřadnic při přidávání hospody
    map.on("click", function (e) {
      if (window.isSelectingLocationOnMap) {
        const { lat, lng } = e.latlng;
        document.getElementById("new-pub-lat").value = lat.toFixed(6);
        document.getElementById("new-pub-lng").value = lng.toFixed(6);
        window.isSelectingLocationOnMap = false;
        showToast(`Souřadnice nastaveny: ${lat.toFixed(4)}, ${lng.toFixed(4)}.`);
        openDialog(document.getElementById("add-pub-modal"));
      }
    });
  }

  function setMapTheme(themeKey) {
    const mapEl = document.getElementById("map");
    if (!map) return;

    if (!currentTileLayer) {
      currentTileLayer = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: tileConfig.maxZoom
      }).addTo(map);
    }

    // Tmavý vs světlý režim
    if (themeKey === "dark") {
      mapEl.classList.add("map-dark-theme");
    } else {
      mapEl.classList.remove("map-dark-theme");
    }

    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === themeKey);
    });
  }

  function getPubMarkerType(pub) {
    const details = [pub.name, pub.beerType, ...(Array.isArray(pub.tags) ? pub.tags : [])]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("cs-CZ");

    if (/rockov|hudb|kabaret|punk|metal|klub/.test(details)) {
      return { label: "hudební podnik", icon: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' };
    }
    if (/pivovar|minipivovar/.test(details)) {
      return { label: "pivovar", icon: '<path d="M3 21h18M5 21V10l4 3v-3l4 3V7h6v14M15 11h1M15 15h1M15 18h1M8 17h2"/><path d="M13 7V4h6v3"/>' };
    }
    if (/bar|kafe|kavár|drink/.test(details)) {
      return { label: "bar nebo kavárna", icon: '<path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z"/><path d="M7 8h10"/>' };
    }
    return { label: "hospoda nebo pivnice", icon: '<path d="M5 7h12v13H5z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M5 11h12M8 4c-1 1 1 1 0 2M12 4c-1 1 1 1 0 2"/>' };
  }

  // Vytvoření stylizovaného HTML markeru
  function createMarkerIcon(pub) {
    let colorClass = "marker-gold";
    if (!pub.userReviewed || !Number.isFinite(pub.rating)) {
      colorClass = "marker-pending";
    } else if (pub.rating >= 9.0) {
      colorClass = "marker-gold";
    } else if (pub.rating >= 8.0) {
      colorClass = "marker-amber";
    } else if (pub.userReviewed) {
      colorClass = "marker-good";
    }

    const markerType = getPubMarkerType(pub);
    const html = `
      <div class="custom-pub-marker ${colorClass}" title="${escapeHtml(pub.name)} — ${markerType.label} (${escapeHtml(pub.userReviewed && Number.isFinite(pub.rating) ? pub.rating + '/10' : 'Nehodnoceno')})">
        <svg class="marker-inner" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${markerType.icon}</svg>
      </div>
    `;

    return L.divIcon({
      html: html,
      className: "pub-marker-wrapper",
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -20]
    });
  }

  // Vykreslení / obnovení markerů na mapě
  function renderMarkers() {
    if (!map) return;

    // Smazat staré markery
    Object.values(markers).forEach((m) => map.removeLayer(m));
    markers = {};

    pubs.forEach((pub) => {
      if (!pub.lat || !pub.lng) return;

      const marker = L.marker([pub.lat, pub.lng], {
        icon: createMarkerIcon(pub)
      }).addTo(map);

      // Popup s rychlým náhledem
      const popupContent = `
        <div class="popup-pub">
          <div class="popup-title">${escapeHtml(pub.name)}</div>
          <div class="popup-beer">${escapeHtml(getBeerSummary(pub) || pub.beerType || "")}</div>
          ${pub.userReviewed
            ? `<div class="popup-quote">${escapeHtml(pub.quote || "Zatím bez poznámky.")}</div>`
            : `<div class="popup-quote">Zatím jsme tu nebyli.</div>`}
          <button class="popup-btn" data-action="open-pub" data-pub-id="${escapeHtml(pub.id)}">
            Otevřít detail
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: true,
        autoPan: true
      });

      marker.on("click", function () {
        selectPub(pub.id, false);
      });

      markers[pub.id] = marker;
    });
  }

  // Filtrování a řazení
  function getFilteredPubs() {
    return pubs.filter((pub) => {
      const notes = getPubNotes(pub);
      const tags = getPubTags(pub);
      const details = getPubText(pub, ["atmosphere", "tags", "notes"]);
      let matchesFilter;

      switch (currentFilter) {
        case "top":
          matchesFilter = pub.userReviewed === true && pub.rating >= 9.0;
          break;
        case "tank":
          matchesFilter = getPubText(pub, ["beerType", "notes"]).includes("tank");
          break;
        case "cheap":
          matchesFilter = /38|50|levn|lidov/i.test(getPubText(pub, ["priceLevel", "notes"]));
          break;
        case "center":
          matchesFilter = /Staré Město|Malá Strana|Hradčany/.test(pub.district || "");
          break;
        case "garden":
          matchesFilter = /zahr|dvůr|dvor|teras/i.test(details);
          break;
        case "underground":
          matchesFilter = /pajzl|underground|punk|rock|stoj|nádraž/i.test(details);
          break;
        case "hipster":
          matchesFilter = /hipster|craft|speciál|kohout/i.test(details);
          break;
        case "reviewed":
          matchesFilter = pub.userReviewed === true;
          break;
        default:
          matchesFilter = true;
      }

      if (!matchesFilter) return false;

      const query = currentSearch.trim().toLowerCase();
      if (!query) return true;

      return [
        pub.name,
        pub.district,
        pub.address,
        pub.beerType,
        pub.beerRating,
        pub.quote,
        pub.atmosphere,
        pub.customUserNote,
        ...tags,
        ...notes
      ].join(" ").toLowerCase().includes(query);
    }).sort((a, b) => {
      switch (currentSort) {
        case "rating-desc":
          if (a.userReviewed !== b.userReviewed) return Number(b.userReviewed) - Number(a.userReviewed);
          return (b.rating || 0) - (a.rating || 0);
        case "rating-asc":
          if (a.userReviewed !== b.userReviewed) return Number(b.userReviewed) - Number(a.userReviewed);
          return (a.rating || 0) - (b.rating || 0);
        case "name-asc":
          return a.name.localeCompare(b.name, "cs");
        case "district":
          return a.district.localeCompare(b.district, "cs");
        default:
          return 0;
      }
    });
  }

  // Vykreslení seznamu hospod v postranním panelu
  function renderList() {
    const filtered = getFilteredPubs();
    const listEl = document.getElementById("pubs-list");
    const countEl = document.getElementById("pubs-count");

    if (!listEl) return;

    if (countEl) {
      countEl.innerHTML = `Zobrazeno <strong>${filtered.length}</strong> z ${escapeHtml(pubs.length)} hospod`;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">—</div>
          <strong>Nic jsme nenašli</strong>
          <p>Zkus upravit hledaný výraz nebo zvolit jiný filtr.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map((pub) => {
      const isActive = pub.id === activePubId;
      const badgeClass = getRatingBadgeClass(pub);
      const tags = getPubTags(pub);

      const ratingText = pub.userReviewed && pub.rating ? `${pub.rating.toLocaleString("cs-CZ")}/10` : "Bez hodnocení";
      const beerSummary = getBeerSummary(pub);

      return `
        <div class="pub-card ${isActive ? 'active' : ''}" data-id="${escapeHtml(pub.id)}" data-action="open-pub" data-pub-id="${escapeHtml(pub.id)}" role="button" tabindex="0">
          <div class="pub-card-header">
            <h3 class="pub-name">${escapeHtml(pub.name)}</h3>
            <span class="rating-badge ${badgeClass}" aria-label="${pub.userReviewed ? 'Naše hodnocení' : 'Bez našeho hodnocení'}: ${escapeHtml(ratingText)}">${escapeHtml(ratingText)}</span>
          </div>
          <div class="pub-district">
            <span>${escapeHtml(pub.district)}</span>
          </div>
          ${beerSummary ? `<div class="pub-beer-tag">${escapeHtml(beerSummary)}</div>` : ''}
          ${pub.userReviewed && pub.quote ? `<div class="pub-quote">${escapeHtml(pub.quote)}</div>` : ''}
          <div class="pub-card-footer">
            <div class="pub-tags">
              ${tags.slice(0, 3).map(t => `<span class="pub-tag">${escapeHtml(t)}</span>`).join('')}
            </div>
            <span class="pub-more-btn">Otevřít detail</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // Výběr hospody (vycentrování mapy + zvýraznění)
  function selectPub(pubId, openDetailDrawer = false) {
    activePubId = pubId;
    const pub = pubs.find(p => p.id === pubId);
    if (!pub) return;

    // Zvýraznění karty v seznamu
    document.querySelectorAll(".pub-card").forEach(card => {
      card.classList.toggle("active", card.dataset.id === pubId);
    });

    // Plynulý přelet mapy
    if (map && pub.lat && pub.lng) {
      map.flyTo([pub.lat, pub.lng], 16, {
        animate: true,
        duration: 1.0
      });

      const marker = markers[pubId];
      if (marker) {
        marker.openPopup();
      }
    }

    if (openDetailDrawer) {
      openDetail(pub);
    }
  }

  // Otevření detailu se všemi poznámkami
  function openDetail(pub) {
    const overlay = document.getElementById("detail-overlay");
    const container = document.getElementById("detail-content");

    const ratingBadgeClass = getRatingBadgeClass(pub);
    const notes = getPubNotes(pub).filter(note => !note.startsWith("[Nová poznámka]:"));
    const tags = getPubTags(pub);
    const beerSummary = getBeerSummary(pub);
    const hasBeenReviewed = pub.userReviewed === true;
    const hasRating = hasBeenReviewed && Number.isFinite(pub.rating);
    const websiteUrl = typeof pub.website === "string" && /^https?:\/\/[^\s"'<>]+$/i.test(pub.website)
      ? escapeHtml(pub.website)
      : "";
    const encodedAddr = encodeURIComponent(pub.name + ", " + pub.address);
    const googleMapsUrl = escapeHtml(`https://www.google.com/maps/search/?api=1&query=${encodedAddr}`);

    container.innerHTML = `
      <div class="detail-hero">
        <button class="detail-close-btn" data-action="close-dialog" aria-label="Zavřít detail">✕</button>
        <div class="detail-top-badges">
          <span class="rating-badge ${ratingBadgeClass}" aria-label="${hasRating ? 'Naše hodnocení' : 'Bez našeho hodnocení'}">${hasRating ? `${escapeHtml(pub.rating.toLocaleString("cs-CZ"))} / 10` : 'Bez hodnocení'}</span>
          ${beerSummary ? `<span class="pub-beer-tag" aria-label="Pivo a jeho nabídka">${escapeHtml(beerSummary)}</span>` : ""}
        </div>
        <h2 id="detail-title" class="detail-title">${escapeHtml(pub.name)}</h2>
        <div class="detail-address">${escapeHtml(pub.address)}</div>
        <div class="detail-quick-actions">
          <button class="btn-nav" data-action="center-pub" data-pub-id="${escapeHtml(pub.id)}">
            Zaměřit na mapě
          </button>
          <a href="${googleMapsUrl}" target="_blank" rel="noopener" class="btn-nav">
            Google Maps
          </a>
          ${websiteUrl ? `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" class="btn-nav">Oficiální web</a>` : ""}
          <button class="btn-nav" data-action="copy-address" data-address="${escapeHtml(pub.address)}">
            Kopírovat adresu
          </button>
        </div>
      </div>

      <div class="detail-body">
        <div>
          <div class="detail-section-title">
            <span>${hasBeenReviewed ? "Naše zápisky" : "O podniku"}</span>
          </div>
          <p class="source-note">${hasBeenReviewed
            ? "Byli jsme tu, ale u jednotlivých bodů nejsou zvlášť uvedené zdroje."
            : "Zatím jsme tu nebyli. Informace nejsou naše vlastní hodnocení."}</p>
          <div class="notes-container">
            <ul class="user-notes-list">
              ${notes.length > 0
                ? notes.map(n => `<li>${escapeHtml(n)}</li>`).join("")
                : `<li>Zatím tu nejsou žádné poznámky.</li>`
              }
              ${pub.customUserNote ? `<li class="personal-note"><span>Naše doplnění</span>${escapeHtml(pub.customUserNote)}</li>` : ""}
            </ul>
          </div>
        </div>

        <div>
          <div class="detail-section-title">
            <span>Pivo a ceny</span>
          </div>
          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Čepované pivo</div>
              <div class="info-value">${escapeHtml(pub.beerType || "Tradiční český ležák")}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Cenová relace</div>
              <div class="info-value">${escapeHtml(pub.priceLevel || "Neuvedena")}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="detail-section-title">
            <span>Časové údaje</span>
          </div>
          <div class="date-meta">
            <span><strong>Návštěva</strong>${formatDate(pub.lastVisited)}</span>
            <span><strong>Cena ověřena</strong>${formatDate(pub.priceCheckedAt)}</span>
          </div>
          <p class="source-note">Ceny a nabídka se můžou měnit.</p>
        </div>

        <div>
          <div class="detail-section-title">
            <span>Štítky</span>
          </div>
          <div class="pub-tags detail-tags">
            ${tags.slice(0, 3).map(t => `<span class="pub-tag">${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>

        <div>
          <div class="detail-section-title">
            <span>Tvoje poznámka</span>
          </div>
          <div class="custom-user-note-box">
            <p class="source-note">
              Poznámka i případná data se ukládají v tomto prohlížeči.
            </p>
            <textarea id="custom-pub-note-${escapeHtml(pub.id)}" class="note-textarea" aria-label="Osobní poznámka k ${escapeHtml(pub.name)}" placeholder="Co jsme pili, jak bylo plno, co stálo za to?">${escapeHtml(pub.customUserNote || '')}</textarea>
            <div class="form-row date-row">
              <label class="form-label" for="visited-${escapeHtml(pub.id)}">Datum návštěvy
                <input type="date" id="visited-${escapeHtml(pub.id)}" class="form-input" value="${escapeHtml(pub.lastVisited || '')}">
              </label>
              <label class="form-label" for="price-checked-${escapeHtml(pub.id)}">Cena ověřena
                <input type="date" id="price-checked-${escapeHtml(pub.id)}" class="form-input" value="${escapeHtml(pub.priceCheckedAt || '')}">
              </label>
            </div>
            <button class="save-note-btn" data-action="save-note" data-pub-id="${escapeHtml(pub.id)}">Uložit</button>
          </div>
        </div>
      </div>
    `;

    overlay.setAttribute("aria-labelledby", "detail-title");
    overlay.removeAttribute("aria-label");
    openDialog(overlay);
  }

  function closeDetail() {
    closeDialog(document.getElementById("detail-overlay"));
  }

  function openDialog(dialog) {
    if (!dialog) return;
    if (activeDialog && activeDialog !== dialog) closeDialog(activeDialog, false);

    previouslyFocusedElement = document.activeElement;
    activeDialog = dialog;
    dialog.setAttribute("aria-hidden", "false");
    dialog.classList.add("active");

    requestAnimationFrame(() => {
      if (activeDialog !== dialog) return;
      const focusTarget = dialog.querySelector("button, input, textarea, select, [tabindex='0']");
      (focusTarget || dialog).focus();
    });
  }

  function closeDialog(dialog = activeDialog, restoreFocus = true) {
    if (!dialog) return;

    dialog.classList.remove("active");
    dialog.setAttribute("aria-hidden", "true");
    if (activeDialog !== dialog) return;

    activeDialog = null;
    if (restoreFocus && previouslyFocusedElement instanceof HTMLElement && previouslyFocusedElement.isConnected) {
      previouslyFocusedElement.focus();
    }
    previouslyFocusedElement = null;
  }

  // Uložení osobní poznámky do localStorage i backendu
  function saveCustomNote(pubId) {
    const textarea = document.getElementById(`custom-pub-note-${pubId}`);
    if (!textarea) return;
    const text = textarea.value.trim();
    const pub = pubs.find(p => p.id === pubId);
    if (pub) {
      pub.customUserNote = text;
      const visitedInput = document.getElementById(`visited-${pubId}`);
      const priceCheckedInput = document.getElementById(`price-checked-${pubId}`);
      pub.lastVisited = visitedInput ? visitedInput.value : "";
      pub.priceCheckedAt = priceCheckedInput ? priceCheckedInput.value : "";
      if (text || pub.lastVisited) pub.userReviewed = true;
      const localSaved = savePubsData();

      sendBackendRequest(`/api/pubs/${encodeURIComponent(pubId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customUserNote: text,
          lastVisited: pub.lastVisited,
          priceCheckedAt: pub.priceCheckedAt
        })
      });

      if (localSaved) showToast("Uloženo v tomto prohlížeči.");
      renderList();
    }
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  async function copyAddress(addr) {
    try {
      await navigator.clipboard.writeText(addr);
      showToast("Adresa zkopírována do schránky.");
    } catch (error) {
      console.warn("Kopírování adresy se nezdařilo:", error);
      showToast(`Schránka není dostupná. Adresa: ${addr}`);
    }
  }

  // Pivní trasy (Pub crawls)
  function showPubCrawlsModal() {
    const container = document.getElementById("pub-crawls-container");
    if (!container) return;

    container.innerHTML = pubCrawlRoutes.map(route => {
      const stops = route.stops.map(id => pubs.find(pub => pub.id === id));
      const stopNames = stops.map(pub => pub ? pub.name : "Neznámá hospoda");
      const routeCoordinates = stops.map(pub => pub && Number.isFinite(pub.lat) && Number.isFinite(pub.lng)
        ? `${pub.lat},${pub.lng}`
        : null);
      const googleMapsUrl = routeCoordinates.length >= 2 && routeCoordinates.every(Boolean)
        ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(routeCoordinates[0])}&destination=${encodeURIComponent(routeCoordinates[routeCoordinates.length - 1])}${routeCoordinates.length > 2 ? `&waypoints=${encodeURIComponent(routeCoordinates.slice(1, -1).join("|"))}` : ""}&travelmode=walking`
        : "";

      return `
        <div class="crawl-route-card">
          <div class="crawl-route-header">
            <span class="crawl-route-title">${escapeHtml(route.title)}</span>
            <span class="pub-tag">${escapeHtml(route.badge)}</span>
          </div>
          <span class="crawl-route-description">${escapeHtml(route.description)}</span>
          <div class="crawl-stops">
            ${stopNames.map((name, i) => `
              <span class="crawl-stop-badge">${i + 1}. ${escapeHtml(name)}</span>
              ${i < stopNames.length - 1 ? `<span class="crawl-arrow">➔</span>` : ''}
            `).join("")}
          </div>
          <div class="crawl-route-actions">
            <button type="button" class="crawl-route-action" data-action="activate-route" data-route-id="${escapeHtml(route.id)}">
              Zobrazit na mapě
            </button>
            ${googleMapsUrl ? `<a class="crawl-route-action" href="${escapeHtml(googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Otevřít trasu v Google Maps</a>` : ""}
          </div>
        </div>
      `;
    }).join("");

    openDialog(document.getElementById("pub-crawls-modal"));
  }

  function showSubmissionsModal() {
    const container = document.getElementById("submissions-container");
    if (!container) return;
    document.getElementById("submissions-title").textContent = usesRemoteSubmissions
      ? "Návrhy k návštěvě"
      : "Návrhy ke schválení";
    document.querySelector("#submissions-modal .modal-intro").textContent = usesRemoteSubmissions
      ? "Návrhy jsou oddělené od mapy. JSON soubor v repozitáři je veřejně čitelný."
      : "Schválené podniky se přidají do mapy. Tato fronta není chráněná přihlášením.";

    container.innerHTML = pendingPubs.length
      ? pendingPubs.map(pub => `
        <div class="submission-card">
          <div class="crawl-route-header">
            <strong class="crawl-route-title">${escapeHtml(pub.name)}</strong>
            <span class="submission-date">${escapeHtml(formatDate(pub.submittedAt?.slice(0, 10)))}</span>
          </div>
          <p class="submission-address">${escapeHtml(pub.address)}</p>
          ${pub.beerType ? `<p class="submission-detail">${escapeHtml(pub.beerType)}</p>` : ""}
          ${pub.rating ? `<p class="submission-detail">Navržené hodnocení: ${escapeHtml(pub.rating)}/10</p>` : ""}
          ${getPubNotes(pub).length
            ? `<ul class="submission-notes">${getPubNotes(pub).map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`
            : ""}
          ${usesRemoteSubmissions ? "" : `
            <div class="submission-actions">
              <button type="button" class="btn-action primary" data-action="approve-submission" data-pub-id="${escapeHtml(pub.id)}">Schválit a přidat</button>
              <button type="button" class="btn-action" data-action="reject-submission" data-pub-id="${escapeHtml(pub.id)}">Odebrat návrh</button>
            </div>
          `}
        </div>
      `).join("")
      : `<p class="source-note">Ve frontě teď žádné návrhy nejsou.</p>`;

    openDialog(document.getElementById("submissions-modal"));
  }

  async function approveSubmission(pubId) {
    if (usesRemoteSubmissions) {
      showToast("GitHub návrhy jsou pouze pro čtení a do mapy se automaticky nepřidávají.");
      return;
    }

    const proposal = pendingPubs.find(pub => pub.id === pubId);
    if (!proposal) return;

    let approvedPub = { ...proposal };
    delete approvedPub.submittedAt;
    delete approvedPub.pendingSync;
    if (window.location.protocol.startsWith("http")) {
      try {
        const response = await fetch(`/api/submissions/${encodeURIComponent(pubId)}/approve`, { method: "POST" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!result.pub) throw new Error("Server nevrátil schválený podnik");
        approvedPub = result.pub;
      } catch (error) {
        console.warn("Schválení návrhu na serveru se nezdařilo:", error);
        showToast("Návrh se nepodařilo schválit na serveru.");
        return;
      }
    }

    if (!pubs.some(pub => pub.id === approvedPub.id)) pubs.unshift(approvedPub);
    if (!savePubsData()) return;
    pendingPubs = pendingPubs.filter(pub => pub.id !== pubId);
    savePendingPubs();
    renderMarkers();
    renderList();
    showSubmissionsModal();
    showToast(`„${approvedPub.name}“ bylo přidáno na mapu.`);
  }

  async function rejectSubmission(pubId) {
    if (usesRemoteSubmissions) {
      showToast("GitHub návrhy jsou pouze pro čtení.");
      return;
    }

    if (!pendingPubs.some(pub => pub.id === pubId)) return;

    if (window.location.protocol.startsWith("http")) {
      try {
        const response = await fetch(`/api/submissions/${encodeURIComponent(pubId)}`, { method: "DELETE" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.warn("Odebrání návrhu ze serveru se nezdařilo:", error);
        showToast("Návrh se nepodařilo odebrat ze serveru.");
        return;
      }
    }

    pendingPubs = pendingPubs.filter(pub => pub.id !== pubId);
    if (savePendingPubs()) {
      showSubmissionsModal();
      showToast("Návrh byl odebrán.");
    }
  }

  function activatePubCrawl(routeId) {
    const route = pubCrawlRoutes.find(r => r.id === routeId);
    if (!route) return;

    closeDialog(document.getElementById("pub-crawls-modal"));

    const points = [];
    route.stops.forEach(id => {
      const pub = pubs.find(p => p.id === id);
      if (pub && pub.lat && pub.lng) {
        points.push([pub.lat, pub.lng]);
      }
    });

    if (!map || points.length < 2) return;

    if (currentRoutePolyline) {
      map.removeLayer(currentRoutePolyline);
    }

    currentRoutePolyline = L.polyline(points, {
      color: "#f59e0b",
      weight: 5,
      opacity: 0.85,
      dashArray: "8, 8",
      lineCap: "round"
    }).addTo(map);

    map.fitBounds(currentRoutePolyline.getBounds(), { padding: [50, 50] });

    showToast(`Trasa „${route.title}“ je na mapě.`);
  }

  // Nové podniky čekají na ruční schválení.
  async function handleAddPubSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("new-pub-name").value.trim();
    const address = document.getElementById("new-pub-address").value.trim();
    const lat = parseFloat(document.getElementById("new-pub-lat").value);
    const lng = parseFloat(document.getElementById("new-pub-lng").value);
    const rating = parseFloat(document.getElementById("new-pub-rating").value) || null;
    const beer = document.getElementById("new-pub-beer").value.trim();
    const notesText = document.getElementById("new-pub-notes").value.trim();
    const lastVisited = document.getElementById("new-pub-visited").value;
    const priceCheckedAt = document.getElementById("new-pub-price-checked").value;

    if (!name || isNaN(lat) || isNaN(lng)) {
      alert("Vyplň prosím název hospody a platné souřadnice.");
      return;
    }

    const id = "pub-" + Date.now();
    const notes = notesText ? notesText.split("\n").filter(l => l.trim().length > 0) : [];

    const newPub = {
      id: id,
      name: name,
      address: address || "Praha",
      lat: lat,
      lng: lng,
      district: address.includes("Praha") ? address : "Praha",
      rating: rating,
      beerRating: rating ? `Pivo ${rating}/10` : beer,
      beerType: beer || "Čepované pivo",
      priceLevel: "Vlastní záznam",
      tags: ["Moje přidaná", "Nová"],
      quote: notes[0] || "",
      notes: notes,
      atmosphere: "Vlastní oblíbené místo",
      userReviewed: rating !== null || Boolean(lastVisited),
      lastVisited: lastVisited,
      priceCheckedAt: priceCheckedAt
    };

    newPub.submittedAt = new Date().toISOString();

    if (usesRemoteSubmissions) {
      const submissionPassword = window.prompt("Zadej soukromý přístupový klíč pro přidání návrhu:");
      if (!submissionPassword) return;

      try {
        const response = await fetch(`${submissionsApiUrl}/api/submissions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${submissionPassword}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(newPub)
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        if (!result.suggestion || result.suggestion.id !== id) {
          throw new Error("API nevrátilo uložený návrh");
        }
        pendingPubs = [result.suggestion, ...pendingPubs.filter(pub => pub.id !== id)];
        renderSubmissionCount();
        closeDialog(document.getElementById("add-pub-modal"), false);
        e.target.reset();
        document.getElementById("btn-add-pub").focus();
        showToast(`„${name}“ bylo uloženo mezi návrhy k návštěvě.`);
      } catch (error) {
        console.warn("Uložení návrhu do GitHubu se nezdařilo:", error);
        showToast(`Návrh se nepodařilo uložit: ${error.message}`);
      }
      return;
    }

    newPub.pendingSync = true;
    pendingPubs.unshift(newPub);
    if (!savePendingPubs()) return;

    closeDialog(document.getElementById("add-pub-modal"), false);
    e.target.reset();
    document.getElementById("btn-add-pub").focus();

    if (window.location.protocol.startsWith("http")) {
      try {
        const submissionPayload = { ...newPub };
        delete submissionPayload.pendingSync;
        const response = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submissionPayload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const submissionsResponse = await fetch("/api/submissions");
        if (!submissionsResponse.ok) throw new Error(`HTTP ${submissionsResponse.status}`);
        pendingPubs = await submissionsResponse.json();
        pendingPubs = pendingPubs.map(pub => pub.id === id ? { ...pub, pendingSync: false } : pub);
        savePendingPubs();
      } catch (error) {
        console.warn("Odeslání návrhu na server se nezdařilo:", error);
        showToast("Návrh čeká lokálně; server ho nepřijal.");
        return;
      }
    }
    showToast(`„${name}“ čeká na schválení.`);
  }

  // Export & Import
  function showExportModal() {
    const jsonStr = JSON.stringify(pubs, null, 2);
    document.getElementById("export-textarea").value = jsonStr;
    openDialog(document.getElementById("export-modal"));
  }

  function downloadJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pubs, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `tonkova_pivni_anatomie_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
    showToast("Soubor JSON byl stažen.");
  }

  function copyExportJson() {
    const textarea = document.getElementById("export-textarea");
    navigator.clipboard.writeText(textarea.value).then(() => {
      showToast("JSON zkopírován do schránky.");
    });
  }

  function resetToDefaults() {
    if (confirm("Opravdu chceš obnovit výchozí seznam 20 hospod? Tvé případné úpravy budou nahrazeny výchozím stavem.")) {
      pubs = JSON.parse(JSON.stringify(getFallbackPubs()));
      savePubsData();
      renderMarkers();
      renderList();
      closeDialog(document.getElementById("export-modal"));
      showToast("Obnoven výchozí seznam hospod.");
    }
  }

  // Globální propojení
  window.selectPub = selectPub;
  window.openPubDetail = (id) => selectPub(id, true);
  window.closeDetail = closeDetail;
  window.copyAddress = copyAddress;
  window.centerPubOnMap = (id) => selectPub(id, false);
  window.saveCustomNote = saveCustomNote;
  window.activatePubCrawl = activatePubCrawl;

  function bindSearchControls() {
    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear");

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        currentSearch = e.target.value;
        if (searchClear) searchClear.style.display = currentSearch ? "block" : "none";
        renderList();
      });
    }

    if (searchClear) {
      searchClear.addEventListener("click", function () {
        if (searchInput) searchInput.value = "";
        currentSearch = "";
        searchClear.style.display = "none";
        renderList();
      });
    }
  }

  function bindFilterControls() {
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentFilter = chip.dataset.filter;
        renderList();
      });
    });
  }

  function bindSortControl() {
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        currentSort = e.target.value;
        renderList();
      });
    }
  }

  function bindMapThemeControls() {
    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setMapTheme(btn.dataset.theme);
      });
    });
  }

  function setMobileListOpen(isOpen) {
    const appContainer = document.querySelector(".app-container");
    const toggle = document.getElementById("mobile-list-toggle");
    if (!appContainer || !toggle) return;

    appContainer.classList.toggle("mobile-list-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.querySelector(".mobile-list-toggle-label").textContent = isOpen
      ? "Zpět na mapu"
      : "Zobrazit hospody";
  }

  function bindMobileListControls() {
    const toggle = document.getElementById("mobile-list-toggle");
    const mapContainer = document.querySelector(".map-container");
    if (!toggle || !mapContainer) return;

    toggle.addEventListener("click", () => {
      setMobileListOpen(!document.querySelector(".app-container").classList.contains("mobile-list-open"));
    });

    mapContainer.addEventListener("click", (event) => {
      if (event.target.closest(".map-theme-toggle")) return;
      if (document.querySelector(".app-container").classList.contains("mobile-list-open")) {
        setMobileListOpen(false);
      }
    });
  }

  function bindModalControls() {
    const routesBtn = document.getElementById("btn-routes");
    if (routesBtn) {
      routesBtn.addEventListener("click", showPubCrawlsModal);
    }

    const submissionsBtn = document.getElementById("btn-submissions");
    if (submissionsBtn) {
      submissionsBtn.addEventListener("click", showSubmissionsModal);
    }

    const addPubForm = document.getElementById("add-pub-form");
    if (addPubForm) {
      addPubForm.addEventListener("submit", handleAddPubSubmit);
    }

    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          closeDialog(overlay);
        }
      });
    });

    const pickLocBtn = document.getElementById("btn-pick-location");
    if (pickLocBtn) {
      pickLocBtn.addEventListener("click", () => {
        window.isSelectingLocationOnMap = true;
        closeDialog(document.getElementById("add-pub-modal"), false);
        showToast("Klikni na mapu v místě, kde hospoda leží.");
      });
    }

    const detailOverlay = document.getElementById("detail-overlay");
    if (detailOverlay) {
      detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) closeDialog(detailOverlay);
      });
    }

    document.addEventListener("click", handleActionClick);
    document.addEventListener("keydown", handleActionKeydown);
  }

  function handleActionClick(event) {
    const actionElement = event.target.closest("[data-action], .modal-close-btn");
    if (!actionElement) return;

    if (actionElement.classList.contains("modal-close-btn") || actionElement.dataset.action === "close-dialog") {
      closeDialog(actionElement.closest("[role='dialog']"));
      return;
    }

    switch (actionElement.dataset.action) {
      case "open-pub":
        selectPub(actionElement.dataset.pubId, true);
        break;
      case "copy-address":
        copyAddress(actionElement.dataset.address);
        break;
      case "center-pub":
        selectPub(actionElement.dataset.pubId, false);
        closeDetail();
        setMobileListOpen(false);
        break;
      case "save-note":
        saveCustomNote(actionElement.dataset.pubId);
        break;
      case "activate-route":
        activatePubCrawl(actionElement.dataset.routeId);
        break;
      case "approve-submission":
        approveSubmission(actionElement.dataset.pubId);
        break;
      case "reject-submission":
        rejectSubmission(actionElement.dataset.pubId);
        break;
    }
  }

  function handleActionKeydown(event) {
    if (event.target.matches(".pub-card") && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      selectPub(event.target.dataset.pubId, true);
    }
  }

  function bindKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      if (!activeDialog) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
        return;
      }

      if (e.key === "Tab") {
        const focusable = [...activeDialog.querySelectorAll(
          "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex='0']"
        )];
        if (focusable.length === 0) {
          e.preventDefault();
          activeDialog.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!activeDialog.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  function initApp() {
    loadPubsData();
    loadPendingPubs();
    initMap();
    renderList();
    syncWithBackendIfAvailable();

    bindSearchControls();
    bindFilterControls();
    bindSortControl();
    bindMapThemeControls();
    bindMobileListControls();
    bindModalControls();
    bindKeyboardShortcuts();
  }

  // Spuštění po načtení stránky
  document.addEventListener("DOMContentLoaded", initApp);
})();
