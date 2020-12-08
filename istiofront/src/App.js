import { useState } from 'react'
import logo from './logo.svg';
import Toggle from 'react-toggle'
import "react-toggle/style.css"
import './App.css';
import { tokenExample } from './constants';

function App() {
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [circleId, setCircleId] = useState("")
  const [bearer, setBearer] = useState(false)


  const getServerInfo = async () => {
    var myHeaders = new Headers()
    if (circleId.length) {
      myHeaders.append("x-circle-id", circleId)
    }
    if (bearer) {
      myHeaders.append("Authorization", "Bearer " + tokenExample)
    }
    fetch("http://example-ingress.com/server", {
      headers: myHeaders
    }).then(async response => {
      if (response.status === 404) {
        setError(true)
        return setResponse(null)
      } else {
        const text = await response.text()
        setResponse(text)
        setError(null)
      }
    }).catch((e) => {
      setError(true)
      setResponse(null)
    })
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        {
          response && (
            <span>{response}</span>
          )
        }

        {
          error && (
            <span style={{ color: "red" }}>Server is unreachable</span>
          )
        }
        <input style={{
          width: "300px",
          marginTop: "20px"
        }} placeholder="If you like to add some circle id..." value={circleId} onChange={e => setCircleId(e.target.value)} />
        <label style={{
          marginTop: "30px"
        }}>
          <Toggle value={bearer} onClick={() => setBearer(!bearer)} />
          <span style={{ marginLeft: "15px"}}>Use example token</span>
        </label>
        <button
          style={{
            marginTop: "10px",
            padding: "15px",
            borderRadius: "5px",
          }}
          onClick={() => getServerInfo()}
        >
          Test Connection
        </button>
      </header>
    </div>
  );
}

export default App;
