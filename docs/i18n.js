// Internationalization (i18n) support for Work Time Calculator
const I18N_STORAGE_KEY = 'wtc_language';

const translations = {
    it: {
        days: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'],
        subtitle: 'Calcola le tue ore di lavoro con soglia di 5 minuti',
        buttons: {
            export: '📊 Esporta CSV',
            clear: '🗑️ Pulisci Storage',
        },
        table: {
            day: 'Giorno',
            smart: 'SmartWorking',
            smartShort: 'Smart',
            entry1: 'Entrata 1',
            exit1: 'Uscita 1',
            entry2: 'Entrata 2',
            exit2: 'Uscita 2',
            permit: 'Permesso',
            diff: 'Scarto (HH:MM)',
            stolen: 'Rubati',
        },
        summary: {
            totalDiff: 'Totale Scarto',
            diffLabel: 'ore di scarto (HH:MM)',
            totalStolen: 'Totale Rubati',
            stolenLabel: 'min. rubati (HH:MM)',
        },
        weekSpan: {
            crosses: 'Settimana a cavallo di due mesi.',
            safe: 'Scarto usabile tutta la settimana',
        },
        defaultDay: {
            title: '⚙️ Giornata Default',
            subtitle: 'Configura una giornata predefinita che verrà applicata quando pulisci la settimana',
            save: '💾 Salva Giornata Default',
            saved: '✅ Salvato!',
        },
        clearDay: {
            title: 'Cancella giornata',
            confirm: 'Sei sicuro di voler cancellare tutti i dati della settimana? La giornata default verrà preservata.',
        },
        lunchWarning: {
            earlyExit: '⚠️ Uscita 1 prima delle 12:00',
            lateEntry: '⚠️ Entrata 2 dopo le 14:30',
        },
        csv: {
            header: 'Giorno,SmartWorking,Entrata 1,Uscita 1,Entrata 2,Uscita 2,Permesso,Scarto (HH:MM),Rubati\n',
            yes: 'Sì',
            no: 'No',
            total: 'TOTALE SCARTO',
        },
        import: {
            noData: 'Nessun dato valido trovato.\n\nFormati supportati:\n- Standard: E 07:25:06   U 12:22:07   E 13:10:00   U 16:32:48\n- Manuale: 07:25:06 | 12:22:07 | 13:10:00 (M) | 16:32:48',
            success: '✅ Importati {count} giorni!',
            button: '📥 Importa',
        },
        language: 'Lingua',
    },
    en: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        subtitle: 'Calculate your work hours with a 5-minute threshold',
        buttons: {
            export: '📊 Export CSV',
            clear: '🗑️ Clear Storage',
        },
        table: {
            day: 'Day',
            smart: 'SmartWorking',
            smartShort: 'Smart',
            entry1: 'Entry 1',
            exit1: 'Exit 1',
            entry2: 'Entry 2',
            exit2: 'Exit 2',
            permit: 'Permit',
            diff: 'Diff (HH:MM)',
            stolen: 'Stolen',
        },
        summary: {
            totalDiff: 'Total Diff',
            diffLabel: 'hours diff (HH:MM)',
            totalStolen: 'Total Stolen',
            stolenLabel: 'min. stolen (HH:MM)',
        },
        weekSpan: {
            crosses: 'Week spans two months.',
            safe: 'Diff usable all week',
        },
        defaultDay: {
            title: '⚙️ Default Day',
            subtitle: 'Configure a default day that will be applied when you clear the week',
            save: '💾 Save Default Day',
            saved: '✅ Saved!',
        },
        clearDay: {
            title: 'Clear day',
            confirm: 'Are you sure you want to clear all week data? The default day will be preserved.',
        },
        lunchWarning: {
            earlyExit: '⚠️ Exit 1 before 12:00',
            lateEntry: '⚠️ Entry 2 after 14:30',
        },
        csv: {
            header: 'Day,SmartWorking,Entry 1,Exit 1,Entry 2,Exit 2,Permit,Diff (HH:MM),Stolen\n',
            yes: 'Yes',
            no: 'No',
            total: 'TOTAL DIFF',
        },
        import: {
            noData: 'No valid data found.\n\nSupported formats:\n- Standard: E 07:25:06   U 12:22:07   E 13:10:00   U 16:32:48\n- Manual: 07:25:06 | 12:22:07 | 13:10:00 (M) | 16:32:48',
            success: '✅ Imported {count} days!',
            button: '📥 Import',
        },
        language: 'Language',
    },
};

/**
 * Returns the currently active language code ('it' or 'en').
 * Falls back to auto-detection from the browser, then to 'it'.
 */
function getCurrentLanguage() {
    const stored = localStorage.getItem(I18N_STORAGE_KEY);
    if (stored && translations[stored]) return stored;
    // Auto-detect from browser language
    const browserLang = (navigator.language || 'it').split('-')[0].toLowerCase();
    return translations[browserLang] ? browserLang : 'it';
}

/**
 * Persists the chosen language and reloads the page to apply it.
 * @param {string} lang - Language code ('it' or 'en')
 */
function setLanguage(lang) {
    if (!translations[lang]) return;
    localStorage.setItem(I18N_STORAGE_KEY, lang);
    location.reload();
}

/**
 * Returns the translated string for the given dot-separated key.
 * Falls back to Italian if the key is missing in the selected language.
 * @param {string} key - Dot-separated translation key (e.g. 'buttons.export')
 * @returns {*} Translated value (string or array)
 */
function t(key) {
    const lang = getCurrentLanguage();
    const keys = key.split('.');

    function resolve(obj, parts) {
        let value = obj;
        for (const k of parts) {
            if (value == null || typeof value !== 'object') return undefined;
            value = value[k];
        }
        return value;
    }

    const value = resolve(translations[lang], keys);
    if (value !== undefined && value !== null) return value;

    // Fallback to Italian
    const fallback = resolve(translations['it'], keys);
    if (fallback !== undefined && fallback !== null) return fallback;

    return key;
}

/**
 * Returns a translated string with placeholder substitution.
 * Placeholders are written as {name} in the translation string.
 * @param {string} key - Translation key
 * @param {Object} replacements - Map of placeholder names to values
 * @returns {string}
 */
function tpl(key, replacements) {
    let str = t(key);
    if (typeof str !== 'string') return String(str);
    Object.keys(replacements).forEach(placeholder => {
        str = str.replace(`{${placeholder}}`, replacements[placeholder]);
    });
    return str;
}

/**
 * Applies translations to all DOM elements bearing data-i18n or data-i18n-title
 * attributes, and synchronises the language selector widget.
 */
function applyTranslations() {
    // Update textContent for elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);
        if (typeof translation === 'string') {
            el.textContent = translation;
        }
    });

    // Update title attribute for elements with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const translation = t(key);
        if (typeof translation === 'string') {
            el.title = translation;
        }
    });

    // Sync the language selector widget
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.value = getCurrentLanguage();
    }

    // Update the <html lang> attribute
    document.documentElement.lang = getCurrentLanguage();
}
