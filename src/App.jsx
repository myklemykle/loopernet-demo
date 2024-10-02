import React, { useState, useEffect } from 'react';
import AudioVisualizer from './components/AudioVisualizer';
import { getAnalyserNode } from './audioUtils';
import { useFireproof } from 'use-fireproof';
import { ConnectS3 } from '@fireproof/aws'
import { ConnectPartyKit } from '@fireproof/partykit'
import PatternSet from './components/PatternSet';
import TopControls from './components/TopControls';
import LatencySlider from './components/LatencySlider';
import { TimesyncProvider } from './TimesyncContext';
import { initLatencyCompensation } from './audioUtils';
import './App.css';

const partyCxs = new Map();
function partykitS3({ name, blockstore }, partyHost, refresh) {
  if (!name) throw new Error('database name is required')
  if (!refresh && partyCxs.has(name)) {
    return partyCxs.get(name)
  }
  const s3conf = { // example values, replace with your own by deploying https://github.com/fireproof-storage/valid-cid-s3-bucket
    upload: import.meta.env.VITE_S3PARTYUP,
    download: import.meta.env.VITE_S3PARTYDOWN
  }
  const s3conn = new ConnectS3(s3conf.upload, s3conf.download, '')
  s3conn.connectStorage(blockstore)

  if (!partyHost) {
    console.warn('partyHost not provided, using localhost:1999')
    partyHost = 'http://localhost:1999'
  }
  const connection = new ConnectPartyKit({ name, host: partyHost })
  connection.connectMeta(blockstore)
  partyCxs.set(name, connection)
  return connection
}

function App() {
  const instruments = ['Kick', 'Snare', 'Hi-hat', 'Tom', 'Clap'];
  const currentHour = new Date().toISOString().slice(0, 13)
  const dbName = (import.meta.env.VITE_DBNAME || 'drum-machine') + '-' + currentHour;
  const { database, useLiveQuery } = useFireproof(dbName);

  const [isExpert, setIsExpert] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [visualsEnabled, setVisualsEnabled] = useState(() => {
    const saved = localStorage.getItem('visualsEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [analyserNode, setAnalyserNode] = useState(null);

  const toggleExpert = () => {
    setIsExpert(!isExpert);
  };

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const handleLongPress = (callback, duration = 500) => {
    let timer;
    const start = () => {
      timer = setTimeout(callback, duration);
    };
    const clear = () => {
      clearTimeout(timer);
    };

    return {
      onTouchStart: start,
      onTouchEnd: clear,
      onTouchMove: clear,
      onMouseDown: start,
      onMouseUp: clear,
      onMouseLeave: clear
    };
  };

  const longPressHandlers = handleLongPress(toggleExpert);

  const partyKitHost = import.meta.env.VITE_REACT_APP_PARTYKIT_HOST;

  useEffect(() => {
    initLatencyCompensation();
  }, []);

  if (partyKitHost) {
    const connection = partykitS3(database, partyKitHost);
    console.log("Connection", connection);
  } else {
    console.warn("No connection");
  }

  let beats = {};
  const result = useLiveQuery('type', { key: 'beat' });
  result.rows.forEach(row => {
    beats[row.doc._id] = row.doc.isActive;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Fix for mobile viewport height
    const appHeight = () => {
      const doc = document.documentElement;
      doc.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    window.addEventListener('resize', appHeight);
    appHeight();
    return () => window.removeEventListener('resize', appHeight);
  }, []);

  useEffect(() => {
    // Get the analyserNode from audioUtils
    const analyser = getAnalyserNode();
    setAnalyserNode(analyser);
  }, []);

  const toggleVisuals = () => {
    setVisualsEnabled(prev => {
      const newState = !prev;
      localStorage.setItem('visualsEnabled', JSON.stringify(newState));
      return newState;
    });
  };

  return (
    <TimesyncProvider partyKitHost={partyKitHost}>
      <div className="app">
        <AudioVisualizer analyserNode={analyserNode} visualsEnabled={visualsEnabled} />
        <div className="app-content">
          <h1 className="app-title" {...longPressHandlers}>Loopernet Demo</h1>
          <TopControls 
            dbName={dbName} 
            isExpert={isExpert} 
            toggleTheme={toggleTheme} 
            theme={theme}
            toggleVisuals={toggleVisuals}
            visualsEnabled={visualsEnabled}
          />
          <PatternSet dbName={dbName} instruments={instruments} beats={beats} />
        </div>
      </div>
    </TimesyncProvider>
  );
}

export default App;
