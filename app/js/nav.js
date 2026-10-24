/*
 * Navigation aux flèches de la télécommande : on cherche l'élément ".focusable" le plus proche
 * dans la direction pressée, à l'intérieur du calque actif (accueil, réglages, météo).
 */
var Nav = (function () {
    'use strict';

    var root = document;
    var current = null;

    function setRoot(el) {
        root = el;
    }

    function candidates() {
        var list = root.querySelectorAll('.focusable');
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var r = list[i].getBoundingClientRect();
            if (r.width > 0 && r.height > 0) out.push(list[i]);
        }
        return out;
    }

    function focus(el) {
        if (!el) return;
        if (current) current.classList.remove('focused');
        current = el;
        el.classList.add('focused');
        // Le clavier à l'écran ne s'ouvre qu'avec OK sur un champ (voir main.js), pas au simple survol
        if (document.activeElement && document.activeElement.tagName === 'INPUT') {
            document.activeElement.blur();
        }
        if (el.scrollIntoViewIfNeeded) el.scrollIntoViewIfNeeded(false);
        else if (el.scrollIntoView) el.scrollIntoView(false);
    }

    function focusFirst(selector) {
        var el = selector ? root.querySelector(selector) : null;
        if (!el) el = candidates()[0];
        focus(el);
    }

    function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

    function move(dir) {
        var all = candidates();
        if (!current || all.indexOf(current) === -1) { focus(all[0]); return true; }

        var from = current.getBoundingClientRect();
        var c0 = center(from);
        var best = null;
        var bestScore = Infinity;

        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (el === current) continue;
            var r = el.getBoundingClientRect();
            var c = center(r);
            var dx = c.x - c0.x;
            var dy = c.y - c0.y;
            var main, cross;

            // L'élément doit être réellement dans la direction demandée ; gauche/droite restent sur la même ligne
            var sameRow = r.bottom > from.top && r.top < from.bottom;
            if (dir === 'left') { if (r.right > from.left + 1 || !sameRow) continue; main = -dx; cross = Math.abs(dy); }
            else if (dir === 'right') { if (r.left < from.right - 1 || !sameRow) continue; main = dx; cross = Math.abs(dy); }
            else if (dir === 'up') { if (r.bottom > from.top + 1) continue; main = -dy; cross = Math.abs(dx); }
            else { if (r.top < from.bottom - 1) continue; main = dy; cross = Math.abs(dx); }

            // On privilégie les éléments alignés (même ligne / même colonne)
            var score = main + cross * 2.5;
            if (score < bestScore) { bestScore = score; best = el; }
        }
        if (best) { focus(best); return true; }
        return false;
    }

    function get() { return current; }

    // Le pointeur (télécommande Smart Remote ou souris) déplace aussi le focus
    document.addEventListener('mouseover', function (e) {
        var t = e.target;
        while (t && t !== document) {
            if (t.classList && t.classList.contains('focusable') && root.contains(t)) { focus(t); return; }
            t = t.parentNode;
        }
    });

    return { setRoot: setRoot, focus: focus, focusFirst: focusFirst, move: move, get: get };
}());
