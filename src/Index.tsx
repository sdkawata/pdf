import {hot} from 'react-hot-loader'
import React from 'react'
import ReactDOM from 'react-dom'

const Index: React.FC = () => {
  return <div>Hello!</div>
}

const Hot = hot(module)(Index)

ReactDOM.render(<Hot/>, document.getElementById('app'))
