import moment from "moment";

import React, { Component, useState} from 'react';
import logo_png from './logo.png';
import btn_google_signin from './btn_google_signin_dark_normal_web.png';
import btn_google_focus from './btn_google_signin_dark_focus_web.png';
import btn_google_pressed from './btn_google_signin_dark_pressed_web.png';

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
      page: "init",
      user: null,
    };

    firebase.auth().onAuthStateChanged((user) => {
      if(this.state.page === "signout") {
        return
      }

      console.log(user);
      if (user) {
        if(!user.emailVerified) {
          console.log("email is not verified yet");
          if(this.state.page === "signup") {
            this.sendEmailVerification(user)
          }
          this.setState({page: "verification", user: user})
        } else {
          if(!user.displayName) {
            this.setState({page:"first_login", user: user})
          } else {
            this.setState({page:"timecard", user: user});
          }
        }
      } else {
        console.log("no user");
        this.setState({page:"login", user: null});
      }
    });

  }

  sendEmailVerification = (user) => {
    user.sendEmailVerification().then(() => {
      console.log("email sent");
    }).catch(function(error) {
      console.log("sendEmailVerification error");
      console.log(error);
    });
  }

  signIn = (e) => {
  }

  signUp = (e) => {
    this.setState({page:"signup"})
  }

  signOut = () => {
    this.setState({page:"signout"})
    firebase.auth().signOut().then(function() {
      console.log("succeeded sign-out");
    }).catch(function(error) {
      console.log("signOut error");
      console.log(error);
    });
    this.reloadPage()
  }

  reloadPage = () => {
    window.location.reload();
  }

  render() {
    switch(this.state.page) {
      case "first_login":
        return(<FirstLoginPage user={this.state.user} changePage={this.reloadPage} />)
      case "timecard":
        return(<TimeCardPage user={this.state.user} handleSignOut={this.signOut} />)
      case "login":
        return(<LoginDialog handleLogIn={this.signIn} handleSignUp={this.signUp} />)
      case "signup":
        return(<SignupPage />)
      case "verification":
        return(<VerificationPage user={this.state.user} changePage={this.reloadPage} handleResend={this.sendEmailVerification} />)
      default:
        return(<LoadingPage />)
    }
  }
}

class FirstLoginPage extends Component {
  state = {
    errMsg: null,
    name: "",
  }

  changeName = (e) => {
    this.setState({name: e.target.value});
  }

  updateProfile = (user) => {
    user.updateProfile({
      displayName: this.state.name,
    }).then(() => {
      this.props.changePage();
    }, (error) => {
      this.setState({errMsg: error})
    });
  }

  render() {
    return(
      <div className="App">
      <div className="App-Header">
      <div className="App-SignIn-Container">
        <div className="App-Title">
          ユーザープロフィール
        </div>
        <Error error={this.state.errMsg} />
        <TextBox text={this.state.name} handleChange={this.changeName} placeholder="名前" />
        <LogInButton text="プロフィール更新" handleClick={(e) => this.updateProfile(this.props.user)} />
      </div>
      </div>
      </div>
    )
  }
}

class VerificationPage extends Component {
  timer = null;

  constructor(props) {
    super(props)

    console.log("constructor");
    console.log(this.props.user);
    if(this.props.user !== null) {
      console.log("setInterval");
      this.timer = setInterval(() => {
        this.checkVerification(this.props.user)
      }, 1000)
    }
  }

  componentWillUnmount() {
    if(this.timer !== null) {
      clearInterval(this.timer);
    }
  }

  checkVerification = (user) => {
    console.log("check");
    user.reload();
    if(user.emailVerified) {
      console.log("changePage");
      this.props.changePage()
    }
  }

  render() {
    return(
      <div className="App">
      <div className="App-Header">
      <div className="App-SignIn-Container">
      <div className="App-Title">
      ユーザー検証中
      </div>
      <div className="App-Description">
      {this.props.user.email} へメールを送信しました。メールのURLをクリックし本登録を完了してください。登録が完了すると、自動的にページが切り替わります。
      </div>
      <div className="App-Dialog-Footer">
      <LogInButton text="メール再送" handleClick={() => this.props.handleResend(this.props.user)} />
      </div>
      </div>
      </div>
      </div>
    )
  }
}

class TimeCardPage extends Component {
  state = {
    edit: false,
    work_idx: 0,
    works: [],
    modified: [],
  }

  constructor(props) {
    super(props);

    var db = firebase.firestore();
    var user = this.props.user;
    db.collection("users").doc(user.uid).collection("works").orderBy("date", "desc").onSnapshot((col) => {
      var idx = 0;
      var prev = null;
      var temp = [];
      col.docs.reverse().forEach((doc) => {
        var data = doc.data();
        if(data.work_idx === 1) {
          var work = {start: { ...prev }, end: { id: doc.id, ...data }};
          prev = null;
          temp.push(work);
        } else {
          prev = { id: doc.id, ...data };
        }
      });

      if(prev!==null) {
        idx = 1;
        temp.push({start: prev, end: null})
      } else {
        idx = 0;
      }

      console.log(temp);
      this.setState({works: temp, work_idx: idx});
    });
  }

  work_states = ["出社", "退社"];

  editTime = () => {
    var modified = this.state.works.slice()
    this.setState({edit: true, modified: modified});
  }

  doneEdit = () => {
    var modified = [];
    this.state.modified.forEach((elem, i) => {
      var original = this.state.works[i]
      if((original.start !== null && original.start.date !== elem.start.date) ||
        (original.end !== null && original.end.date !== elem.end.date)) {
        modified.push(elem);
      }
    })

    var db = firebase.firestore();
    var batch = db.batch();
    var user = this.props.user;

    modified.forEach((elem) => {
      var ref = null;
      if(elem.start !== null) {
        ref = db.collection("users").doc(user.uid).collection("works").doc(elem.start.id)
        batch.set(ref, {work_idx: elem.start.work_idx, date: elem.start.date})
      }

      if(elem.end !== null) {
        ref = db.collection("users").doc(user.uid).collection("works").doc(elem.end.id)
        batch.set(ref, {work_idx: elem.end.work_idx, date: elem.end.date})
      }
    });

    batch.commit().then(() => {
      console.log("committed");
    })

    this.setState({edit: false}); //, works: modified});
  }

  cancelEdit = () => {
    this.setState({edit: false});
  }

  newState = (ki, wi, newdate) => {
    if(isNaN(newdate)) {
      return;
    }

    var newWorks = this.state.modified.map((elem, i) => {
      if(ki === i) {
        if(wi === 0) {
          return {
            ...elem,
            start: {
              ...elem.start,
              date: newdate,
            },
          }
        }

        if(wi === 1) {
          return {
            ...elem,
            end: {
              ...elem.end,
              date: newdate,
            }
          }
        }
      }
      return {
        ...elem
      }
    })
    this.setState({modified: newWorks});
  }


  render() {
    return (
      <div className="Body">
      <header className="App-header">
      <div className="App-Main-Container">
      <StampButton idx={this.state.work_idx}
      work_states={this.work_states}
      handleClick={() => this.change_work_state(this.state.work_idx)}
      user={this.props.user}
      edit={this.state.edit} />

      <WorkStamps edit={this.state.edit}
      user={this.props.user}
      works={this.state.works}
      modified={this.state.modified}
      handleChange={(e, ki, wi) => {
        this.newState(ki, wi, moment(e.target.value).valueOf());
      }}
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

class WorkStamps extends Component {
  render() {
    var {edit, work_states, works, modified, handleChange} = this.props;
    if(works === null) {
      return(<div className="App-ul">Loading...</div>)
    }

    if(works.length === 0) {
      return(<div className="App-ul">出退勤情報は<br/>まだありません</div>)
    }

    var list = null;
    if(edit) {
      list = modified;
    } else {
      list = works;
    }

    return(<div className="App-ul">
      {list.map((elem, i) => {
        return(<div className="App-Couple" key={i}>
          <WorkTime clsName={"App-li-shusha"} idx={0} elem={elem} edit={edit} work_states={work_states}
          handleChange={(e) => handleChange(e, i, 0)}/>
          <WorkTime clsName={"App-li-taisha"} idx={1} elem={elem} edit={edit} work_states={work_states}
          handleChange={(e) => handleChange(e, i, 1)}/>
          </div>)
      })}
      </div>)
  }
}

class StampButton extends Component {
  state = {
    timer: null,
  }

  timer = null;

  constructor(props) {
    super(props)

    this.timer = setInterval(this.update, 1000);
  }

  componentWillUnmount() {
    if(this.timer !== null) {
      clearInterval(this.timer);
    }
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
    var {timer, idx, work_states, edit} = this.props;
    if(timer === null || edit === true) {
      return(<></>)
    }

    var btn_classes = ["App-shusha", "App-taisha"];
    var btnClassName = btn_classes[idx]
    return(
      <button className={btnClassName} onClick={this.stamp}>
      <div className="StampButton-Name">{this.props.user.displayName}</div>
      {work_states[idx]}
      <div className="App-time">{moment(timer).format("HH:mm:ss")}</div>
      <div className="App-date">{moment(timer).format("YYYY/MM/DD ddd")}</div>
      </button>
    )
  }
}


const Time = ({elem, edit, handleChange}) => {
  if(edit) {
    return(
      <input className="App-datetime" type="datetime-local"
      value={moment(elem.date).format("YYYY-MM-DDTHH:mm")}
      min="2019-01-01T00:00"
      max="2100-12-31T23:59"
      onChange={handleChange} />
    )
  } else {
    return(<>
      <div className="App-time">{moment(elem.date).format("HH:mm")}</div>
      <div className="App-date">{moment(elem.date).format("YYYY/MM/DD ddd")}</div>
      </>)
  }
}

const WorkTime = ({clsName, idx, elem, edit, work_states, handleChange}) => {
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
    <div className="App-TextLight">{work_states[idx]}</div>
    <div>
    <Time elem={info} edit={edit} handleChange={handleChange} />
    </div>
    </div>
  )
}

const LoadingPage = (props) => {
  return (
    <div className="App">
    <div className="App-Loading">
    Loading...
    </div>
    </div>
  )
}

const LoginDialog = ({
  handleLogIn,
  handleSignUp
}) => {
  const [email, setEmail] = useState("");
  const [pass, setPassword] = useState("");
  const [errMsg, setError] = useState(null);
  const [proceeding, setProceeding] = useState(false);
  const [googleSigninButtonImage, setSigninButton] = useState(btn_google_signin);

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

  const googleSignIn = (e) => {
    setSigninButton(btn_google_pressed);

    firebase.auth().getRedirectResult().then((result) => {
      if (result.credential) {
        var token = result.credential.accessToken;
        console.log("token")
        console.log(token)
      }
      var user = result.user
      console.log("user")
      console.log(user)
    })

    console.log("google signin");
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile')
    provider.addScope('email')
    firebase.auth().signInWithRedirect(provider).catch((error) => {
      console.log("GoogleSignIn");
      setError(error);
    })
  }

  const MouseEnteredOnGoogleSignInButton = (e) => {
    setSigninButton(btn_google_focus);
  }

  const MouseLeftOnGoogleSignInButton = (e) => {
    setSigninButton(btn_google_signin);
  }

  if(proceeding) {
    return(<LoadingPage />)
  }

  return(
    <>
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
    <div className="App-hr">もしくは</div>
    <img src={googleSigninButtonImage} className="App-GoogleLoginButton" onClick={googleSignIn} alt="google login button" 
      onMouseEnter={MouseEnteredOnGoogleSignInButton}
      onMouseLeave={MouseLeftOnGoogleSignInButton}

    />
    </div>
    </header>
    </div>
    </>
  )
}

class SignupPage extends Component {
  state = {
    errMsg: null,
    email: "",
    pass: "",
    name: "",
  }

  changeEmailText = (e) => {
    this.setState({email: e.target.value});
  }

  changePassText = (e) => {
    this.setState({pass: e.target.value});
  }

  clickRegisterButton = (e) => {
    var email = this.state.email;
    var pass = this.state.pass;
    firebase.auth().createUserWithEmailAndPassword(email, pass).catch((error) => {
      this.setState({errMsg: error});
    });
  }

  render() {
    return(
      <div className="App">
      <div className="App-Header">
      <div className="App-SignIn-Container">
      <div>ユーザー登録</div>
      <Error error={this.state.errMsg} />
      <EmailTextBox text={this.state.email} handleChange={this.changeEmailText} />
      <PassTextBox text={this.state.pass} handleChange={this.changePassText} />
      <LogInButton text="登録" handleClick={this.clickRegisterButton} />
      </div>
      </div>
      </div>
    )
  }
}

const TextBox = ({text, handleChange, placeholder}) => {
  return(
    <input className="App-textbox" type="text" value={text} onChange={e => handleChange(e)} placeholder={placeholder}/>
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
