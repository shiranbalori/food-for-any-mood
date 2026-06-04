import { useLanguage } from '../i18n/useLanguage'
import './OurStory.css'

const STORY_PARAGRAPH_KEYS = [
  'ourStoryP1',
  'ourStoryP2',
  'ourStoryP3',
  'ourStoryP4',
  'ourStoryP5',
  'ourStoryP6',
]

export default function OurStory() {
  const { t } = useLanguage()

  return (
    <section className="our-story" aria-labelledby="our-story-title">
      <h2 id="our-story-title" className="our-story__section-title section-title">
        {t('ourStoryTitle')}
      </h2>

      <article className="our-story__card">
        <div className="our-story__hero" aria-hidden="true">
          <span className="our-story__hero-glow" />
          <span className="our-story__hero-icon">🍳</span>
          <span className="our-story__hero-orbit our-story__hero-orbit--a">🥗</span>
          <span className="our-story__hero-orbit our-story__hero-orbit--b">🍰</span>
          <span className="our-story__hero-orbit our-story__hero-orbit--c">✨</span>
        </div>

        <header className="our-story__brand">
          <p className="our-story__app-name">FOOD FOR ANY MOOD</p>
          <p className="our-story__byline">{t('ourStoryByline')}</p>
          <p className="our-story__author">Shiran Balori</p>
        </header>

        <div className="our-story__body">
          {STORY_PARAGRAPH_KEYS.map((key) => {
            const text = t(key)
            if (!text?.trim()) return null
            return (
              <p key={key} className="our-story__paragraph">
                {text}
              </p>
            )
          })}
        </div>

        <footer className="our-story__footer">
          <p className="our-story__toast">{t('ourStoryToast')}</p>
          <p className="our-story__credit">{t('ourStoryCredit')}</p>
        </footer>
      </article>
    </section>
  )
}
