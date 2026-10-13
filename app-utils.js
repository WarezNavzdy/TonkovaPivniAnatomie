// Sdílené pomocné funkce pro bezpečné vykreslování a normalizaci dat.
(function () {
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function getRatingBadgeClass(pub) {
    if (!pub.userReviewed) return "rating-pending";
    if (!Number.isFinite(pub.rating)) return "rating-pending";
    if (pub.rating < 8.0) return "rating-good";
    if (pub.rating < 9.0) return "rating-ok";
    return "rating-gold";
  }

  function getPubNotes(pub) {
    return Array.isArray(pub.notes) ? pub.notes : [];
  }

  function getPubTags(pub) {
    return Array.isArray(pub.tags) ? pub.tags : [];
  }

  function getBeerSummary(pub) {
    if (!pub.beerRating) return pub.beerType || "";
    if (!pub.userReviewed) {
      const summary = pub.beerRating
        .replace(/\s*\(?\s*\d+(?:[.,]\d+)?\s*\/\s*10\s*\)?/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      return summary || pub.beerType || "";
    }
    if (!Number.isFinite(pub.rating)) return pub.beerRating;

    const summary = pub.beerRating
      .replace(/\(?\s*(\d+(?:[.,]\d+)?)\s*\/\s*10\s*\)?/g, (score, value) => {
        return parseFloat(value.replace(",", ".")) === pub.rating ? "" : score;
      })
      .replace(/\(\s*\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    return summary || pub.beerType || pub.beerRating;
  }

  function getPubText(pub, fields) {
    return fields
      .flatMap((field) => Array.isArray(pub[field]) ? pub[field] : [pub[field]])
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase();
  }

  window.PubMapUtils = Object.freeze({
    escapeHtml,
    getBeerSummary,
    getPubNotes,
    getPubTags,
    getPubText,
    getRatingBadgeClass
  });
})();
