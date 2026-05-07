import { useState } from 'react'

const INTRO = {
  fr: "Bienvenue !\n\nCe programme, créé par le support DMS France, a pour vocation de faciliter la lecture des logs de la DMS Gateway, de formater des requêtes JSON brutes dans un format agréable à lire, ou encore de consulter la version de la DMS Gateway installée chez les clients.\n\n🔒 Confidentialité : aucune information n'est stockée. Les fichiers importés sont chargés dans le navigateur uniquement le temps de la lecture — rien n'est conservé, envoyé ou partagé.\n\nN'hésitez pas à signaler un bug ou à suggérer une amélioration : antoine.lancelot@nextlane.com\n\nMerci !",
  en: "Welcome!\n\nThis program, created by the DMS France support team, is designed to facilitate the reading of DMS Gateway logs, format raw JSON requests into a easy-to-read format, and check the version of the DMS Gateway installed at client sites.\n\n🔒 Privacy: no information is stored. Imported files are loaded in the browser only for the duration of the session — nothing is retained, sent, or shared.\n\nFeel free to report a bug or suggest an improvement: antoine.lancelot@nextlane.com\n\nThank you!",
}

const NOTES = [
  {
    version: 'v1.3',
    entries: [
      {
        fr: "Ajout d'un menu de navigation latéral dans les résultats — liste les jobs et leurs packs, cliquer sur un élément fait défiler jusqu'à lui dans le JSON.",
        en: "Added a side navigation menu in the results panel — lists jobs and their packs, clicking an item scrolls to it in the JSON.",
      },
    ],
  },
  {
    version: 'v1.2',
    entries: [
      {
        fr: "Deux nouvelles options dans le menu \"Search by\" : afficher une requête aléatoire, ou rechercher par numéro interne du client (Codigo Cliente).",
        en: "Two new options in the \"Search by\" menu: display a random request, or search by internal client number (Codigo Cliente).",
      },
    ],
  },
  {
    version: 'v1.1',
    entries: [
      {
        fr: "Ajout d'une fonctionnalité qui permet de consulter la version de la DMS Gateway d'un client par le SubscriberID.",
        en: "Added a feature to look up a client's DMS Gateway version using their SubscriberID.",
      },
    ],
  },
  {
    version: 'v1.0',
    entries: [
      {
        fr: 'Bienvenue dans Gateway Chaos Helper (GCH) !',
        en: 'Welcome to Gateway Chaos Helper (GCH) !',
      },
    ],
  },
]

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
                  <span>{entry[lang]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
