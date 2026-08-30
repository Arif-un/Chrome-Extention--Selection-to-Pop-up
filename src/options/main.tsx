import { render } from 'preact'
import '../styles/app.css'
import { applyTheme, getTheme } from '../lib/theme'
import { Options } from './Options'

applyTheme(getTheme())
render(<Options />, document.getElementById('app')!)
