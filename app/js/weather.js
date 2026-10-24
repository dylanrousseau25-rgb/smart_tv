/* Météo via Open-Meteo (gratuit, sans clé). Ville saisie dans les réglages, sinon position de la connexion. */
var Weather = (function () {
    'use strict';

    var CACHE_MS = 20 * 60 * 1000;

    // Codes météo WMO -> libellé + type d'icône
    function describe(code) {
        if (code === 0) return { label: 'Ciel dégagé', icon: 'sun' };
        if (code === 1) return { label: 'Plutôt dégagé', icon: 'sun' };
        if (code === 2) return { label: 'Partiellement nuageux', icon: 'partly' };
        if (code === 3) return { label: 'Couvert', icon: 'cloud' };
        if (code === 45 || code === 48) return { label: 'Brouillard', icon: 'fog' };
        if (code >= 51 && code <= 57) return { label: 'Bruine', icon: 'rain' };
        if (code >= 61 && code <= 67) return { label: code >= 65 ? 'Forte pluie' : 'Pluie', icon: 'rain' };
        if (code >= 71 && code <= 77) return { label: 'Neige', icon: 'snow' };
        if (code >= 80 && code <= 82) return { label: 'Averses', icon: 'rain' };
        if (code === 85 || code === 86) return { label: 'Averses de neige', icon: 'snow' };
        if (code >= 95) return { label: 'Orage', icon: 'storm' };
        return { label: '', icon: 'cloud' };
    }

    var SVG = {
        sun: '<circle cx="12" cy="12" r="4.5" class="s-sun"/><g class="s-ray"><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></g>',
        moon: '<path class="s-moon" d="M15.5 3.5a8.5 8.5 0 1 0 5 15.4A7 7 0 0 1 15.5 3.5z"/>',
        cloud: '<path class="s-cloud" d="M7 19h10.5a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.6A3.8 3.8 0 0 0 7 19z"/>',
        partly: '<circle cx="8" cy="8" r="3.5" class="s-sun"/><path class="s-cloud" d="M9 20h9a4 4 0 0 0 .5-8 5.2 5.2 0 0 0-10 1.4A3.3 3.3 0 0 0 9 20z"/>',
        rain: '<path class="s-cloud" d="M7 15h10.5a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.6A3.8 3.8 0 0 0 7 15z"/><path class="s-drop" d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
        snow: '<path class="s-cloud" d="M7 15h10.5a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.6A3.8 3.8 0 0 0 7 15z"/><g class="s-snow"><circle cx="8" cy="19" r="1"/><circle cx="12" cy="21" r="1"/><circle cx="16" cy="19" r="1"/></g>',
        storm: '<path class="s-cloud" d="M7 15h10.5a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.6A3.8 3.8 0 0 0 7 15z"/><path class="s-bolt" d="M13 14l-3 5h3l-2 4"/>',
        fog: '<path class="s-drop" d="M4 9h16M3 13h18M5 17h14"/>'
    };

    function iconSvg(type, isDay) {
        if (type === 'sun' && !isDay) type = 'moon';
        return '<svg viewBox="0 0 24 24">' + (SVG[type] || SVG.cloud) + '</svg>';
    }

    function locate(city, cb, err) {
        if (city) {
            U.getJSON('https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=' + encodeURIComponent(city),
                function (d) {
                    if (!d.results || !d.results.length) return err('Ville introuvable : ' + city);
                    var r = d.results[0];
                    cb({ lat: r.latitude, lon: r.longitude, name: r.name });
                }, err);
        } else {
            U.getJSON('https://get.geojs.io/v1/ip/geo.json', function (d) {
                cb({ lat: +d.latitude, lon: +d.longitude, name: d.city || '' });
            }, err);
        }
    }

    function fetch(city, cb, err) {
        var cached = U.load('weather', null);
        if (cached && cached.city === city && Date.now() - cached.at < CACHE_MS) { cb(cached.data); return; }

        locate(city, function (place) {
            var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + place.lat + '&longitude=' + place.lon +
                '&current=temperature_2m,weather_code,is_day,apparent_temperature,wind_speed_10m' +
                '&hourly=temperature_2m,weather_code,is_day,precipitation_probability' +
                '&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min' +
                '&timezone=auto&forecast_days=2';
            U.getJSON(url, function (d) {
                d.placeName = place.name;
                U.store('weather', { city: city, at: Date.now(), data: d });
                cb(d);
            }, err);
        }, function (e) {
            // Hors ligne : on garde la dernière météo connue plutôt que rien
            if (cached && cached.city === city) cb(cached.data); else err(e);
        });
    }

    return { fetch: fetch, describe: describe, iconSvg: iconSvg };
}());
