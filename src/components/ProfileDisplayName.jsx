import ProfileUsernameForm from './ProfileUsernameForm'
import './ProfileDisplayName.css'

export default function ProfileDisplayName({ onUpdated }) {
  return (
    <section className="profile-display-name" aria-labelledby="profile-display-name-title">
      <ProfileUsernameForm onUpdated={onUpdated} showTitle showCurrent />
    </section>
  )
}
