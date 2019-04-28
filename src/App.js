import moment from "moment";

import React, { Component, useState} from 'react';
import logo_png from './logo.png';

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
      user: null,
    };

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
          this.setState({init:true, user: user});
        }
      } else {
        console.log("no user");
        this.setState({init:true, user: null});
      }
    });

  }

  signIn = (e) => {
    this.setState({init: null});
  }

  signUp = (e) => {
  }

  signOut = () => {
    firebase.auth().signOut().then(function() {
      console.log("succeeded sign-out");
    }).catch(function(error) {
      console.log("signOut error");
      console.log(error);
    });
  }

  render() {
    if(this.state.init == null) {
      return(<LoadingPage />)
    }

    if(this.state.user) {
      return(<TimeCardPage
        user={this.state.user}
        handleSignOut={this.signOut}
        />)
    }

    return (
      <LoginDialog
        handleLogIn={this.signIn}
        handleSignUp={this.signUp} />
    );
  }
}

class TimeCardPage extends Component {
  state = {
    edit: false,
    work_idx: 0,
  }

  work_states = ["出社", "退社"];

  editTime = () => {
    this.setState({edit: true});
  }

  doneEdit = () => {
    this.setState({edit: false});
  }

  cancelEdit = () => {
    this.setState({edit: false});
  }

  setWorkIdx = (idx) => {
    this.setState({work_idx: idx});
  }

  render() {
    return (
      <div className="Body">
      <header className="App-header">
        <div className="App-Main-Container">
          <StampButton idx={this.state.work_idx}
           work_states={this.work_states}
           handleClick={() => this.change_work_state(this.state.work_idx)}
           user={this.props.user} />

          <WorkStamps edit={this.state.edit}
           user={this.props.user}
           setWorkIdx={this.setWorkIdx}
           work_states={this.work_states} />
        </div>
      </header>
      <Footer
        onClick={this.props.handleSignOut}
        onEdit={this.editTime}
        onDone={this.doneEdit}
        onCancel={this.cancelEdit}
        edit={this.state.edit} />
      </div>
    )
  }
}

class StampButton extends Component {
  state = {
    timer: null,
  }

  constructor(props) {
    super(props)

    setInterval(this.update, 1000);
  }

  update = () => {
    this.setState({timer: moment().valueOf()})
  }

  stamp = () => {
    var db = firebase.firestore();
    var user = this.props.user;

    db.collection("users").doc(user.uid).collection("works").add({
      work_idx: this.props.idx,
      date: moment().valueOf(),
    })
    .then((docRef) => {
      // console.log("db document writtern with id: ", docRef);
    })
    .catch((error) => {
      console.error("db error adding document: ", error);
    });
  }

  render() {
    var {timer, idx, work_states} = this.props;
    if(timer === null) {
      return(<></>)
    }

    var btn_classes = ["App-shusha", "App-taisha"];
    var btnClassName = btn_classes[idx]
    return(
      <button className={btnClassName} onClick={this.stamp}>
        {work_states[idx]}
        <div className="App-time">{moment(timer).format("HH:mm:ss")}</div>
        <div className="App-date">{moment(timer).format("YYYY/MM/DD ddd")}</div>
      </button>
    )
  }
}

class WorkStamps extends Component {
  state = {
    works: [],
  }

  constructor(props) {
    super(props);

    var db = firebase.firestore();
    var user = this.props.user;
    db.collection("users").doc(user.uid).collection("works").orderBy("date", "desc").limit(10).onSnapshot((col) => {
      var idx = 0;
      var prev = null;
      var temp = [];
      col.docs.reverse().forEach((doc) => {
        var data = doc.data();
        if(data.work_idx === 1) {
          var work = {start: { ...prev }, end: { ...data }};
          prev = null;
          temp.push(work);
        } else {
          prev = { ...data };
        }
      });

      if(prev!==null) {
        idx = 1;
        temp.push({start: prev, end: null})
      } else {
        idx = 0;
      }

      this.setState({works: temp});
      this.props.setWorkIdx(idx);
    });
  }

  render() {
    var {edit, work_states} = this.props;
    if(this.state.works === null || this.state.works.length === 0) {
      return(<>Loading...</>)
    }

    return(<div className="App-ul">
      {this.state.works.map((elem) => {
        return(<div className="App-Couple">
          <WorkTime clsName={"App-li-shusha"} idx={0} elem={elem} edit={edit} work_states={work_states} />
          <WorkTime clsName={"App-li-taisha"} idx={1} elem={elem} edit={edit} work_states={work_states} />
        </div>)
      })}
    </div>)
  }
}

const Time = ({elem, edit}) => {
  if(edit) {
    return(<>
      <input className="App-datetime" type="datetime-local" value={moment(elem.date).format("YYYY-MM-DDTHH:mm")} />
    </>)
  } else {
    return(<>
    <div className="App-time">{moment(elem.date).format("HH:mm")}</div>
    <div className="App-date">{moment(elem.date).format("YYYY/MM/DD ddd")}</div>
    </>)
  }
}

const WorkTime = ({clsName, idx, elem, edit, work_states}) => {
  if(elem === undefined || elem === null) {
    return(<></>)
  }

  var info = null
  if(idx === 0) {
    if(elem.start === undefined || elem.start === null) {
      return(<div className="App-li-empty">未出社</div>)
    } else {
      info = elem.start;
    }
  } else {
    if(elem.end === undefined || elem.end === null) {
      return(<div className="App-li-empty">未退社</div>)
    } else {
      info = elem.end;
    }
  }

  return(
    <div className={clsName}>
      <span className="App-TextLight">{work_states[idx]}</span>
      <Time elem={info} edit={edit}/>
    </div>
  )
}

const LoadingPage = (props) => {
  return (
    <div className="Body">
    <header className="App-header">
      Loading...
    </header>
    </div>
  )
}

const LoginDialog = ({
  handleError,
  handleLogIn,
  handleSignUp
}) => {
  const [email, setEmail] = useState("");
  const [pass, setPassword] = useState("");
  const [errMsg, setError] = useState(null);
  const [proceeding, setProceeding] = useState(false);

  const changeEmailText = (e) => {
    setEmail(e.target.value);
  }

  const changePassText = (e) => {
    setPassword(e.target.value);
  }

  const logIn = (e) => {
    firebase.auth().signInWithEmailAndPassword(email, pass).catch((error) => {
      console.log("signInWithEmailAndPassword error");
      setError(error);
      setProceeding(false);
    });
    setProceeding(true);
  }

  if(proceeding) {
    return(<LoadingPage />)
  }

  return(
    <div className="App">
    <header className="App-header">
    <div className="App-SignIn-Container">
      <img className="App-Logo" src={logo_png} alt="logo" />
      <Error error={errMsg} />
      <EmailTextBox value={email} handleChange={changeEmailText} />
      <PassTextBox value={pass} handleChange={changePassText} />
      <div>
        <LogInButton text="Log-In" handleClick={logIn} />
        <SignUpButton text="Sign-Up" handleClick={handleSignUp} />
      </div>
    </div>
    </header>
    </div>
  )
}

const EmailTextBox = ({text, handleChange}) => {
  return(
    <input className="App-textbox" type="email" placeholder="E-mail"
     value={text}
     onChange={e => handleChange(e)} />
  )
}

const PassTextBox = ({text, handleChange}) => {
  return(
    <input className="App-textbox" type="password" placeholder="Password"
     value={text}
     onChange={e => handleChange(e)} />
  )
}

const LogInButton = ({text, handleClick}) => {
  return(
    <input className="App-signinButton" type="button"
     value={text}
     onClick={e => handleClick(e)} />
  )
}

const SignUpButton = ({text, handleClick}) => {
  return(
    <input className="App-signupButton" type="button" value={text} onClick={e => handleClick(e)} />
  )
}

const FooterButton = ({text, handleClick}) => {
  return(
    <input className="App-footerButton" type="button" value={text} onClick={e => handleClick(e)} />
  )
}

const EditButtonGroup = ({handleOnDone, handleOnCancel, handleOnEdit, edit}) => {
  return(<>
    <Visibility condition={true} value={edit}>
      <FooterButton text="Done" handleClick={handleOnDone} />
      <FooterButton text="Cancel" handleClick={handleOnCancel} />
    </Visibility>
    <Visibility condition={false} value={edit}>
      <FooterButton text="Edit" handleClick={handleOnEdit} />
    </Visibility>
  </>)
}

const Visibility = ({condition, value, children}) => {
  if(condition !== value) {
    return(<></>)
  }

  return(<>{children}</>)
}

const Footer = ({onClick, onEdit, onDone, onCancel, edit}) => {
  return (
    <>
      <footer className="App-footer" >
        <FooterButton text="Log-Out" handleClick={onClick} />
        <EditButtonGroup
          handleOnDone={onDone}
          handleOnCancel={onCancel}
          handleOnEdit={onEdit}
          edit={edit} />
      </footer>
      <div className="App-spacer-for-footer">
      </div>
    </>
  );
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
