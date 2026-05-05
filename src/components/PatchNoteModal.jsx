import { useState } from 'react'

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
          <span className="popup-patchnote-title">Patch notes</span>
          <div className="patchnote-lang-toggle">
            <button className={`toggle-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>English</button>
            <button className={`toggle-btn ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLang('fr')}>Français</button>
          </div>
          <button className="error-detail-close" onClick={onClose}>✕</button>
        </div>
        <div className="popup-patchnote-body">
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
