import React from 'react';
import './App.css';
import { BrowserRouter as Router } from 'react-router-dom';
import Fib from './Fib';

function App() {
  return (
    <Router>
      <div className="App">
        <Fib/>
      </div>
    </Router>
  );
}

export default App;
