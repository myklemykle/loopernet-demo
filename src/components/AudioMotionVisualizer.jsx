import React, { useRef, useEffect, useState } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
//import { getAudioContext } from '../utils/audioUtils';
import './AudioMotionVisualizer.css';

const AudioMotionVisualizer = ({ analyserNode, visualsEnabled }) => {
  const containerRef = useRef(null);
  const audioMotionRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !analyserNode) return;

    audioMotionRef.current = new AudioMotionAnalyzer(containerRef.current, {
      source: analyserNode,
      height: window.innerHeight,
      width: window.innerWidth,
      mode: 5,
      smoothing: 0.7,
      fillAlpha: 0.5,
      gradient: 'rainbow',
      showScaleX: false,
      showPeaks: false,
      radial: true,

      loRes:true,
      overlay: true,
      bgAlpha: 0,
    });

    setIsInitialized(true);

    const handleResize = () => {
      audioMotionRef.current.width = window.innerWidth;
      audioMotionRef.current.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (audioMotionRef.current) {
        audioMotionRef.current.destroy();
      }
    };
  }, [analyserNode]);

  useEffect(() => {
    if (!isInitialized) return;

    if (visualsEnabled) {
      audioMotionRef.current.start();
    } else {
      audioMotionRef.current.stop();
    }
  }, [visualsEnabled, isInitialized]);

  // if (!visualsEnabled) {
  //   return null;
  // }

  // display: none if visualsEnabled is false
  return <div ref={containerRef} className="audio-motion-visualizer" style={{ display: visualsEnabled ? 'block' : 'none' , scale: "200%"}} />;
};

export default AudioMotionVisualizer;