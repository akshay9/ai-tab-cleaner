import * as React from "react"
import * as ReactDOM from "react-dom"

import App from "./App"

import "../styles/popup.css"
import 'bootstrap/dist/css/bootstrap.min.css';

class Hello extends React.Component {
    render() {
        return (
            <div className="popup-padded">
                <h1>{ chrome.i18n.getMessage("l10nHello") }</h1>
            </div>
        )
    }
}

// --------------

ReactDOM.render(
    <App />,
    document.getElementById('root')
)