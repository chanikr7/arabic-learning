/* סימנייה: הוספת מילה ממילון מדרסה ישר לרשימה בענן (Supabase).
   זה קובץ המקור הקריא; הסימנייה עצמה נוצרת ממנו ונמצאת ב-bookmarklet-install.html */
(function () {
    var API = 'https://okeuenzucpidgqmdsueu.supabase.co/rest/v1/word_lists';
    var API_KEY = 'sb_publishable_msl-qmlKE9CKABeByvVAQg_gJHZeDpT';
    var ID = 'my-arabic-lists-panel', LAST = 'myArabicLastList', NEW = '\u0000new';

    var old = document.getElementById(ID);
    if (old) { old.parentNode.removeChild(old); return; }

    var AR = /[ء-يٮ-ۓ]/, HE = /[א-ת]/;

    function clean(s) { return String(s || '').replace(/\s+/g, ' ').replace(/^ | $/g, ''); }

    function api(method, query, body, prefer) {
        var headers = { apikey: API_KEY, Authorization: 'Bearer ' + API_KEY };
        if (body) headers['Content-Type'] = 'application/json';
        if (prefer) headers.Prefer = prefer;
        return fetch(API + query, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
            .then(function (res) {
                return res.text().then(function (text) {
                    if (!res.ok) throw new Error(res.status + ' ' + text.slice(0, 200));
                    return text ? JSON.parse(text) : null;
                });
            });
    }

    /* בדף מילה: הכותרת היא העברית, אחריה מופיעה הערבית ומיד אחריה התעתיק */
    function findWord() {
        var w = { hebrew: '', arabic: '', transliteration: '' };
        var h1 = document.querySelector('h1');
        if (!h1) return w;
        var root = document.querySelector('main');
        if (!root || !root.contains(h1)) root = document.body;
        var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var n, passed = false;
        while ((n = tw.nextNode())) {
            if (h1.contains(n)) { passed = true; continue; }
            if (!passed) continue;
            var t = clean(n.nodeValue);
            if (!t) continue;
            if (!w.arabic) {
                if (AR.test(t) && !HE.test(t)) w.arabic = t;
            } else if (HE.test(t)) {
                w.transliteration = t;
                break;
            }
        }
        if (w.arabic) w.hebrew = clean(h1.textContent);
        return w;
    }

    function el(tag, css, text) {
        var e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (text) e.textContent = text;
        return e;
    }

    var FIELD = 'display:block;width:100%;box-sizing:border-box;margin:3px 0 8px;padding:6px 8px;font:16px Arial,sans-serif;' +
        'color:#222;background:#fff;border:1px solid #bbb;border-radius:4px;';
    var LABEL = 'display:block;font:13px Arial,sans-serif;color:#555;margin:0;';

    var word = findWord();
    var counts = {};

    var panel = el('div', 'position:fixed;top:12px;left:12px;z-index:2147483647;width:290px;max-height:92vh;overflow:auto;' +
        'box-sizing:border-box;padding:14px;background:#fff;color:#222;border:2px solid #4CAF50;border-radius:8px;' +
        'box-shadow:0 6px 24px rgba(0,0,0,.3);font:15px Arial,sans-serif;text-align:right;direction:rtl;');
    panel.id = ID;
    panel.setAttribute('dir', 'rtl');

    var close = el('button', 'position:absolute;top:6px;left:8px;background:none;border:0;font:20px Arial;color:#888;cursor:pointer;padding:0;', '×');
    close.onclick = function () { if (panel.parentNode) panel.parentNode.removeChild(panel); };
    panel.appendChild(close);
    panel.appendChild(el('div', 'font:bold 16px Arial,sans-serif;margin:0 0 10px;', 'הוספה לרשימות שלי'));

    function field(label, value) {
        panel.appendChild(el('label', LABEL, label));
        var i = el('input', FIELD);
        i.type = 'text';
        i.value = value;
        i.setAttribute('dir', 'rtl');
        panel.appendChild(i);
        return i;
    }
    var inHe = field('עברית', word.hebrew);
    var inAr = field('ערבית', word.arabic);
    var inTr = field('תעתיק', word.transliteration);

    panel.appendChild(el('label', LABEL, 'לאיזו רשימה?'));
    var sel = el('select', FIELD);
    var inNew = el('input', FIELD);
    inNew.type = 'text';
    inNew.placeholder = 'שם הרשימה החדשה';
    inNew.style.display = 'none';
    panel.appendChild(sel);
    panel.appendChild(inNew);

    var add = el('button', 'display:block;width:100%;box-sizing:border-box;margin:6px 0 0;padding:9px;font:bold 15px Arial,sans-serif;' +
        'color:#fff;background:#4CAF50;border:0;border-radius:4px;cursor:pointer;', 'הוסף לרשימה');
    add.disabled = true;
    panel.appendChild(add);
    var status = el('div', 'min-height:20px;margin:8px 0 0;font:14px Arial,sans-serif;');
    panel.appendChild(status);

    function say(text, kind) {
        status.style.color = kind === 'ok' ? '#2e7d32' : kind === 'err' ? '#c62828' : '#555';
        status.textContent = text;
    }
    function busy(on) { add.disabled = on; add.style.opacity = on ? '.6' : '1'; }

    function lastList() { try { return localStorage.getItem(LAST) || ''; } catch (e) { return ''; } }
    function rememberList(name) { try { localStorage.setItem(LAST, name); } catch (e) {} }

    function fillSelect(selected) {
        while (sel.firstChild) sel.removeChild(sel.firstChild);
        var names = Object.keys(counts).sort();
        for (var i = 0; i < names.length; i++) {
            var o = el('option', '', names[i] + ' (' + counts[names[i]] + ')');
            o.value = names[i];
            sel.appendChild(o);
        }
        var n = el('option', '', '+ רשימה חדשה…');
        n.value = NEW;
        sel.appendChild(n);
        sel.value = counts.hasOwnProperty(selected) ? selected : (names.length ? names[0] : NEW);
        toggleNew();
    }
    function toggleNew() { inNew.style.display = sel.value === NEW ? 'block' : 'none'; }
    sel.onchange = toggleNew;

    function sameWord(item, w) {
        if (item && typeof item === 'object') return item.hebrew === w.hebrew && item.arabic === w.arabic;
        if (typeof item === 'string') {
            var p = item.split(/\s+-\s+/);
            return clean(p[0]) === w.hebrew && clean(p[1]) === w.arabic;
        }
        return false;
    }

    add.onclick = function () {
        if (add.disabled) return;
        var w = { hebrew: clean(inHe.value), arabic: clean(inAr.value), transliteration: clean(inTr.value) };
        var name = sel.value === NEW ? clean(inNew.value) : sel.value;
        if (!w.hebrew || !w.arabic) return say('חסרה מילה בעברית או בערבית', 'err');
        if (!name) return say('צריך לתת שם לרשימה', 'err');

        busy(true);
        say('שומר…');
        /* קוראים את הרשימה העדכנית מהענן, מוסיפים את המילה ושומרים */
        api('GET', '?select=words&list_name=eq.' + encodeURIComponent(name))
            .then(function (rows) {
                var words = rows.length && Array.isArray(rows[0].words) ? rows[0].words : [];
                rememberList(name);
                for (var i = 0; i < words.length; i++) {
                    if (sameWord(words[i], w)) {
                        counts[name] = words.length;
                        return 'dup';
                    }
                }
                words.push(w);
                return api('POST', '?on_conflict=list_name', [{ list_name: name, words: words }],
                    'resolution=merge-duplicates,return=minimal').then(function () {
                    counts[name] = words.length;
                    return 'added';
                });
            })
            .then(function (result) {
                inNew.value = '';
                fillSelect(name);
                busy(false);
                if (result === 'dup') say('המילה כבר נמצאת ברשימה "' + name + '"', 'err');
                else say('נוסף לרשימה "' + name + '" ✓', 'ok');
            })
            .catch(function (err) {
                busy(false);
                say('השמירה לענן נכשלה: ' + err.message, 'err');
            });
    };

    panel.onkeydown = function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); add.onclick(); }
        if (e.key === 'Escape' || e.keyCode === 27) close.onclick();
    };

    document.body.appendChild(panel);
    say('טוען רשימות…');

    api('GET', '?select=list_name,words')
        .then(function (rows) {
            for (var i = 0; i < rows.length; i++) {
                counts[rows[i].list_name] = Array.isArray(rows[i].words) ? rows[i].words.length : 0;
            }
            fillSelect(lastList());
            busy(false);
            if (word.arabic) say('');
            else say('לא זוהתה מילה בעמוד הזה. אפשר להקליד ידנית', 'err');
            (sel.value === NEW ? inNew : add).focus();
        })
        .catch(function (err) {
            say('לא הצלחתי להתחבר לרשימות בענן: ' + err.message, 'err');
        });
})();
