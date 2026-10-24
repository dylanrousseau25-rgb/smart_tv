/* Petits utilitaires, écrits en ES5 pour tourner sur les vieux navigateurs Tizen (2016+). */
var U = (function () {
    'use strict';

    function $(id) { return document.getElementById(id); }

    function extend(target) {
        for (var i = 1; i < arguments.length; i++) {
            var src = arguments[i];
            if (!src) continue;
            for (var k in src) {
                if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
            }
        }
        return target;
    }

    function getJSON(url, onOk, onErr, timeoutMs) {
        var xhr = new XMLHttpRequest();
        var done = false;
        function fail(msg) {
            if (done) return;
            done = true;
            if (onErr) onErr(msg);
        }
        xhr.open('GET', url, true);
        xhr.timeout = timeoutMs || 10000;
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4 || done) return;
            if (xhr.status >= 200 && xhr.status < 300) {
                var data;
                try { data = JSON.parse(xhr.responseText); } catch (e) { return fail('JSON invalide'); }
                done = true;
                onOk(data);
            } else {
                fail('HTTP ' + xhr.status);
            }
        };
        xhr.ontimeout = function () { fail('délai dépassé'); };
        xhr.onerror = function () { fail('réseau'); };
        xhr.send();
    }

    function store(key, value) {
        try { localStorage.setItem('fmt.' + key, JSON.stringify(value)); } catch (e) { /* stockage plein ou désactivé */ }
    }

    function load(key, fallback) {
        try {
            var raw = localStorage.getItem('fmt.' + key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
        'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    function hhmm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

    function longDate(d) {
        return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
    }

    // "2026-10-24T18:39" (heure locale du lieu, renvoyée par Open-Meteo) -> "18:39"
    function isoTime(s) { return s ? s.substr(11, 5) : '--:--'; }

    // Convertit "2026-10-24T18:39" en Date locale sans dépendre du parseur ISO (incomplet sur vieux Tizen).
    function parseLocalIso(s) {
        var p = s.split(/[-T:]/);
        return new Date(+p[0], +p[1] - 1, +p[2], +p[3] || 0, +p[4] || 0);
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    return {
        $: $, extend: extend, getJSON: getJSON, store: store, load: load,
        pad: pad, hhmm: hhmm, longDate: longDate, isoTime: isoTime,
        parseLocalIso: parseLocalIso, el: el, shuffle: shuffle
    };
}());
