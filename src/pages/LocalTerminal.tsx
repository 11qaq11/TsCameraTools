import XtermTerminal from '../components/terminal/XtermTerminal'
import { useNavigate } from 'react-router-dom'

export default function LocalTerminal() {
  const navigate = useNavigate()

  return (
    <XtermTerminal
      type="local"
      onClose={() => navigate('/')}
    />
  )
}
