import { useEffect, useState } from 'react'
import { useLanguage } from '../../i18n/useLanguage'
import { fetchBestChallengePhotos } from '../../services/dailyChallengeService'
import './DailyChallenge.css'

export default function BestChallengePhotos() {
  const { t } = useLanguage()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchBestChallengePhotos(8)
        if (!cancelled) setPhotos(data)
      } catch (error) {
        console.error('[BestChallengePhotos] load failed:', error)
        if (!cancelled) setPhotos([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="challenge-best-photos" aria-labelledby="challenge-best-photos-title">
      <h3 id="challenge-best-photos-title" className="challenge-section-title">
        {t('challengeBestPhotosTitle')}
      </h3>

      {loading && <p className="challenge-muted">{t('challengeLoading')}</p>}

      {!loading && photos.length === 0 && (
        <p className="challenge-muted">{t('challengeBestPhotosEmpty')}</p>
      )}

      {!loading && photos.length > 0 && (
        <div className="challenge-best-photos__grid">
          {photos.map((item) => (
            <article key={item.id} className="challenge-best-photos__card">
              <img src={item.photoUrl} alt="" className="challenge-best-photos__image" loading="lazy" />
              <div className="challenge-best-photos__meta">
                <strong>{item.dishName}</strong>
                <span>{t('communityAuthor', { name: item.authorName })}</span>
                <span>{item.challengeDate}</span>
                <span>❤️ {item.likeCount ?? 0}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
