import { useState } from 'react'

const INTRO = {
  fr: "Bienvenue !\n\nCe programme, créé par le support DMS France, a pour vocation de faciliter la lecture des logs de la DMS Gateway, de formater des requêtes JSON brutes dans un format agréable à lire, ou encore de consulter la version de la DMS Gateway installée chez les clients.\n\n🔒 Confidentialité : aucune information n'est stockée. Les fichiers importés sont chargés dans le navigateur uniquement le temps de la lecture — rien n'est conservé, envoyé ou partagé.\n\nN'hésitez pas à signaler un bug ou à suggérer une amélioration : antoine.lancelot@nextlane.com\n\nMerci !",
  en: "Welcome!\n\nThis program, created by the DMS France support team, is designed to facilitate the reading of DMS Gateway logs, format raw JSON requests into a easy-to-read format, and check the version of the DMS Gateway installed at client sites.\n\n🔒 Privacy: no information is stored. Imported files are loaded in the browser only for the duration of the session — nothing is retained, sent, or shared.\n\nFeel free to report a bug or suggest an improvement: antoine.lancelot@nextlane.com\n\nThank you!",
}

const NOTES = [
  {
    version: 'v1.6',
    entries: [
      {
        fr: "Ajout du type de requête {blue|GetRepairOrder}, avec une recherche par {blue|Internal ID (Keys)} ou une {blue|requête aléatoire}. Dans les résultats, l'onglet Request affiche toutes les lignes de log de l'appel et l'onglet Response affiche sa ligne Result. Les erreurs du log liées à ces requêtes s'affichent dans le bandeau des {yellow|warnings} quand GetRepairOrder est sélectionné.",
        en: "Added the {blue|GetRepairOrder} query type, searchable by {blue|Internal ID (Keys)} or as a {blue|random request}. In the results, the Request tab shows all the log lines of the call and the Response tab shows its Result line. The log errors tied to these requests appear in the {yellow|warnings} panel when GetRepairOrder is selected.",
      },
    ],
  },
  {
    version: 'v1.5',
    entries: [
      {
        fr: "Ajout d'un bandeau de {yellow|warnings} (en {yellow|jaune}, distinct du bandeau des requêtes en échec) : il liste les warnings non bloquants des réponses {blue|SetRepairOrder}, par exemple {yellow|[99] Vehicle without paint ingredient}, ainsi que les erreurs du log liées aux requêtes analysées.",
        en: "Added a {yellow|warnings} panel (in {yellow|yellow}, distinct from the failed requests panel): it lists the non-blocking warnings of {blue|SetRepairOrder} responses, such as {yellow|[99] Vehicle without paint ingredient}, along with the log errors tied to the analyzed requests.",
      },
      {
        fr: "Quand une réponse {blue|SetRepairOrder} indique seulement {red|Operation failed}, la vraie erreur trouvée dans le log de la requête (par exemple une erreur SQL) s'affiche dans l'onglet Response et dans le bandeau des requêtes en échec.",
        en: "When a {blue|SetRepairOrder} response only says {red|Operation failed}, the real error found in the request's log (for example a SQL error) is shown in the Response tab and in the failed requests panel.",
      },
      {
        fr: "Le bandeau des requêtes en échec est séparé en deux sous-sections : {red|Technical error} (réponse {red|Operation failed}, avec l'erreur trouvée dans le log) et {violet|Rejected by DMS} (warnings bloquants de la réponse, par exemple {violet|[100000] Repair Order locked by other user}).",
        en: "The failed requests panel is split into two sub-sections: {red|Technical error} ({red|Operation failed} response, with the error found in the log) and {violet|Rejected by DMS} (blocking warnings of the response, such as {violet|[100000] Repair Order locked by other user}).",
      },
    ],
  },
  {
    version: 'v1.4',
    entries: [
      {
        fr: "Ajout d'une {blue|flèche} en bas à droite des résultats pour remonter en haut du panneau en un clic.",
        en: "Added an {blue|arrow} at the bottom right of the results panel to scroll back to the top in one click.",
      },
    ],
  },
  {
    version: 'v1.3',
    entries: [
      {
        fr: "Ajout d'un {blue|menu de navigation latéral} dans les résultats — liste les jobs et leurs packs, cliquer sur un élément fait défiler jusqu'à lui dans le JSON.",
        en: "Added a {blue|side navigation menu} in the results panel — lists jobs and their packs, clicking an item scrolls to it in the JSON.",
      },
      {
        fr: "Ajout des types de requêtes {blue|SetClients} et {blue|SetEvents}, chacun avec ses propres critères de recherche et son {red|bandeau d'erreurs} dédié.",
        en: "Added {blue|SetClients} and {blue|SetEvents} query types, each with their own search criteria and dedicated {red|error panel}.",
      },
      {
        fr: "Suppression du toggle {red|Show failed requests detected} remplacé par le bouton {red|Show/Hide} intégré au {red|bandeau d'erreurs}.",
        en: "Removed the {red|Show failed requests detected} toggle, replaced by the {red|Show/Hide} button built into the {red|error panel}.",
      },
    ],
  },
  {
    version: 'v1.2',
    entries: [
      {
        fr: "Deux nouvelles options dans le menu {blue|Search by} : afficher une {blue|requête aléatoire}, ou rechercher par numéro interne du client ({blue|Codigo Cliente}).",
        en: "Two new options in the {blue|Search by} menu: display a {blue|random request}, or search by internal client number ({blue|Codigo Cliente}).",
      },
    ],
  },
  {
    version: 'v1.1',
    entries: [
      {
        fr: "Ajout d'une fonctionnalité qui permet de consulter la {blue|version de la DMS Gateway} d'un client par le {blue|SubscriberID}.",
        en: "Added a feature to look up a client's {blue|DMS Gateway version} using their {blue|SubscriberID}.",
      },
    ],
  },
  {
    version: 'v1.0',
    entries: [
      {
        fr: 'Bienvenue dans {blue|Gateway Chaos Helper (GCH)} !',
        en: 'Welcome to {blue|Gateway Chaos Helper (GCH)} !',
      },
    ],
  },
]

// "{red|Operation failed}" renders the text in the color the app uses for it
// (red: errors, violet: rejected by DMS, yellow: warnings, blue: search, navigation and query types)
function renderColored(text) {
  return text.split(/(\{(?:red|violet|yellow|blue)\|[^}]+\})/).map((part, i) => {
    const match = part.match(/^\{(red|violet|yellow|blue)\|([^}]+)\}$/)
    return match ? <span key={i} className={`patchnote-color-${match[1]}`}>{match[2]}</span> : part
  })
}

export default function PatchNoteModal({ onClose }) {
  const [lang, setLang] = useState('en')

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup popup-patchnote" onClick={(e) => e.stopPropagation()}>
        <div className="popup-patchnote-header">
          <span className="popup-patchnote-title">Read me</span>
          <div className="patchnote-lang-toggle">
            <button className={`toggle-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>English</button>
            <button className={`toggle-btn ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLang('fr')}>Français</button>
          </div>
          <button className="error-detail-close" onClick={onClose}>✕</button>
        </div>
        <div className="popup-patchnote-body">
          <div className="patchnote-intro">
            {INTRO[lang].split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          {NOTES.map((note) => (
            <div key={note.version} className="patchnote-block">
              <div className="patchnote-version">{note.version}</div>
              {note.entries.map((entry, i) => (
                <div key={i} className="patchnote-entry">
                  <span>{renderColored(entry[lang])}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
