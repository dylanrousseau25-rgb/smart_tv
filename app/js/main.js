/* Free My TV pour Samsung : écran d'accueil, étagère d'apps, météo, réglages, veille tableau. */
(function () {
    'use strict';

    var $ = U.$;
    var KEY = Platform.KEY;
    var MAX_SHELF = 8;

    var DEFAULTS = {
        shelf: null,          // identifiants des apps, dans l'ordre ; null = choisir automatiquement
        city: '',             // vide = position de la connexion
        theme: 'auto',
        idleMin: 5,           // 0 = jamais
        artCollection: 'chefs',
        artSec: 60
    };

    var THEMES = [
        { value: 'auto', label: 'Automatique' },
        { value: 'jour', label: 'Jour' },
        { value: 'couchant', label: 'Coucher de soleil' },
        { value: 'nuit', label: 'Nuit' },
        { value: 'oled', label: 'Noir OLED' }
    ];
    var IDLE_CHOICES = [{ value: 2, label: '2 min' }, { value: 5, label: '5 min' }, { value: 10, label: '10 min' },
        { value: 30, label: '30 min' }, { value: 0, label: 'Jamais' }];
    var ARTDUR_CHOICES = [{ value: 30, label: '30 s' }, { value: 60, label: '1 min' },
        { value: 180, label: '3 min' }, { value: 600, label: '10 min' }];

    var settings = U.extend({}, DEFAULTS, U.load('settings', {}));
    var draft = null;          // copie des réglages pendant l'édition
    var apps = [];
    var appsById = {};
    var weather = null;
    var mode = 'home';         // home | weather | settings | reorder
    var picked = null;         // app saisie en mode réorganisation
    var launching = false;
    var idleTimer = null;
    var toastTimer = null;

    /* ---------- Horloge, salutation, thème ---------- */

    function greeting(h) {
        if (h >= 5 && h < 12) return 'Bonjour';
        if (h >= 12 && h < 18) return 'Bon après-midi';
        if (h >= 18 && h < 23) return 'Bonsoir';
        return 'Bonne nuit';
    }

    function autoTheme(now) {
        if (weather && weather.daily) {
            var rise = U.parseLocalIso(weather.daily.sunrise[0]).getTime();
            var set = U.parseLocalIso(weather.daily.sunset[0]).getTime();
            var t = now.getTime();
            var M = 45 * 60000;
            if (Math.abs(t - set) < M || Math.abs(t - rise) < M) return 'couchant';
            return t > rise && t < set ? 'jour' : 'nuit';
        }
        var h = now.getHours();
        if (h >= 8 && h < 17) return 'jour';
        if (h >= 17 && h < 19) return 'couchant';
        return 'nuit';
    }

    function applyTheme() {
        var t = settings.theme === 'auto' ? autoTheme(new Date()) : settings.theme;
        var cls = 'theme-' + t + (mode === 'reorder' ? ' reordering' : '');
        if (document.body.className !== cls) document.body.className = cls;
    }

    function tick() {
        var now = new Date();
        $('clock').textContent = U.hhmm(now);
        $('date').textContent = U.longDate(now);
        $('greeting').textContent = greeting(now.getHours());
        applyTheme();
    }

    /* ---------- Météo ---------- */

    function refreshWeather() {
        Weather.fetch(settings.city, function (d) {
            weather = d;
            renderWeather();
            applyTheme();
        }, function (err) {
            $('weather-temp').textContent = '--°';
            $('weather-city').textContent = '';
            $('hero-sub').textContent = 'Météo indisponible (' + err + ')';
        });
    }

    function renderWeather() {
        if (!weather || !weather.current) return;
        var c = weather.current;
        var desc = Weather.describe(c.weather_code);
        $('weather-icon').innerHTML = Weather.iconSvg(desc.icon, c.is_day);
        $('weather-temp').textContent = Math.round(c.temperature_2m) + '°';
        $('weather-city').textContent = weather.placeName || '';

        var now = new Date();
        var set = U.parseLocalIso(weather.daily.sunset[0]);
        var sunTxt = now < set
            ? 'Coucher du soleil à ' + U.isoTime(weather.daily.sunset[0])
            : 'Lever du soleil à ' + U.isoTime(weather.daily.sunrise[1] || weather.daily.sunrise[0]);
        $('hero-sub').textContent = desc.label + ' · ' +
            Math.round(weather.daily.temperature_2m_min[0]) + '° / ' +
            Math.round(weather.daily.temperature_2m_max[0]) + '° · ' + sunTxt;
    }

    function renderWeatherDrawer() {
        if (!weather || !weather.current) {
            $('wd-now').textContent = 'Météo indisponible pour le moment.';
            $('wd-hours').innerHTML = '';
            $('wd-sun').textContent = '';
            return;
        }
        var c = weather.current;
        var desc = Weather.describe(c.weather_code);
        $('wd-title').textContent = 'Météo' + (weather.placeName ? ' · ' + weather.placeName : '');
        $('wd-now').innerHTML = '';
        var big = U.el('div', 'wd-big');
        big.innerHTML = Weather.iconSvg(desc.icon, c.is_day);
        big.appendChild(U.el('span', 'wd-temp', Math.round(c.temperature_2m) + '°'));
        var info = U.el('div', 'wd-info');
        info.appendChild(U.el('div', 'wd-label', desc.label));
        info.appendChild(U.el('div', '', 'Ressenti ' + Math.round(c.apparent_temperature) + '° · Vent ' +
            Math.round(c.wind_speed_10m) + ' km/h'));
        big.appendChild(info);
        $('wd-now').appendChild(big);

        // 12 prochaines heures, à partir de l'heure en cours
        var h = weather.hourly;
        var start = 0;
        var curHour = c.time.substr(0, 13);
        for (var i = 0; i < h.time.length; i++) {
            if (h.time[i].substr(0, 13) === curHour) { start = i; break; }
        }
        var wrap = $('wd-hours');
        wrap.innerHTML = '';
        for (var j = start; j < Math.min(start + 12, h.time.length); j++) {
            var cell = U.el('div', 'hour');
            cell.appendChild(U.el('div', 'h-time', j === start ? 'Maint.' : h.time[j].substr(11, 2) + 'h'));
            var ic = U.el('div', 'h-icon');
            ic.innerHTML = Weather.iconSvg(Weather.describe(h.weather_code[j]).icon, h.is_day[j]);
            cell.appendChild(ic);
            cell.appendChild(U.el('div', 'h-temp', Math.round(h.temperature_2m[j]) + '°'));
            var p = h.precipitation_probability ? h.precipitation_probability[j] : null;
            cell.appendChild(U.el('div', 'h-rain', p ? p + ' %' : ''));
            wrap.appendChild(cell);
        }
        $('wd-sun').textContent = 'Lever ' + U.isoTime(weather.daily.sunrise[0]) +
            '   ·   Coucher ' + U.isoTime(weather.daily.sunset[0]);
    }

    /* ---------- Étagère d'apps ---------- */

    function defaultShelf() {
        var out = [];
        Platform.DEFAULT_ORDER.forEach(function (re) {
            for (var i = 0; i < apps.length && out.length < MAX_SHELF; i++) {
                if (re.test(apps[i].name) && out.indexOf(apps[i].id) === -1) { out.push(apps[i].id); break; }
            }
        });
        return out;
    }

    function shelfIds() {
        return (settings.shelf || []).filter(function (id) { return !!appsById[id]; });
    }

    function colorFromName(name) {
        var h = 0;
        for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
        return 'hsl(' + h + ', 45%, 28%)';
    }

    function makeTile(app) {
        var brand = Platform.brandFor(app.name);
        var tile = U.el('div', 'tile focusable');
        tile.setAttribute('data-action', 'launch');
        tile.setAttribute('data-id', app.id);
        tile.style.backgroundColor = brand ? brand.bg : colorFromName(app.name);

        var label = U.el('div', 'tile-label', brand ? brand.label : app.name);
        if (brand) label.style.color = brand.fg;
        if ((brand ? brand.label : app.name).length > 10) label.className += ' long';

        // Apps sans identité connue : on tente l'icône fournie par la TV, sinon le nom
        if (!brand && app.icon && Platform.isTV) {
            var img = new Image();
            img.className = 'tile-icon';
            img.onload = function () { tile.className += ' has-icon'; };
            img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); };
            img.src = app.icon.indexOf('/') === 0 ? 'file://' + app.icon : app.icon;
            tile.appendChild(img);
        }
        tile.appendChild(label);
        tile.appendChild(U.el('div', 'tile-name', app.name));
        return tile;
    }

    function renderShelf(focusId) {
        var shelf = $('shelf');
        shelf.innerHTML = '';
        shelfIds().forEach(function (id) { shelf.appendChild(makeTile(appsById[id])); });

        if (mode !== 'reorder') {
            var art = U.el('div', 'tile tile-art focusable');
            art.setAttribute('data-action', 'art');
            art.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 17l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.6"/></svg>';
            art.appendChild(U.el('div', 'tile-name', 'Mode tableau'));
            shelf.appendChild(art);
        }

        if (!shelfIds().length) {
            $('shelf-hint').textContent = 'Ajoute tes apps dans les Réglages (bouton ⚙ en haut à droite).';
        } else if (mode === 'reorder') {
            $('shelf-hint').textContent = picked
                ? '◀ ▶ pour déplacer · OK pour poser'
                : 'OK pour saisir une app · Retour pour terminer';
        } else {
            $('shelf-hint').textContent = '';
        }

        if (focusId) {
            var el = shelf.querySelector('[data-id="' + focusId + '"]');
            if (el) Nav.focus(el);
        }
    }

    function launchApp(id) {
        var app = appsById[id];
        if (!app || launching) return;
        launching = true;
        toast('Ouverture de ' + app.name + '…');
        var guard = setTimeout(function () {
            launching = false;
            toast(app.name + ' ne répond pas.');
        }, 8000);
        Platform.launch(app, function () {
            clearTimeout(guard);
            launching = false;
            hideToast();
        }, function (why) {
            clearTimeout(guard);
            launching = false;
            toast(why === 'simulation'
                ? 'Aperçu : sur la TV, ' + app.name + ' s\'ouvrirait ici.'
                : 'Impossible d\'ouvrir ' + app.name + '.');
        });
    }

    /* ---------- Mode réorganisation ---------- */

    function startReorder() {
        closeOverlays();
        if (!shelfIds().length) { toast('Ajoute d\'abord des apps dans les Réglages.'); return; }
        mode = 'reorder';
        picked = null;
        applyTheme();
        Nav.setRoot($('shelf'));
        renderShelf();
        Nav.focusFirst('.tile');
    }

    function finishReorder() {
        mode = 'home';
        picked = null;
        settings.shelf = shelfIds();
        saveSettings();
        applyTheme();
        Nav.setRoot($('home'));
        renderShelf();
        Nav.focusFirst('.tile');
        toast('Ordre enregistré.');
    }

    function reorderKey(code) {
        var cur = Nav.get();
        var id = cur ? cur.getAttribute('data-id') : null;
        if (code === KEY.ENTER) {
            picked = picked ? null : id;
            renderShelf(id);
            if (picked) Nav.get().className += ' picked';
            return;
        }
        if (code !== KEY.LEFT && code !== KEY.RIGHT) return;
        if (!picked) { Nav.move(DIRS[code]); return; }
        var list = shelfIds();
        var i = list.indexOf(picked);
        var j = code === KEY.LEFT ? i - 1 : i + 1;
        if (j < 0 || j >= list.length) return;
        list[i] = list[j];
        list[j] = picked;
        settings.shelf = list;
        renderShelf(picked);
        Nav.get().className += ' picked';
    }

    /* ---------- Réglages ---------- */

    function saveSettings() { U.store('settings', settings); }

    function openSettings() {
        draft = U.extend({}, settings, { shelf: shelfIds() });
        renderSettings();
        openOverlay('settings');
        Nav.focusFirst('#app-list .row');
    }

    function renderSettings(focusSel) {
        var list = $('app-list');
        list.innerHTML = '';
        // Apps choisies d'abord (dans l'ordre de l'étagère), puis les autres
        var chosen = draft.shelf.map(function (id) { return appsById[id]; });
        var others = apps.filter(function (a) { return draft.shelf.indexOf(a.id) === -1; });
        chosen.concat(others).forEach(function (a) {
            var pos = draft.shelf.indexOf(a.id);
            var row = U.el('div', 'row focusable' + (pos >= 0 ? ' on' : ''));
            row.setAttribute('data-action', 'toggle-app');
            row.setAttribute('data-id', a.id);
            row.appendChild(U.el('span', 'check', pos >= 0 ? String(pos + 1) : ''));
            row.appendChild(U.el('span', 'row-name', a.name));
            list.appendChild(row);
        });
        $('app-count').textContent = '(' + draft.shelf.length + '/' + MAX_SHELF + ')';
        $('city-input').value = draft.city;

        renderOptions('theme-options', 'theme', THEMES);
        renderOptions('idle-options', 'idleMin', IDLE_CHOICES);
        var cols = [];
        for (var k in Art.COLLECTIONS) {
            if (Object.prototype.hasOwnProperty.call(Art.COLLECTIONS, k)) cols.push({ value: k, label: Art.COLLECTIONS[k].label });
        }
        renderOptions('art-options', 'artCollection', cols);
        renderOptions('artdur-options', 'artSec', ARTDUR_CHOICES);

        if (focusSel) {
            var el = $('settings').querySelector(focusSel);
            if (el) Nav.focus(el);
        }
    }

    function renderOptions(containerId, key, choices) {
        var box = $(containerId);
        box.innerHTML = '';
        choices.forEach(function (c) {
            var o = U.el('div', 'opt focusable' + (draft[key] === c.value ? ' on' : ''), c.label);
            o.setAttribute('data-action', 'opt');
            o.setAttribute('data-key', key);
            o.setAttribute('data-value', String(c.value));
            box.appendChild(o);
        });
    }

    function toggleApp(id) {
        var i = draft.shelf.indexOf(id);
        if (i >= 0) draft.shelf.splice(i, 1);
        else if (draft.shelf.length >= MAX_SHELF) { toast('8 apps maximum sur l\'étagère.'); return; }
        else draft.shelf.push(id);
        renderSettings('#app-list [data-id="' + id + '"]');
    }

    function setOption(el) {
        var key = el.getAttribute('data-key');
        var raw = el.getAttribute('data-value');
        draft[key] = typeof DEFAULTS[key] === 'number' ? +raw : raw;
        renderSettings('[data-key="' + key + '"][data-value="' + raw + '"]');
    }

    function commitSettings() {
        draft.city = $('city-input').value.replace(/^\s+|\s+$/g, '');
        var cityChanged = draft.city !== settings.city;
        settings = draft;
        draft = null;
        saveSettings();
        closeOverlays();
        renderShelf();
        applyTheme();
        resetIdle();
        if (cityChanged) {
            U.store('weather', null);
            refreshWeather();
        }
        toast('Réglages enregistrés.');
    }

    /* ---------- Calques ---------- */

    function openOverlay(name) {
        closeOverlays(true);
        mode = name === 'weather-drawer' ? 'weather' : name;
        $(name).className = 'overlay';
        Nav.setRoot($(name));
    }

    function closeOverlays(silent) {
        $('settings').className = 'overlay hidden';
        $('weather-drawer').className = 'overlay hidden';
        if (silent) return;
        draft = null;
        mode = 'home';
        Nav.setRoot($('home'));
        Nav.focusFirst('.tile');
    }

    function toast(msg) {
        var t = $('toast');
        t.textContent = msg;
        t.className = '';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(hideToast, 3500);
    }

    function hideToast() { $('toast').className = 'hidden'; }

    /* ---------- Veille ---------- */

    function startArt() {
        Art.start({ collection: settings.artCollection, durationMs: settings.artSec * 1000 });
    }

    function resetIdle() {
        clearTimeout(idleTimer);
        if (settings.idleMin > 0 && !Art.isRunning()) {
            idleTimer = setTimeout(startArt, settings.idleMin * 60000);
        }
    }

    /* ---------- Actions et touches ---------- */

    function activate(el) {
        if (!el) return;
        var action = el.getAttribute('data-action');
        var id = el.getAttribute('data-id');
        if (action === 'launch') launchApp(id);
        else if (action === 'art') startArt();
        else if (action === 'weather') { renderWeatherDrawer(); openOverlay('weather-drawer'); Nav.focusFirst('.btn'); }
        else if (action === 'settings') openSettings();
        else if (action === 'close-overlay') closeOverlays();
        else if (action === 'toggle-app') toggleApp(id);
        else if (action === 'opt') setOption(el);
        else if (action === 'save-settings') commitSettings();
        else if (action === 'reorder') startReorder();
        else if (el.tagName === 'INPUT') el.focus();   // ouvre le clavier à l'écran
    }

    function goBack() {
        if (mode === 'reorder') finishReorder();
        else if (mode !== 'home') closeOverlays();
        else Platform.exit();
    }

    var DIRS = {};
    DIRS[KEY.LEFT] = 'left'; DIRS[KEY.RIGHT] = 'right'; DIRS[KEY.UP] = 'up'; DIRS[KEY.DOWN] = 'down';

    document.addEventListener('keydown', function (e) {
        var code = e.keyCode;

        // Toute touche réveille l'écran ; elle ne fait rien d'autre
        if (Art.isRunning()) {
            Art.stop();
            resetIdle();
            e.preventDefault();
            return;
        }
        resetIdle();

        // Saisie dans le champ Ville : OK / Terminé / Retour referment le clavier
        var active = document.activeElement;
        if (active && active.tagName === 'INPUT') {
            if (code === KEY.ENTER || code === 65376 || code === 65385 || code === KEY.BACK ||
                code === KEY.ESC || code === KEY.DOWN || code === KEY.UP) {
                active.blur();
                e.preventDefault();
                if (DIRS[code]) Nav.move(DIRS[code]);
            }
            return;
        }

        if (mode === 'reorder' && (code === KEY.ENTER || DIRS[code])) {
            reorderKey(code);
            e.preventDefault();
            return;
        }

        if (DIRS[code]) { Nav.move(DIRS[code]); e.preventDefault(); }
        else if (code === KEY.ENTER) { activate(Nav.get()); e.preventDefault(); }
        else if (code === KEY.BACK || code === KEY.ESC || code === KEY.BACKSPACE) { goBack(); e.preventDefault(); }
        else if (code === KEY.RED) openSettings();
        else if (code === KEY.GREEN) activate($('weather-widget'));
        else if (code === KEY.BLUE) startArt();
    });

    document.addEventListener('click', function (e) {
        if (Art.isRunning()) { Art.stop(); resetIdle(); return; }
        var t = e.target;
        while (t && t !== document) {
            if (t.classList && t.classList.contains('focusable')) {
                Nav.focus(t);
                if (mode === 'reorder') reorderKey(KEY.ENTER); else activate(t);
                return;
            }
            t = t.parentNode;
        }
    });

    var lastMove = 0;
    document.addEventListener('mousemove', function () {
        var now = Date.now();
        if (now - lastMove < 1000) return;
        lastMove = now;
        if (Art.isRunning()) Art.stop();
        resetIdle();
    });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            Art.stop();
            clearTimeout(idleTimer);
        } else {
            Platform.disableSystemScreensaver();
            launching = false;
            refreshWeather();
            tick();
            resetIdle();
        }
    });

    /* ---------- Démarrage ---------- */

    function init() {
        Platform.registerKeys();
        Platform.disableSystemScreensaver();
        tick();
        setInterval(tick, 10000);
        refreshWeather();
        setInterval(refreshWeather, 20 * 60 * 1000);

        Platform.listApps(function (list) {
            apps = list;
            appsById = {};
            apps.forEach(function (a) { appsById[a.id] = a; });
            if (!settings.shelf) {
                settings.shelf = defaultShelf();
                saveSettings();
            }
            Nav.setRoot($('home'));
            renderShelf();
            Nav.focusFirst('.tile');
            resetIdle();
        });
    }

    init();
}());
