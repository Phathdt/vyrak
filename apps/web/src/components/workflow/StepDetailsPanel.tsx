import { StepRunResponseDto } from '../../api/generated/models'

interface StepDetailsProps {
  step: StepRunResponseDto
  onClose: () => void
}

export function StepDetailsPanel({ step, onClose }: StepDetailsProps) {
  const calculateDuration = () => {
    if (!step.startedAt) return null
    const start = new Date(step.startedAt).getTime()
    const end = step.completedAt ? new Date(step.completedAt).getTime() : Date.now()
    return end - start
  }

  const duration = calculateDuration()

  return (
    <div className='step-details-panel'>
      <div className='panel-header'>
        <h2>Step Details</h2>
        <button onClick={onClose} className='close-button'>
          ✕
        </button>
      </div>

      <div className='panel-content'>
        <section className='details-section'>
          <h3>Information</h3>
          <div className='info-grid'>
            <div className='info-item'>
              <label>Step Key</label>
              <span>{step.stepKey}</span>
            </div>
            <div className='info-item'>
              <label>Status</label>
              <span>{step.status}</span>
            </div>
            <div className='info-item'>
              <label>Attempt</label>
              <span>{step.attempt + 1}</span>
            </div>
            {duration !== null && (
              <div className='info-item'>
                <label>Duration</label>
                <span>{duration}ms</span>
              </div>
            )}
            {step.outputArtifactId && (
              <div className='info-item'>
                <label>Output Artifact ID</label>
                <span>{step.outputArtifactId}</span>
              </div>
            )}
          </div>
        </section>

        {step.errorMessage && (
          <section className='details-section'>
            <h3>Error</h3>
            <div className='error-message'>{step.errorMessage}</div>
          </section>
        )}
      </div>
    </div>
  )
}
