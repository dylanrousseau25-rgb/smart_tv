/*
 * Veille « tableau » : œuvres du domaine public du Metropolitan Museum of Art (API gratuite, sans clé).
 * Un tableau s'affiche en plein écran avec un léger zoom lent ; la légende change de coin
 * à chaque tableau pour éviter le marquage des écrans OLED.
 */
var Art = (function () {
    'use strict';

    var API = 'https://collectionapi.metmuseum.org/public/collection/v1.1/search?hasImages=true&limit=200';
    var OBJ = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/';
    var IDS_CACHE_MS = 7 * 24 * 3600 * 1000;

    var COLLECTIONS = {
        chefs: { label: "Chefs-d'œuvre", query: '&isHighlight=true&departmentId=11&q=painting' },
        impressionnistes: { label: 'Impressionnistes', query: '&departmentId=11&q=impressionism' },
        paysages: { label: 'Paysages', query: '&departmentId=11&q=landscape' },
        japon: { label: 'Estampes japonaises', query: '&departmentId=6&q=Hokusai' }
    };

    var queue = [];
    var running = false;
    var timer = null;
    var clockTimer = null;
    var front = 'a';
    var corner = 0;
    var collection = 'chefs';
    var durationMs = 60000;
    var gen = 0; // empêche une ancienne boucle de continuer après arrêt/relance

    function loadIds(cb) {
        var key = 'art.ids.' + collection;
        var cached = U.load(key, null);
        if (cached && Date.now() - cached.at < IDS_CACHE_MS && cached.ids.length) { cb(cached.ids.slice()); return; }

        U.getJSON(API + COLLECTIONS[collection].query, function (d) {
            var ids = d.objectIDs || [];
            if (!ids.length && collection !== 'chefs') { collection = 'chefs'; loadIds(cb); return; }
            U.store(key, { at: Date.now(), ids: ids });
            cb(ids.slice());
        }, function () {
            cb(cached ? cached.ids.slice() : []);
        });
    }

    // Cherche le prochain tableau affichable (domaine public, avec image)
    function nextArtwork(cb, attempts) {
        attempts = attempts || 0;
        if (attempts > 8) { cb(null); return; }
        if (!queue.length) {
            loadIds(function (ids) {
                if (!ids.length) { cb(null); return; }
                queue = U.shuffle(ids);
                nextArtwork(cb, attempts + 1);
            });
            return;
        }
        var id = queue.shift();
        U.getJSON(OBJ + id, function (o) {
            if (!o.isPublicDomain || !o.primaryImageSmall) { nextArtwork(cb, attempts + 1); return; }
            cb({
                img: o.primaryImageSmall,
                title: o.title,
                artist: o.artistDisplayName || o.culture || '',
                date: o.objectDate || ''
            });
        }, function () { nextArtwork(cb, attempts + 1); });
    }

    function preload(url, ok, fail) {
        var img = new Image();
        img.onload = function () { ok(); };
        img.onerror = fail;
        img.src = url;
    }

    function show(art) {
        var back = front === 'a' ? 'b' : 'a';
        var backEl = U.$('art-' + back);
        var frontEl = U.$('art-' + front);

        backEl.style.backgroundImage = 'url("' + art.img + '")';
        backEl.className = 'art-img';
        // Force le navigateur à repartir de l'état initial avant de lancer le fondu + zoom
        void backEl.offsetWidth;
        backEl.className = 'art-img visible zoom';
        frontEl.className = 'art-img';
        front = back;

        var cap = U.$('art-caption');
        cap.className = 'corner-' + corner;
        corner = (corner + 1) % 4;
        U.$('art-title').textContent = art.title;
        U.$('art-artist').textContent = art.artist + (art.date ? ' · ' + art.date : '');
    }

    function cycle() {
        var g = gen;
        function alive() { return running && g === gen; }
        if (!alive()) return;
        nextArtwork(function (art) {
            if (!alive()) return;
            if (!art) {
                // Pas de réseau : simple horloge sur fond noir (sans danger pour l'OLED)
                U.$('art-title').textContent = '';
                U.$('art-artist').textContent = '';
                U.$('art-caption').className = 'corner-' + (corner = (corner + 1) % 4);
                timer = setTimeout(cycle, durationMs);
                return;
            }
            preload(art.img, function () {
                if (!alive()) return;
                show(art);
                timer = setTimeout(cycle, durationMs);
            }, function () { if (alive()) timer = setTimeout(cycle, 1000); });
        });
    }

    function tickClock() {
        U.$('art-clock').textContent = U.hhmm(new Date());
    }

    function start(opts) {
        if (running) return;
        collection = COLLECTIONS[opts.collection] ? opts.collection : 'chefs';
        durationMs = opts.durationMs || 60000;
        queue = [];
        gen++;
        running = true;
        U.$('art-a').className = 'art-img';
        U.$('art-b').className = 'art-img';
        U.$('artsaver').className = '';
        tickClock();
        clockTimer = setInterval(tickClock, 10000);
        cycle();
    }

    function stop() {
        running = false;
        clearTimeout(timer);
        clearInterval(clockTimer);
        U.$('artsaver').className = 'hidden';
    }

    function isRunning() { return running; }

    return { COLLECTIONS: COLLECTIONS, start: start, stop: stop, isRunning: isRunning };
}());
