/*
 * Couche Samsung Tizen : liste des apps installées, lancement, touches de la télécommande.
 * Hors TV (navigateur sur l'ordi), on simule une liste d'apps pour pouvoir tester l'interface.
 */
var Platform = (function () {
    'use strict';

    var isTV = typeof tizen !== 'undefined' && !!tizen.application;

    // Codes des touches de la télécommande Samsung
    var KEY = {
        LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
        BACK: 10009, EXIT: 10182, BACKSPACE: 8, ESC: 27,
        RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406
    };

    /*
     * Identité visuelle des apps connues : couleur de fond, couleur du texte, nom affiché.
     * Repérées par leur nom, donc ça marche quel que soit l'identifiant Tizen de l'app.
     * `ids` sert de secours si la TV refuse de lister les apps (voir knownApps()).
     */
    var BRANDS = [
        { match: /netflix/i, label: 'NETFLIX', bg: '#000000', fg: '#E50914', ids: ['3201907018807', '11101200001'] },
        { match: /youtube(?!.*(kids|music))/i, label: 'YouTube', bg: '#FF0000', fg: '#FFFFFF', ids: ['111299001912', '9Ur5IzDKqV.TizenYouTube'] },
        { match: /prime ?video|amazon/i, label: 'prime video', bg: '#00050D', fg: '#1A98FF', ids: ['3201910019365', 'org.tizen.ignition'] },
        { match: /disney/i, label: 'Disney+', bg: '#0B1D5C', fg: '#FFFFFF', ids: ['3201901017640'] },
        { match: /apple ?tv/i, label: 'Apple TV', bg: '#1C1C1E', fg: '#FFFFFF', ids: ['3201807016597'] },
        { match: /spotify/i, label: 'Spotify', bg: '#121212', fg: '#1ED760', ids: ['3201606009684'] },
        { match: /plex/i, label: 'plex', bg: '#1F1F1F', fg: '#E5A00D', ids: ['3201512006963'] },
        { match: /canal/i, label: 'CANAL+', bg: '#000000', fg: '#FFFFFF' },
        { match: /france ?tv|france\.tv/i, label: 'france.tv', bg: '#1E1BFF', fg: '#FFFFFF' },
        { match: /arte/i, label: 'ARTE', bg: '#FA481C', fg: '#FFFFFF' },
        { match: /tf1/i, label: 'TF1+', bg: '#0A2C8F', fg: '#FFFFFF' },
        { match: /^m6|m6\+/i, label: 'M6+', bg: '#111111', fg: '#FFFFFF' },
        { match: /molotov/i, label: 'Molotov', bg: '#0F0F14', fg: '#FFFFFF' },
        { match: /twitch/i, label: 'twitch', bg: '#9146FF', fg: '#FFFFFF' },
        { match: /deezer/i, label: 'deezer', bg: '#A238FF', fg: '#FFFFFF' },
        { match: /crunchyroll/i, label: 'crunchyroll', bg: '#F47521', fg: '#FFFFFF' },
        { match: /^adn\b|anime digital/i, label: 'ADN', bg: '#0B1B3F', fg: '#2FA8FF' },
        { match: /apple ?music/i, label: 'Apple Music', bg: '#FA2D48', fg: '#FFFFFF' },
        { match: /^max$|hbo/i, label: 'max', bg: '#002BE7', fg: '#FFFFFF' },
        { match: /paramount/i, label: 'Paramount+', bg: '#0064FF', fg: '#FFFFFF' },
        { match: /rakuten/i, label: 'Rakuten TV', bg: '#BF0000', fg: '#FFFFFF' },
        { match: /youtube ?kids/i, label: 'YouTube Kids', bg: '#FF4E45', fg: '#FFFFFF' },
        { match: /youtube ?music/i, label: 'YT Music', bg: '#000000', fg: '#FF0000' },
        { match: /navigateur|internet|browser/i, label: 'Internet', bg: '#1428A0', fg: '#FFFFFF' }
    ];

    // Ordre de préférence pour remplir l'étagère au premier lancement
    var DEFAULT_ORDER = [/youtube(?!.*(kids|music))/i, /netflix/i, /disney/i, /tf1/i, /crunchyroll/i,
        /^adn\b|anime digital/i, /canal/i, /apple ?music/i];

    var MOCK_APPS = [
        'Netflix', 'YouTube', 'Prime Video', 'Disney+', 'CANAL+', 'france.tv', 'Apple TV', 'Apple Music',
        'Crunchyroll', 'ADN', 'Spotify', 'ARTE', 'Plex', 'Twitch', 'TF1+', 'Internet', 'Samsung TV Plus'
    ];

    function brandFor(name) {
        for (var i = 0; i < BRANDS.length; i++) {
            if (BRANDS[i].match.test(name)) return BRANDS[i];
        }
        return null;
    }

    // Apps lancées sans icône "show" (services système) : on les masque.
    var HIDDEN = /free my tv|^org\.tizen\.|widget|service|setting|smartthings ?hub|e-manual|launcher/i;

    function listApps(callback) {
        if (!isTV) {
            callback(MOCK_APPS.map(function (n, i) { return { id: 'mock.' + i, name: n, icon: null }; }));
            return;
        }
        var ownId = '';
        try { ownId = tizen.application.getCurrentApplication().appInfo.id; } catch (e) { /* ignore */ }

        try {
            tizen.application.getAppsInfo(function (infos) {
                var apps = [];
                for (var i = 0; i < infos.length; i++) {
                    var a = infos[i];
                    if (!a.show || a.id === ownId || !a.name || HIDDEN.test(a.name) || HIDDEN.test(a.id)) continue;
                    apps.push({ id: a.id, name: a.name, icon: a.iconPath || null });
                }
                apps.sort(function (x, y) { return x.name.localeCompare(y.name); });
                callback(apps.length ? apps : knownApps());
            }, function () {
                callback(knownApps());
            });
        } catch (e) {
            callback(knownApps());
        }
    }

    // Secours : si la TV refuse de lister les apps, on propose les grandes apps avec leurs identifiants connus.
    function knownApps() {
        var out = [];
        BRANDS.forEach(function (b) {
            if (b.ids) out.push({ id: b.ids[0], altIds: b.ids.slice(1), name: b.label, icon: null });
        });
        return out;
    }

    function launch(app, onOk, onErr) {
        if (!isTV) {
            setTimeout(function () { onErr('simulation'); }, 300);
            return;
        }
        var ids = [app.id].concat(app.altIds || []);
        (function tryNext(i) {
            if (i >= ids.length) { onErr('introuvable'); return; }
            try {
                tizen.application.launch(ids[i], onOk, function () { tryNext(i + 1); });
            } catch (e) {
                tryNext(i + 1);
            }
        }(0));
    }

    function registerKeys() {
        if (!isTV || !tizen.tvinputdevice) return;
        ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'].forEach(function (k) {
            try { tizen.tvinputdevice.registerKey(k); } catch (e) { /* touche absente sur ce modèle */ }
        });
    }

    // Empêche l'économiseur d'écran Samsung de passer devant notre veille « tableau »
    function disableSystemScreensaver() {
        try {
            webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF);
        } catch (e) { /* webapis indisponible (navigateur) */ }
    }

    function exit() {
        if (isTV) {
            try { tizen.application.getCurrentApplication().exit(); } catch (e) { /* ignore */ }
        }
    }

    return {
        isTV: isTV, KEY: KEY, brandFor: brandFor, DEFAULT_ORDER: DEFAULT_ORDER,
        listApps: listApps, launch: launch, registerKeys: registerKeys,
        disableSystemScreensaver: disableSystemScreensaver, exit: exit
    };
}());
