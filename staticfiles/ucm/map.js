
const DATA_URL = (window.UCM && window.UCM.POINTS_URL) || 'points.json';


    // =============================================================
    // 1) Load your local JSON (keep file in same folder e.g., points.json)
    //    IMPORTANT: Open this page via a local web server (not file://)
    //    Example: `python -m http.server 5500` then visit http://localhost:5500
    // =============================================================


    // Map init
    const map = L.map('map', { preferCanvas: true, worldCopyJump: true }).setView([52.1, 5.29], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

    const clusterToggle = document.getElementById('clusterToggle');
    const labelsToggle = document.getElementById('labelsToggle');
    const hoverCard = document.getElementById('hoverCard');

    let clusterLayer = null;
    let plainLayer = null;
    let dataCache = [];

    let markersCache = []; // [{ marker, data }]

    function buildPlainLayer(data) {
    const grp = L.layerGroup();
    markersCache = [];
    for (const p of data) {
    if (!isFinite(p.lat) || !isFinite(p.lon)) continue;
    const mk = buildMarker(p);
    markersCache.push({ marker: mk, data: p });
    grp.addLayer(mk);
}
    return grp;
}

    function buildClusterLayer(data) {
    const cluster = L.markerClusterGroup({
    chunkedLoading: true, maxClusterRadius: 60,
    spiderfyOnMaxZoom: true, showCoverageOnHover: false
});
    markersCache = [];
    for (const p of data) {
    if (!isFinite(p.lat) || !isFinite(p.lon)) continue;
    const mk = buildMarker(p);
    markersCache.push({ marker: mk, data: p });
    cluster.addLayer(mk);
}
    return cluster;
}

    fetch(DATA_URL)
    .then(r => r.json())
    .then(json => { dataCache = json; init(json); })
    .catch(err => {
    console.error('Failed to load points.json', err);
    alert('Could not load points.json. Make sure you are running a local server and the file is in the same folder.');
});

    function buildMarker(p) {
    const m = L.marker([+p.lat, +p.lon], { riseOnHover: true });
    // Tooltip label toggle
    const labelText = p.label || p.title || p.location || '';
    if (labelText && labelsToggle.checked) m.bindTooltip(labelText);

    // Hover card content
    const titleLink = p.href ? `<a href="${escapeAttr(p.href)}" target="_blank" rel="noopener">${escapeHtml(p.title || 'Untitled')}</a>` : escapeHtml(p.title || 'Untitled');
    const hoverHtml = `
        <h3>${titleLink}</h3>
        <p><small>Updated: ${escapeHtml(p.updated_at || '-')}&nbsp;&middot;&nbsp;${escapeHtml(p.location || '-')}${p.city ? ' / ' + escapeHtml(p.city) : ''}</small></p>
      `;

    m.on('mouseover', () => {
    hoverCard.innerHTML = hoverHtml;
    hoverCard.style.display = 'block';
});
    m.on('mouseout', () => { hoverCard.style.display = 'none'; });

    // Click to open modal with more details
    m.on('click', () => openModal(p));
    return m;
}

    function buildPlainLayer(data) {
    const grp = L.layerGroup();
    for (const p of data) {
    if (!isFinite(p.lat) || !isFinite(p.lon)) continue;
    grp.addLayer(buildMarker(p));
}
    return grp;
}

    function buildClusterLayer(data) {
    const cluster = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
});
    for (const p of data) {
    if (!isFinite(p.lat) || !isFinite(p.lon)) continue;
    cluster.addLayer(buildMarker(p));
}
    return cluster;
}

    function refreshLayers(data) {
    const useCluster = clusterToggle.checked;
    if (clusterLayer) map.removeLayer(clusterLayer);
    if (plainLayer) map.removeLayer(plainLayer);
    if (useCluster) {
    clusterLayer = buildClusterLayer(data);
    map.addLayer(clusterLayer);
} else {
    plainLayer = buildPlainLayer(data);
    map.addLayer(plainLayer);
}
}

    function fitToData(data) {
    const latlngs = data.filter(p => isFinite(p.lat) && isFinite(p.lon)).map(p => [ +p.lat, +p.lon ]);
    if (latlngs.length) map.fitBounds(latlngs, { padding: [30, 30] });
}

    function init(data) {
    refreshLayers(data);
    fitToData(data);
}

    // UI events
    clusterToggle.addEventListener('change', () => refreshLayers(dataCache));
    labelsToggle.addEventListener('change', () => refreshLayers(dataCache));

    // Modal helpers
    const backdrop = document.getElementById('backdrop');
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modalClose');

    function openModal(p) {
    document.getElementById('modalTitle').innerHTML = p.href ? `<a href="${escapeAttr(p.href)}" target="_blank" rel="noopener">${escapeHtml(p.title || 'Untitled')}</a>` : escapeHtml(p.title || 'Untitled');
    document.getElementById('m_updated').textContent = p.updated_at || '-';
    document.getElementById('m_location').textContent = p.location || '-';
    document.getElementById('m_city').textContent = p.city || '-';
    document.getElementById('m_street').textContent = p.street || '-';
    document.getElementById('m_easy').textContent = String(p.easydetect ?? '-');
    document.getElementById('m_href').innerHTML = p.href ? `<a href="${escapeAttr(p.href)}" target="_blank" rel="noopener">${escapeHtml(p.href)}</a>` : '-';
    backdrop.style.display = 'block';
    modal.style.display = 'block';
}

    function closeModal() { backdrop.style.display = 'none'; modal.style.display = 'none'; }

    modalClose.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // Utils
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
    function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }



    (function(){
    const searchInput = document.getElementById('searchInput');
    const searchBtn   = document.getElementById('searchBtn');
    const suggest     = document.getElementById('suggest');
    const clusterToggle = document.getElementById('clusterToggle');
    if (!searchInput) return;

    let tempSearchMarker = null;

    function escapeHtml(s){ return String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#39;'}[c])); }
    const normalize   = s => (s||'').toLowerCase();
    const stripSpaces = s => (s||'').replace(/\s+/g,'').toLowerCase();

    function rankLocal(q){
    const qn  = normalize(q);
    const qpc = stripSpaces(q); // support e.g. "1234 AB"
    const out = [];
    for (const entry of (window.dataCache||[])) {
    const fields = [entry.title, entry.label, entry.location, entry.city, entry.street];
    const blob   = fields.map(x=>x||'').join(' • ').toLowerCase();
    const blobPc = stripSpaces(fields.join(' '));
    let score = -1;
    if (blob.includes(qn))           score = 100 - blob.indexOf(qn);
    if (qpc && blobPc.includes(qpc)) score = Math.max(score, 90 - blobPc.indexOf(qpc));
    if (score >= 0) out.push({score, entry});
}
    out.sort((a,b)=>b.score-a.score);
    return out.map(r=>r.entry);
}

    function renderSuggest(items){
    const ul = suggest.querySelector('ul');
    ul.innerHTML = '';
    if (!items.length) { hideSuggest(); return; }
    items.slice(0,10).forEach(it => {
    const li = document.createElement('li');
    li.setAttribute('role','option');
    li.innerHTML = `<div>
        <div class="s-title">${escapeHtml(it.label || it.title || it.location || 'Untitled')}</div>
        <div class="s-sub">${escapeHtml([it.city, it.location].filter(Boolean).join(' · '))}</div>
      </div>
      <div class="s-sub">${escapeHtml(it.updated_at || '')}</div>`;
    li.addEventListener('click', () => { jumpToEntry(it); hideSuggest(); });
    ul.appendChild(li);
});
    suggest.style.display = 'block';
    suggest.setAttribute('aria-expanded','true');
}

    function hideSuggest(){ suggest.style.display='none'; suggest.setAttribute('aria-expanded','false'); }

    function onType(){
    const q = searchInput.value.trim();
    if (!q) { hideSuggest(); return; }
    renderSuggest(rankLocal(q));
}

    function submitSearch(){
    const q = searchInput.value.trim();
    if (!q) return;
    const local = rankLocal(q);
    if (local.length) { jumpToEntry(local[0]); hideSuggest(); return; }
    geocodeAndPan(q); // fallback
}

    function jumpToEntry(entry){
    const match = (window.markersCache||[]).find(m =>
    m.data === entry || (m.data.lat===entry.lat && m.data.lon===entry.lon && m.data.title===entry.title)
    );
    if (!match) return;
    const mk = match.marker;
    if (clusterToggle && clusterToggle.checked && window.clusterLayer) {
    window.clusterLayer.zoomToShowLayer(mk, () => {
    map.setView(mk.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
    mk.openPopup();
});
} else {
    map.setView(mk.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
    mk.openPopup();
}
}

    async function geocodeAndPan(q){
    try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'nl,en', 'User-Agent': 'Leaflet-Example' } });
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
    const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
    const ll = L.latLng(lat, lon);
    map.setView(ll, 14, { animate: true });
    if (tempSearchMarker) { map.removeLayer(tempSearchMarker); tempSearchMarker = null; }
    tempSearchMarker = L.marker(ll).addTo(map).bindPopup(`Search: ${escapeHtml(q)}`).openPopup();
} else {
    alert('No results found');
}
} catch (e) {
    console.warn('Geocode failed', e);
    alert('Search failed.');
}
}

    searchInput.addEventListener('input', onType);
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitSearch(); }});
    searchBtn.addEventListener('click', submitSearch);
    document.addEventListener('click', (e) => {
    if (!document.querySelector('.searchbar').contains(e.target)) hideSuggest();
});
})();
