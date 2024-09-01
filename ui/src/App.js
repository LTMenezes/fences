import './App.css';
import Mermaid from "./Mermaid";
import React, { useState, useEffect } from 'react';

function App() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    console.log('fetching spec');
    fetch('http://localhost:5000/graph')
      .then(response => response.text())
      .then(text => {
        console.log('received spec', text)
        setSpec(text)
      })
      .catch(error => console.error(error));
  }, []);

  return (
    <div className="App">
      <h1>fences</h1>
      {spec && <Mermaid chart={spec} />} 
    </div>
  );
}

export default App;
