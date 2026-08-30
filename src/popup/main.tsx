import { render } from 'preact'
import '../styles/app.css'
import { applyTheme, getTheme } from '../lib/theme'
import { Popup } from './Popup'

applyTheme(getTheme())
render(<Popup />, document.getElementById('app')!)
