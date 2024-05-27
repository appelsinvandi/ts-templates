import { Component } from 'solid-js'

import styles from './App.module.scss'

export type AppProps = {}
export const App: Component<AppProps> = () => {
  return <div class={styles.root}>Some cool SolidJS project</div>
}
