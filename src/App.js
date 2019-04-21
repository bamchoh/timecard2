import moment from "moment";

import React, { Component } from 'react';
// import logo from './logo.svg';
import './App.css';
import firebase from "firebase";
import "firebase/firestore";

var config = {
  apiKey: "AIzaSyBN0uExYyx8PlWI5wDZq6DA5wJdwP-RhhQ",
  authDomain: "timecard-76a8f.firebaseapp.com",
  // databaseURL: "https://timecard-76a8f.firebaseio.com",
  projectId: "timecard-76a8f",
  // storageBucket: "timecard-76a8f.appspot.com",
  messagingSenderId: "1023634309611"
};
firebase.initializeApp(config);

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      init: null,
      work_idx: 0,
      user: null,
      email: "",
      pass: "",
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
              console.log(doc.data());
              return doc.data();
            });
            console.log(works);
              // console.log(moment.unix(data.date).format("YYYY-MM-DD HH:mm:ss"));
              // console.log(this.work_states[data.work_idx]);
            this.setState({works: works});
          });
          this.setState({init:true, user: user});
        }
      } else {
        console.log("no user");
        this.setState({init:true, user: null});
      }
    });
  }

  change_work_state(idx) {
    var db = firebase.firestore();
    var user = this.state.user;

    db.collection("users").doc(user.uid).collection("works").add({
      work_idx: idx,
      date: moment().unix(),
    })
    .then((docRef) => {
      console.log("db document writtern with id: ", docRef);
    })
    .catch((error) => {
      console.error("db error adding document: ", error);
    });

    if(idx === 0) {
      this.setState({work_idx: 1})
    } else {
      this.setState({work_idx: 0})
    }
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
    firebase.auth().signInWithEmailAndPassword(email, pass).catch(function(error) {
      console.log("signInWithEmailAndPassword error");
      console.log(error);
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
      console.log(this.state.works);

      var worklist = () => {
        return this.state.works.map((elem) => (
          <li>
            {this.work_states[elem.work_idx]}
             / 
            {moment.unix(elem.date).format("YYYY-MM-DD HH:mm:ss")}
          </li>
        ))
      }

      return (
        <div className="App">
        <header className="App-header">
          <button className={btnClassName} onClick={() => this.change_work_state(this.state.work_idx)}>
          {this.work_states[this.state.work_idx]}
          </button>

          <ul>{worklist()}</ul>

          <button className={btnClassName} onClick={() => this.signOut()} >
          Sign-Out
          </button>
        </header>
        </div>
      )
    }

    return (
      <div className="App">
      <header className="App-header">
      <input type="text" value={this.state.email} onChange={(e) => this.changeEmailText(e)} />
      <input type="text" value={this.state.pass} onChange={(e) => this.changePassText(e)} />
      <button className={btnClassName} onClick={() => this.signIn()} >
      Sign-In
      </button>
      </header>
      </div>
    );
  }
}

export default App;
