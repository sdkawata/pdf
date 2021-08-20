import {hot} from 'react-hot-loader'
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

const Index: React.FC = () => {
  return <App/>
}

const Hot = hot(module)(Index)

ReactDOM.render(<Hot/>, document.getElementById('app'))
