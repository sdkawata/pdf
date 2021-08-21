import {hot} from 'react-hot-loader'
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { RecoilRoot } from 'recoil'

const Index: React.FC = () => {
  return <RecoilRoot><App/></RecoilRoot>
}

const Hot = hot(module)(Index)

ReactDOM.render(<Hot/>, document.getElementById('app'))
