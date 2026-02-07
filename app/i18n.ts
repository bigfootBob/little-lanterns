import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

const i18n = new I18n({
    en: {
        startTracking: 'START TRACKING',
        usingShower: 'USING SHOWER',
        showerLogged: 'SHOWER LOGGED',
        saveEpisode: 'SAVE EPISODE',
        addNotesPlaceholder: 'Add notes (e.g. triggers)...',
        savedTitle: 'Saved',
        savedMessage: 'Episode logged to the Oregon cloud.',
        errorTitle: 'Error',
        modalTitle: 'This is a modal',
        goHome: 'Go to home screen',
    },
    de: { // German
        startTracking: 'TRACKING STARTEN',
        usingShower: 'DUSCHE BENUTZEN',
        showerLogged: 'DUSCHE PROTOKOLLIERT',
        saveEpisode: 'EPISODE SPEICHERN',
        addNotesPlaceholder: 'Notizen hinzufügen (z.B. Auslöser)...',
        savedTitle: 'Gespeichert',
        savedMessage: 'Episode in der Oregon-Cloud protokolliert.',
        errorTitle: 'Fehler',
        modalTitle: 'Dies ist ein Modal',
        goHome: 'Zur Startseite',
    },
    it: { // Italian
        startTracking: 'INIZIA TRACCIAMENTO',
        usingShower: 'USARE LA DOCCIA',
        showerLogged: 'DOCCIA REGISTRATA',
        saveEpisode: 'SALVA EPISODIO',
        addNotesPlaceholder: 'Aggiungi note (es. fattori scatenanti)...',
        savedTitle: 'Salvato',
        savedMessage: 'Episodio registrato nel cloud Oregon.',
        errorTitle: 'Errore',
        modalTitle: 'Questo è un modale',
        goHome: 'Vai alla home',
    },
    es: { // Spanish
        startTracking: 'EMPEZAR SEGUIMIENTO',
        usingShower: 'USAR DUCHA',
        showerLogged: 'DUCHA REGISTRADA',
        saveEpisode: 'GUARDAR EPISODIO',
        addNotesPlaceholder: 'Añadir notas (ej. desencadenantes)...',
        savedTitle: 'Guardado',
        savedMessage: 'Episodio registrado en la nube de Oregón.',
        errorTitle: 'Error',
        modalTitle: 'Esto es un modal',
        goHome: 'Ir a inicio',
    },
    da: { // Danish
        startTracking: 'START TRACKING',
        usingShower: 'BRUG BAD',
        showerLogged: 'BAD LOGGET',
        saveEpisode: 'GEM EPISODE',
        addNotesPlaceholder: 'Tilføj noter (fx udløsere)...',
        savedTitle: 'Gemt',
        savedMessage: 'Episode logget i Oregon-skyen.',
        errorTitle: 'Fejl',
        modalTitle: 'Dette er en modal',
        goHome: 'Gå til hjem',
    },
    uk: { // Ukrainian
        startTracking: 'ПОЧАТИ ВІДСТЕЖЕННЯ',
        usingShower: 'ВИКОРИСТОВУЮ ДУШ',
        showerLogged: 'ДУШ ЗАПИСАНО',
        saveEpisode: 'ЗБЕРЕГТИ ЕПІЗОД',
        addNotesPlaceholder: 'Додати нотатки (напр. тригери)...',
        savedTitle: 'Збережено',
        savedMessage: 'Епізод записано в хмару Орегон.',
        errorTitle: 'Помилка',
        modalTitle: 'Це модальне вікно',
        goHome: 'На головну',
    },
});

i18n.locale = getLocales()[0].languageCode ?? 'en';
i18n.enableFallback = true;

export default i18n;
