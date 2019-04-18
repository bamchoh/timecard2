import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      work_idx: 0,
    };

    this.work_states = ["出社", "退社"];
    this.btn_classes = ["App-shusha", "App-taisha"];
  }

  change_work_state(idx) {
    if(idx === 0) {
      this.setState({work_idx: 1})
    } else {
      this.setState({work_idx: 0})
    }
  }

  render() {
    var btnClassName = this.btn_classes[this.state.work_idx]
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <button className={btnClassName} onClick={() => this.change_work_state(this.state.work_idx)}>
            {this.work_states[this.state.work_idx]}
          </button>
        </header>
      </div>
    );
  }
}

export default App;
