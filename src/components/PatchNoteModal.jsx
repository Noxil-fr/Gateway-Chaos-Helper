import { useState } from 'react'

const INTRO = {
  fr: "Bienvenue !\n\nCe programme, créé par le support DMS France, a pour vocation de faciliter la lecture des logs de la DMS Gateway, de formater des requêtes JSON brutes dans un format agréable à lire, ou encore de consulter la version de la DMS Gateway installée chez les clients.\n\nN'hésitez pas à signaler un bug ou à suggérer une amélioration : antoine.lancelot@nextlane.com\n\nMerci !",
  en: "Welcome!\n\nThis program, created by the DMS France support team, is designed to facilitate the reading of DMS Gateway logs, format raw JSON requests into a easy-to-read format, and check the version of the DMS Gateway installed at client sites.\n\nFeel free to report a bug or suggest an improvement: antoine.lancelot@nextlane.com\n\nThank you!",
}

const NOTES = [
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
          <span className="popup-patchnote-title">About</span>
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
