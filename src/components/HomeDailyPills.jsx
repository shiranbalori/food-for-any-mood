import DailyChallengeTrigger from './dailyChallenge/DailyChallengeTrigger'
import DailyQuizTrigger from './dailyQuiz/DailyQuizTrigger'
import './dailyQuiz/DailyQuiz.css'

/**
 * @param {{ onOpenChallenge: () => void, onOpenQuiz: () => void }} props
 */
export default function HomeDailyPills({ onOpenChallenge, onOpenQuiz }) {
  return (
    <div className="home-pills">
      <DailyChallengeTrigger onClick={onOpenChallenge} />
      <DailyQuizTrigger onClick={onOpenQuiz} />
    </div>
  )
}
