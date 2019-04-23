import moment from "moment";

import React, { Component } from 'react';
// import logo from './logo.svg';
import './App.css';
import firebase from "firebase";
import "firebase/firestore";

var config = {
  apiKey: "AIzaSyBN0uExYyx8PlWI5wDZq6DA5wJdwP-RhhQ",
  authDomain: "timecard-76a8f.firebaseapp.com",
  projectId: "timecard-76a8f",
  messagingSenderId: "1023634309611"
};
firebase.initializeApp(config);

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      init: null,
      timer: null,
      work_idx: 0,
      user: null,
      email: "",
      pass: "",
      error: null,
      works: [],
    };

    this.work_states = ["出社", "退社"];
    this.btn_classes = ["App-shusha", "App-taisha"];

    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        if(!user.emailVerified) {
          user.sendEmailVerification().then(function() {
            console.log("email sent");
          }).catch(function(error) {
            console.log("sendEmailVerification error");
            console.log(error);
          });
        } else {
          console.log("alraday verified email");
          var db = firebase.firestore();
          db.collection("users").doc(user.uid).collection("works").orderBy("date", "desc").onSnapshot((col) => {
            var works = col.docs.map((doc) => {
              return doc.data();
            });
            var idx = 0;
            if(works !== null && works.length !== 0) {
              idx = (works[0].work_idx + 1) % 2;
            }
            this.setState({works: works, work_idx: idx});
          });
          this.setState({init:true, user: user});
        }
      } else {
        console.log("no user");
        this.setState({init:true, user: null});
      }
    });

    this.intervalTimer = setInterval(() => this.update(), 1000);
  }

  update() {
    this.setState({
      timer: moment().valueOf(),
    });
  }

  change_work_state(idx) {
    var db = firebase.firestore();
    var user = this.state.user;

    db.collection("users").doc(user.uid).collection("works").add({
      work_idx: idx,
      date: moment().valueOf(),
    })
    .then((docRef) => {
      console.log("db document writtern with id: ", docRef);
    })
    .catch((error) => {
      console.error("db error adding document: ", error);
    });
  }

  changeEmailText(e) {
    this.setState({email: e.target.value});
  }

  changePassText(e) {
    this.setState({pass: e.target.value});
  }

  signIn() {
    this.setState({init: null});
    var email = this.state.email;
    var pass = this.state.pass;
    firebase.auth().signInWithEmailAndPassword(email, pass).catch((error) => {
      console.log("signInWithEmailAndPassword error");
      this.setState({init: true, error: error});
    });
  }

  signOut() {
    firebase.auth().signOut().then(function() {
      console.log("succeeded sign-out");
    }).catch(function(error) {
      console.log("signOut error");
      console.log(error);
    });
  }

  render() {
    var btnClassName = this.btn_classes[this.state.work_idx]
    if(this.state.init == null) {
      return (
        <div className="App">
        <header className="App-header">
          Loading...
        </header>
        </div>
      )
    }

    if(this.state.user) {
      var worklist = () => {
        if(this.state.works !== null && this.state.works.length !== 0) {
          var clsLiNames = ["App-li-shusha", "App-li-taisha"];
          var clsSpanNames = ["App-span-shusha", "App-span-taisha"];
          return(<ul className="App-ul">
            {this.state.works.map((elem) => (
              <li className={clsLiNames[elem.work_idx]}>
                <span className={clsSpanNames[elem.work_idx]}>{this.work_states[elem.work_idx]}</span>
                <div className="App-time">{moment(elem.date).format("HH:mm:ss")}</div>
                <div className="App-date">{moment(elem.date).format("YYYY/MM/DD ddd")}</div>
              </li>
            ))}
          </ul>)
        } else {
          return(<>Loading...</>)
        }
      }

      var buttonContent = () => {
        if(this.state.timer !== null) {
          return(
            <button className={btnClassName} onClick={() => this.change_work_state(this.state.work_idx)}>
              {this.work_states[this.state.work_idx]}
              <div className="App-time">{moment(this.state.timer).format("HH:mm:ss")}</div>
              <div className="App-date">{moment(this.state.timer).format("YYYY/MM/DD ddd")}</div>
            </button>
          )
        }
      }

      return (
        <div className="App">
        <header className="App-header">
          {buttonContent()}

          {worklist()}

          <button className="App-defaultButton"  onClick={() => this.signOut()} >
          Sign-Out
          </button>
        </header>
        </div>
      )
    }

    return (
      <div className="App">
      <header className="App-header">
      <Error error={this.state.error} />
      <input className="App-textbox" placeholder="E-mail" type="email" 
       value={this.state.email} onChange={(e) => this.changeEmailText(e)} />
      <input className="App-textbox" type="password" placeholder="Password"
       value={this.state.pass} onChange={(e) => this.changePassText(e)} />
      <button className="App-signinButton" onClick={() => this.signIn()} >
      Sign-In
      </button>
      </header>
      </div>
    );
  }
}

const Error = ({error}) => {
  if(error !== null && error !== undefined) {
    return (
      <div className="App-error">
        {error.message}
      </div>
    )
  } else {
    return (
      <></>
    )
  }
}

export default App;
