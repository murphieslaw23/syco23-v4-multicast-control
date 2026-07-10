import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Tv, 
  Activity, 
  Terminal as TermIcon, 
  Settings, 
  Volume2, 
  VolumeX, 
  Sliders, 
  ShieldAlert, 
  RefreshCw, 
  Play, 
  Square, 
  Layers, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Eye, 
  EyeOff,
  Music,
  Download,
  Upload,
  Sparkles,
  Database
} from 'lucide-react';

export default function App() {
  // Setup App ID and Configuration safely
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'syco23-broadcast-deck';

  // --- AUDIO STATES ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [gainValue, setGainValue] = useState(1.2);
  const [lowPassFreq, setLowPassFreq] = useState(20000); // Default open
  const [activeSource, setActiveSource] = useState('synth-ritual'); // synth-ritual, synth-warehouse, upload, url
  const [customUrl, setCustomUrl] = useState('https://streams.nightride.fm/chillsynth.mp3');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // --- BROADCAST & SIMULATION STATES ---
  const [isLive, setIsLive] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const [streamKey, setStreamKey] = useState('live_8392102_syco23_ritual_transmission_x871');
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [rtmpServer, setRtmpServer] = useState('rtmp://a.rtmp.youtube.com/live2');
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState('1080p');
  const [audioBitrate, setAudioBitrate] = useState('256kbps');
  const [overlayGrid, setOverlayGrid] = useState(false);
  const [overlayGlitch, setOverlayGlitch] = useState(true);
  const [vhsFilter, setVhsFilter] = useState(false);

  // --- TEMPLATE STATE ---
  // 1: The Ritual (Monolithic Totem)
  // 2: Wall of Bass (Warehouse Stack)
  // 3: Corruption Disk (Circular Glyphs)
  // 4: Brutalist Concrete Crypt (Girders & Tubes)
  // 5: Signal Grid (Industrial Diagnostics)
  const [activeTemplate, setActiveTemplate] = useState(1);

  // --- STATS / DIAGNOSTICS ---
  const [simBitrate, setSimBitrate] = useState(4850); // kbps
  const [simFps, setSimFps] = useState(30.0);
  const [simDroppedFrames, setSimDroppedFrames] = useState(0);
  const [simViewerCount, setSimViewerCount] = useState(0);
  const [cpuUsage, setCpuUsage] = useState(24);
  const [streamTime, setStreamTime] = useState(0);

  // --- TERMINAL LOGS ---
  const [logs, setLogs] = useState([
    { timestamp: '19:11:00', type: 'system', message: 'SYCO23 Broadcast Core v4.1 Initializing...' },
    { timestamp: '19:11:01', type: 'system', message: 'Loading ancient visual totems, mechanical audio encoders...' },
    { timestamp: '19:11:02', type: 'system', message: 'No surface detected. Deep underground pipelines mapped.' },
    { timestamp: '19:11:03', type: 'info', message: 'System Ready. Awaiting transmission protocol arming.' }
  ]);
  const [terminalFilter, setTerminalFilter] = useState('all'); // all, system, encoder, users

  // --- WEB AUDIO API & CANVAS REFERENCES ---
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const gainNodeRef = useRef(null);
  const filterNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const localFileBufferRef = useRef(null);
  const terminalBottomRef = useRef(null);

  // Synth Oscillator nodes for custom procedural dark loops
  const synthIntervalRef = useRef(null);
  const synthActiveRef = useRef(false);

  // --- INITIATE TERMINAL LOGGER ---
  const addLog = (message, type = 'info') => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setLogs((prev) => [...prev, { timestamp, type, message }].slice(-100)); // Keep last 100 logs
  };

  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // --- HANDLE SYSTEM STATISTICS LOOP ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLive) {
        setStreamTime(prev => prev + 1);
        // Add random fluctuation to metrics
        setSimBitrate(prev => Math.max(3800, Math.min(6200, Math.round(prev + (Math.random() - 0.5) * 150))));
        setSimFps(prev => Math.max(28.5, Math.min(30.2, Number((prev + (Math.random() - 0.5) * 0.4).toFixed(1)))));
        setCpuUsage(prev => Math.max(15, Math.min(65, Math.round(prev + (Math.random() - 0.5) * 6))));
        
        if (Math.random() > 0.95) {
          setSimDroppedFrames(prev => prev + Math.floor(Math.random() * 3));
          addLog('[encoder] Warning: Network jitter detected. Minor frame delay buffering.', 'error');
        }
        if (Math.random() > 0.85) {
          setSimViewerCount(prev => Math.max(0, Math.round(prev + (Math.random() - 0.45) * 20)));
        }

        // Periodically generate ffmpeg log outputs
        if (Math.random() > 0.7) {
          const fpsReport = (30 + (Math.random() - 0.5) * 0.5).toFixed(1);
          const kbpsReport = Math.round(4500 + (Math.random() - 0.5) * 300);
          addLog(`[ffmpeg] frame= ${streamTime * 30} fps=${fpsReport} q=22.0 size=${Math.round(streamTime * 560)}kB time=${formatTime(streamTime)} bitrate=${kbpsReport}kb/s speed=1.0x`, 'encoder');
        }

        // Periodic user chat/connection simulation
        if (Math.random() > 0.9) {
          const names = ['freetek_nomad', 'bass_totem', 'corrupt_signal', 'ancient_energy', 'grid_leak', 'sub_shaman', 'warehouse_dweller', 'osc_core'];
          const messages = [
            'Symmetrical stacks look heavy tonight!',
            'Loving the deep copper glow.',
            'Underground transmission active.',
            'Sub pressure reaching maximum limits.',
            'No surface. Only bass.',
            'This sound ritual is intense.',
            'Vibrating the concrete walls over here.',
            'SYSTEM CORRUPT standard active.'
          ];
          const randomUser = names[Math.floor(Math.random() * names.length)];
          const randomMsg = messages[Math.floor(Math.random() * messages.length)];
          addLog(`[user] <${randomUser}> ${randomMsg}`, 'user');
        }
      } else {
        setSimViewerCount(0);
        setStreamTime(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive, streamTime]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // --- AUDIO SYNTHESIS ENGINE (SYCO23 DRUMS & BASS) ---
  const stopSynthLoops = () => {
    synthActiveRef.current = false;
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
  };

  const startSynthLoops = () => {
    if (!audioContextRef.current) return;
    stopSynthLoops();
    synthActiveRef.current = true;
    
    let step = 0;
    const tempo = 138; // BPM
    const stepTime = 60 / tempo / 4; // 16th notes
    let nextNoteTime = audioContextRef.current.currentTime;

    addLog('[synth] Starting heavy industrial drum & drone generator at 138 BPM', 'system');

    const triggerStep = () => {
      const ctx = audioContextRef.current;
      if (!ctx || !synthActiveRef.current) return;

      const time = ctx.currentTime;

      // 1. CONSTANT SUB DRONE
      if (step % 32 === 0) {
        const drone = ctx.createOscillator();
        const droneGain = ctx.createGain();
        drone.type = 'sawtooth';
        drone.frequency.setValueAtTime(41.20, time); // E1 Deep sub bass note
        
        // Low pass filter
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(110, time);

        droneGain.gain.setValueAtTime(0, time);
        droneGain.gain.linearRampToValueAtTime(0.4, time + 0.5);
        droneGain.gain.exponentialRampToValueAtTime(0.01, time + 4);

        drone.connect(lowpass);
        lowpass.connect(droneGain);
        droneGain.connect(analyserRef.current);

        drone.start(time);
        drone.stop(time + 4.1);
      }

      // 2. WAREHOUSE KICK (Heavy, saturated sub-impact)
      if (step % 4 === 0) {
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        
        kickOsc.frequency.setValueAtTime(150, time);
        kickOsc.frequency.exponentialRampToValueAtTime(38, time + 0.18);
        
        kickGain.gain.setValueAtTime(0.9, time);
        kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);

        // Soft clip distortion
        const distortion = ctx.createWaveShaper();
        const makeDistortionCurve = (amount = 50) => {
          const k = typeof amount === 'number' ? amount : 50;
          const n_samples = 44100;
          const curve = new Float32Array(n_samples);
          const deg = Math.PI / 180;
          for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
          }
          return curve;
        };
        distortion.curve = makeDistortionCurve(100);
        distortion.oversample = '4x';

        kickOsc.connect(distortion);
        distortion.connect(kickGain);
        kickGain.connect(analyserRef.current);

        kickOsc.start(time);
        kickOsc.stop(time + 0.4);
      }

      // 3. RUSTY INDUSTRIAL HAT (White noise high-frequency pulse)
      if (activeSource === 'synth-warehouse' && (step % 4 === 2 || step % 8 === 5)) {
        // Noise buffer
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(8000, time);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.18, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(analyserRef.current);

        noise.start(time);
        noise.stop(time + 0.12);
      }

      // 4. ACID SLINE (303-ish resonant blip)
      if (activeSource === 'synth-warehouse' && (step % 16 === 3 || step % 16 === 10 || step % 16 === 14)) {
        const acid = ctx.createOscillator();
        const acidGain = ctx.createGain();
        const acidFilter = ctx.createBiquadFilter();

        const notes = [55, 65.4, 73.4, 82.4, 98, 110]; // A1, C2, D2, E2, G2, A2
        const randomNote = notes[Math.floor(Math.random() * notes.length)];

        acid.type = 'sawtooth';
        acid.frequency.setValueAtTime(randomNote, time);

        acidFilter.type = 'lowpass';
        acidFilter.frequency.setValueAtTime(300, time);
        acidFilter.frequency.exponentialRampToValueAtTime(1400, time + 0.1);
        acidFilter.Q.setValueAtTime(15, time); // High resonance

        acidGain.gain.setValueAtTime(0.25, time);
        acidGain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);

        acid.connect(acidFilter);
        acidFilter.connect(acidGain);
        acidGain.connect(analyserRef.current);

        acid.start(time);
        acid.stop(time + 0.2);
      }

      step = (step + 1) % 32;
    };

    // Scheduler loop
    const scheduleLoop = () => {
      while (nextNoteTime < audioContextRef.current.currentTime + 0.1) {
        triggerStep();
        nextNoteTime += stepTime;
      }
    };

    synthIntervalRef.current = setInterval(scheduleLoop, 25);
  };

  // --- AUDIO SETUP AND INTERACTIVE CONTROLS ---
  const initAudio = async () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      // Create main nodes
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gainValue, ctx.currentTime);
      gainNodeRef.current = gainNode;

      const filterNode = ctx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(lowPassFreq, ctx.currentTime);
      filterNodeRef.current = filterNode;

      // Connect nodes: Source -> Filter -> Gain -> Destination
      // Note: Synth loops connect directly to analyser to feed visualizer.
      analyser.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      addLog('[audio] Web Audio Context initialized with lowpass filter.', 'system');
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      addLog('[audio] Sound Engine activated.', 'system');
    }
  };

  const handleStartAudio = async () => {
    try {
      await initAudio();
      setIsPlaying(true);
      addLog('[audio] Commencing audio stream playback.', 'info');

      if (activeSource.startsWith('synth')) {
        startSynthLoops();
      } else if (activeSource === 'url') {
        playUrlStream(customUrl);
      } else if (activeSource === 'upload' && localFileBufferRef.current) {
        playBufferSource(localFileBufferRef.current);
      } else {
        addLog('[audio] No file loaded. Defaulting to Ritual Synth Drone.', 'error');
        setActiveSource('synth-ritual');
        startSynthLoops();
      }
    } catch (err) {
      addLog(`[audio] Failed to initiate stream. Error: ${err.message}`, 'error');
    }
  };

  const handleStopAudio = () => {
    setIsPlaying(false);
    stopSynthLoops();
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    addLog('[audio] Audio playback stopped manually.', 'info');
  };

  const handleGainChange = (val) => {
    setGainValue(val);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(isMuted ? 0 : val, audioContextRef.current.currentTime);
    }
  };

  const handleLowPassChange = (val) => {
    setLowPassFreq(val);
    if (filterNodeRef.current && audioContextRef.current) {
      filterNodeRef.current.frequency.setValueAtTime(val, audioContextRef.current.currentTime);
    }
  };

  const handleMuteToggle = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(nextMute ? 0 : gainValue, audioContextRef.current.currentTime);
    }
    addLog(`[audio] Mixer output ${nextMute ? 'MUTED' : 'UNMUTED'}`, 'info');
  };

  // --- EXTERNAL STREAM HANDLERS ---
  const playUrlStream = (url) => {
    if (!audioContextRef.current || !analyserRef.current) return;
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current.disconnect();
    }
    stopSynthLoops();

    addLog(`[audio] Resolving external Shoutcast/Icecast feed: ${url}`, 'system');
    
    // Create an audio element to bypass direct CORS restrictions on AudioBuffer
    const audioEl = new Audio();
    audioEl.crossOrigin = "anonymous";
    audioEl.src = url;
    audioEl.autoplay = true;

    // Use CORS proxy if requested or fallback to direct
    audioEl.addEventListener('error', (e) => {
      addLog(`[audio] Error loading URL directly. Emulating visual stream with sub-synth generator.`, 'error');
      // If live URL fails, we transition gracefully to simulated audio loop so preview never fails
      startSynthLoops();
    });

    const source = audioContextRef.current.createMediaElementSource(audioEl);
    source.connect(analyserRef.current);
    sourceNodeRef.current = audioEl; // Reference audio tag to pause later
    
    addLog(`[audio] Now decoding live stream feeds: ${url}`, 'info');
  };

  const playBufferSource = (buffer) => {
    if (!audioContextRef.current || !analyserRef.current) return;
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current.disconnect();
    }
    stopSynthLoops();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(analyserRef.current);
    source.start(0);
    sourceNodeRef.current = source;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileName(file.name);
    addLog(`[system] File received: ${file.name}. Commencing binary buffer upload.`, 'system');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await initAudio();
        addLog('[audio] Transcoding uploaded file to streamable WAV format...', 'system');
        audioContextRef.current.decodeAudioData(event.target.result, (decodedBuffer) => {
          localFileBufferRef.current = decodedBuffer;
          addLog('[audio] Transcode successful. Buffer loaded.', 'info');
          setActiveSource('upload');
          if (isPlaying) {
            playBufferSource(decodedBuffer);
          }
        }, (err) => {
          addLog('[audio] Transcode failed. Ensure audio is MP3/WAV.', 'error');
        });
      } catch (err) {
        addLog(`[audio] Transcoder error: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSourceChange = async (sourceType) => {
    setActiveSource(sourceType);
    if (!isPlaying) return;

    if (sourceType.startsWith('synth')) {
      if (sourceNodeRef.current) {
        if (sourceNodeRef.current.pause) sourceNodeRef.current.pause();
        else sourceNodeRef.current.stop();
      }
      startSynthLoops();
    } else if (sourceType === 'url') {
      playUrlStream(customUrl);
    } else if (sourceType === 'upload') {
      if (localFileBufferRef.current) {
        playBufferSource(localFileBufferRef.current);
      } else {
        addLog('[audio] No uploaded buffer found. Use upload module first.', 'error');
        setActiveSource('synth-ritual');
        startSynthLoops();
      }
    }
  };

  // --- BROADCAST STATE ACTIONS ---
  const handleArmToggle = () => {
    setIsArmed(!isArmed);
    if (!isArmed) {
      addLog('[system] TRANSMISSION STREAM ARMED. Danger: Live output key verified.', 'error');
    } else {
      setIsArmed(false);
      setIsLive(false);
      addLog('[system] Broadcast disarmed.', 'info');
    }
  };

  const handleLiveToggle = () => {
    if (!isArmed) {
      addLog('[system] Cannot start stream. You must ARM the pipeline first.', 'error');
      return;
    }
    
    const nextLive = !isLive;
    setIsLive(nextLive);
    if (nextLive) {
      addLog('[ffmpeg] Initiating RTMP handshake sequence...', 'system');
      addLog(`[ffmpeg] Output path detected: ${rtmpServer}/${streamKey.substring(0,8)}****`, 'system');
      addLog('[encoder] H264 hardware accelerator active. NVENC preset: Low Latency.', 'system');
      addLog('[stream] CONNECTION ESTABLISHED. Transmitting live visual totems.', 'info');
    } else {
      addLog('[stream] Connection terminated by host. Broadcast halted.', 'info');
    }
  };

  // --- PROCEDURAL VISUALIZER DRAW ENGINE ---
  useEffect(() => {
    let animationFrameId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set fixed internally render resolution (e.g. 1280x720 for crisp 16:9 output)
    canvas.width = 1280;
    canvas.height = 720;

    const render = () => {
      // Get Web Audio byte frequency data or mock it if not active
      const dataArray = new Uint8Array(256);
      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray);
      } else {
        // Mock data when paused so there is a passive visual vibe
        const time = Date.now() * 0.002;
        for (let i = 0; i < 256; i++) {
          dataArray[i] = Math.max(0, 40 + Math.sin(time + i * 0.05) * 35 + Math.cos(time * 0.4 - i * 0.1) * 15);
        }
      }

      // 1. EXTRACT SOUND BANDS
      let subBass = 0;  // 0 - 20
      let midRange = 0; // 20 - 120
      let highTone = 0;  // 120 - 250

      for (let i = 0; i < 20; i++) subBass += dataArray[i];
      for (let i = 20; i < 120; i++) midRange += dataArray[i];
      for (let i = 120; i < 250; i++) highTone += dataArray[i];

      subBass = (subBass / 20) / 255;
      midRange = (midRange / 100) / 255;
      highTone = (highTone / 130) / 255;

      const beatPulse = subBass * 1.35; // Drives intense motion
      const globalTime = Date.now();

      // Clear Screen with deep oppressive charcoal-black
      ctx.fillStyle = '#0a0a0d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Procedural background concrete wall textures
      ctx.fillStyle = 'rgba(18, 18, 22, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Industrial girders & shadows behind the totem
      ctx.strokeStyle = '#15151b';
      ctx.lineWidth = 14;
      ctx.beginPath();
      // Scaffold lines
      ctx.moveTo(100, 0); ctx.lineTo(100, canvas.height);
      ctx.moveTo(canvas.width - 100, 0); ctx.lineTo(canvas.width - 100, canvas.height);
      ctx.stroke();

      // Horizontal girders
      ctx.beginPath();
      ctx.moveTo(0, 150); ctx.lineTo(canvas.width, 150);
      ctx.moveTo(0, 570); ctx.lineTo(canvas.width, 570);
      ctx.stroke();

      // --- TEMPLATES DRAWING ENGINE ---
      if (activeTemplate === 1) {
        // ==========================================
        // TEMPLATE 1: THE RITUAL (Monolithic Totem)
        // ==========================================
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Draw Ambient Ochre Inner Cavern Glow
        const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, 400 + beatPulse * 150);
        const glowColor = `rgba(${180 + beatPulse * 75}, ${80 + beatPulse * 40}, 23, ${0.12 + beatPulse * 0.08})`;
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(cx - 600, cy - 360, 1200, 720);

        // Render Symmetrical Stack Speakers on left and right
        const drawSpeakerStack = (sideX, scaleFactor) => {
          ctx.save();
          ctx.translate(sideX, cy);
          
          // Stack base outline
          ctx.fillStyle = '#1c1b1f';
          ctx.strokeStyle = '#2d2b30';
          ctx.lineWidth = 4;
          
          // Left-right orientation flip
          const flip = sideX < cx ? 1 : -1;
          
          // Draw Main Outer Cabinet Structure
          ctx.beginPath();
          ctx.rect(flip * -200, -280, 170, 560);
          ctx.fill();
          ctx.stroke();

          // Subwoofers stack - Bottom Cab
          ctx.fillStyle = '#0e0d10';
          ctx.fillRect(flip * -190, 80, 150, 180);
          ctx.strokeRect(flip * -190, 80, 150, 180);

          // Subwoofer Cone with beat reactions
          ctx.beginPath();
          ctx.arc(flip * -115, 170, 60 + beatPulse * 12, 0, Math.PI * 2);
          ctx.fillStyle = '#141317';
          ctx.fill();
          ctx.strokeStyle = `rgba(${190 + beatPulse * 60}, 90, 25, 0.8)`;
          ctx.lineWidth = 3 + beatPulse * 5;
          ctx.stroke();

          // Mesh details over sub
          ctx.strokeStyle = 'rgba(50, 50, 60, 0.3)';
          ctx.lineWidth = 1;
          for (let xOffset = -50; xOffset <= 50; xOffset += 12) {
            ctx.beginPath();
            ctx.moveTo(flip * -115 + xOffset, 170 - 45);
            ctx.lineTo(flip * -115 + xOffset, 170 + 45);
            ctx.stroke();
          }

          // Mid Horns Cabinets - Middle Stack
          ctx.fillStyle = '#0e0d10';
          ctx.fillRect(flip * -190, -110, 150, 170);
          ctx.strokeRect(flip * -190, -110, 150, 170);

          // Symmetrical Metal Masks / Tribal Icons (from IMG_0063.jpeg)
          ctx.save();
          ctx.translate(flip * -115, -25);
          // Ancient metal carving face drawing
          ctx.fillStyle = '#3a322e'; // Rust/Oxidized Copper Look
          ctx.strokeStyle = '#1e1a17';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.rect(-25, -45, 50, 90);
          ctx.fill();
          ctx.stroke();
          
          // Carved symmetrical eyes
          ctx.fillStyle = `rgba(${200 + beatPulse * 55}, 90, 30, ${0.5 + beatPulse * 0.5})`;
          ctx.fillRect(-15, -20, 10, 6);
          ctx.fillRect(5, -20, 10, 6);
          
          // Carved line patterns
          ctx.strokeStyle = '#9e522d';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -35); ctx.lineTo(0, 35);
          ctx.moveTo(-15, 10); ctx.lineTo(15, 10);
          ctx.moveTo(-10, 20); ctx.lineTo(10, 20);
          ctx.stroke();
          ctx.restore();

          // Top horns - Tweeters
          ctx.fillStyle = '#0c0c0e';
          ctx.fillRect(flip * -190, -270, 150, 140);
          ctx.strokeRect(flip * -190, -270, 150, 140);
          // Horn flares
          ctx.strokeStyle = '#4e4b52';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(flip * -170, -250);
          ctx.lineTo(flip * -170, -150);
          ctx.lineTo(flip * -60, -150);
          ctx.lineTo(flip * -60, -250);
          ctx.closePath();
          ctx.stroke();

          // Copper piping and wires running down sides
          ctx.strokeStyle = '#a65d37';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(flip * -30, -280);
          ctx.bezierCurveTo(flip * -15, -100, flip * -5, 100, flip * -25, 280);
          ctx.stroke();

          ctx.restore();
        };

        // Render left and right speaker structures
        drawSpeakerStack(cx - 210, 1);
        drawSpeakerStack(cx + 210, 1);

        // Main Center Panel (The Ritual Monolith Frame)
        ctx.fillStyle = '#1e1b19'; // Scurried Rust Iron
        ctx.strokeStyle = '#111012';
        ctx.lineWidth = 12;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 30;
        
        ctx.beginPath();
        ctx.rect(cx - 150, cy - 300, 300, 600);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Draw heavy industrial metallic bolts on central block border
        ctx.fillStyle = '#4c3930'; // Oxidized bolts
        const drawBolts = () => {
          for (let y = cy - 280; y <= cy + 280; y += 45) {
            ctx.beginPath();
            ctx.arc(cx - 135, y, 6, 0, Math.PI * 2);
            ctx.arc(cx + 135, y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        };
        drawBolts();

        // DRAW ANCIENT TOTEM MASK (As seen in Reference IMG_0063.jpeg)
        ctx.save();
        ctx.translate(cx, cy - 60);
        
        // Symmetrical iron mask faceplate
        ctx.fillStyle = '#2d2522';
        ctx.strokeStyle = '#0f0c0b';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, -20, 60, Math.PI, 0, false); // top rounded
        ctx.lineTo(55, 100);
        ctx.lineTo(30, 140);
        ctx.lineTo(-30, 140);
        ctx.lineTo(-55, 100);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Deep Glowing Ritual Ochre Eyes
        const eyePulse = 0.4 + beatPulse * 0.6;
        ctx.fillStyle = `rgba(239, 106, 32, ${eyePulse})`;
        ctx.shadowColor = 'rgba(239, 106, 32, 0.8)';
        ctx.shadowBlur = 15 * eyePulse;
        
        // Left Eye Slot
        ctx.beginPath();
        ctx.moveTo(-35, 10); ctx.lineTo(-10, 15); ctx.lineTo(-15, 23); ctx.lineTo(-38, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right Eye Slot
        ctx.beginPath();
        ctx.moveTo(35, 10); ctx.lineTo(10, 15); ctx.lineTo(15, 23); ctx.lineTo(38, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Tribal Nose and forehead carvings
        ctx.strokeStyle = '#b05928'; // Burnt Ochre
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Nose bridge
        ctx.moveTo(0, 15); ctx.lineTo(0, 75);
        ctx.lineTo(-15, 80);
        ctx.moveTo(0, 75); ctx.lineTo(15, 80);
        // forehead symbols
        ctx.moveTo(-25, -45); ctx.lineTo(25, -45);
        ctx.moveTo(0, -65); ctx.lineTo(0, -35);
        // Chin glyphs
        ctx.moveTo(-20, 110); ctx.lineTo(20, 110);
        ctx.moveTo(-15, 120); ctx.lineTo(15, 120);
        ctx.stroke();

        ctx.restore();

        // SUB-BASS GLYPH EMBLEM PULSING
        ctx.save();
        ctx.translate(cx, cy + 130);
        const emblemScale = 0.95 + beatPulse * 0.22;
        ctx.scale(emblemScale, emblemScale);
        
        ctx.strokeStyle = `rgba(${220 + beatPulse * 35}, ${110 + beatPulse * 50}, 25, 0.95)`;
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(239, 106, 32, 0.5)';
        ctx.shadowBlur = 10 * beatPulse;
        
        // Symmetrical System Corrupt Glyphs
        ctx.beginPath();
        // Central diamond
        ctx.moveTo(0, -25);
        ctx.lineTo(25, 0);
        ctx.lineTo(0, 25);
        ctx.lineTo(-25, 0);
        ctx.closePath();
        
        // Antenna spikes
        ctx.moveTo(-25, 0); ctx.lineTo(-45, 0);
        ctx.moveTo(25, 0); ctx.lineTo(45, 0);
        ctx.moveTo(0, -25); ctx.lineTo(0, -45);
        
        // Symmetrical cross links
        ctx.moveTo(-15, -15); ctx.lineTo(-30, -30);
        ctx.moveTo(15, -15); ctx.lineTo(30, -30);
        ctx.stroke();
        ctx.restore();

        // TEXT BRANDING: "SYSTEM CORRUPT" & "SYCO23" at bottom of Central Block
        ctx.fillStyle = '#e8dec9';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("SYSTEM CORRUPT", cx, cy + 225);

        ctx.fillStyle = `rgba(${239 + beatPulse * 16}, 106, 32, 1)`;
        ctx.font = 'bold 42px Impact, sans-serif';
        ctx.letterSpacing = "6px";
        ctx.fillText("SYCO23", cx, cy + 270);

      } else if (activeTemplate === 2) {
        // ==========================================
        // TEMPLATE 2: WALL OF BASS (Warehouse Stack)
        // ==========================================
        // Symmetrical huge wall of black subwoofer boxes vibrating heavily to music.
        const gridX = 4;
        const gridY = 3;
        const boxW = 1280 / gridX;
        const boxH = 720 / gridY;

        for (let x = 0; x < gridX; x++) {
          for (let y = 0; y < gridY; y++) {
            const bx = x * boxW;
            const by = y * boxH;
            
            // Draw Sub Box casing
            ctx.fillStyle = '#111013';
            ctx.strokeStyle = '#27252b';
            ctx.lineWidth = 6;
            ctx.fillRect(bx + 10, by + 10, boxW - 20, boxH - 20);
            ctx.strokeRect(bx + 10, by + 10, boxW - 20, boxH - 20);

            // Subwoofer driver center coords
            const scx = bx + boxW / 2;
            const scy = by + boxH / 2;
            const specificFreq = dataArray[(x * 12 + y * 18) % 256] / 255;

            // Pulsing Outer speaker cone
            ctx.beginPath();
            ctx.arc(scx, scy, 75 + specificFreq * 18, 0, Math.PI * 2);
            ctx.fillStyle = '#070709';
            ctx.fill();
            ctx.strokeStyle = `rgba(${139 + specificFreq * 116}, 69, 19, 0.4)`;
            ctx.lineWidth = 4 + specificFreq * 6;
            ctx.stroke();

            // Symmetrical Speaker Dust Cap
            ctx.beginPath();
            ctx.arc(scx, scy, 25 + specificFreq * 8, 0, Math.PI * 2);
            ctx.fillStyle = '#1e1c22';
            ctx.fill();
            ctx.strokeStyle = '#d2691e';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Grate protective bars on top
            ctx.strokeStyle = 'rgba(100, 90, 85, 0.25)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(scx - 85, scy - 85); ctx.lineTo(scx + 85, scy + 85);
            ctx.moveTo(scx + 85, scy - 85); ctx.lineTo(scx - 85, scy + 85);
            ctx.stroke();

            // Heavy industrial structural rivets in corners
            ctx.fillStyle = '#5c4d44';
            ctx.beginPath();
            ctx.arc(bx + 25, by + 25, 5, 0, Math.PI * 2);
            ctx.arc(bx + boxW - 25, by + 25, 5, 0, Math.PI * 2);
            ctx.arc(bx + 25, by + boxH - 25, 5, 0, Math.PI * 2);
            ctx.arc(bx + boxW - 25, by + boxH - 25, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Overlay central heavy metal stenciled banner plate
        ctx.fillStyle = 'rgba(12, 11, 13, 0.9)';
        ctx.strokeStyle = '#ef6a20';
        ctx.lineWidth = 4;
        ctx.fillRect(440, 290, 400, 140);
        ctx.strokeRect(440, 290, 400, 140);

        ctx.fillStyle = '#ffffff';
        ctx.font = '22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO SURFACE. NO COMMERCIAL.', 640, 335);
        ctx.font = 'bold 38px Impact';
        ctx.fillStyle = '#ef6a20';
        ctx.fillText('SYCO23 UNDERGROUND', 640, 395);

      } else if (activeTemplate === 3) {
        // ==========================================
        // TEMPLATE 3: CORRUPTION DISK (Circular Glyphs)
        // ==========================================
        // Inspired by the circular Mayan/Industrial engine from reference image IMG_0089.png
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Draw Ambient glowing space
        const radGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 320);
        radGlow.addColorStop(0, `rgba(210, 105, 30, ${0.15 + beatPulse * 0.15})`);
        radGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radGlow;
        ctx.fillRect(0,0,1280,720);

        // Slow rotating gears/glyphs in background
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(globalTime * 0.0003); // Auto rot

        // Main ancient stone disk outline
        ctx.fillStyle = '#1c1b1f';
        ctx.strokeStyle = '#4e3b31';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 230, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Secondary inner circle
        ctx.strokeStyle = '#c85a17';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 180, 0, Math.PI * 2);
        ctx.stroke();

        // Render circular frequency spikes / teeth
        for (let i = 0; i < 48; i++) {
          const angle = (i / 48) * Math.PI * 2;
          const amplitude = dataArray[i % 128] / 255;
          const outerRadius = 180 + amplitude * 45;
          
          ctx.strokeStyle = `rgba(239, 106, 32, ${0.4 + amplitude * 0.6})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 180, Math.sin(angle) * 180);
          ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
          ctx.stroke();
        }

        // Gear Teeth extensions on disk rim
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          ctx.fillStyle = '#3a322e';
          ctx.save();
          ctx.rotate(angle);
          ctx.fillRect(220, -15, 30, 30);
          ctx.restore();
        }

        ctx.restore(); // restore rotation

        // Glowing center core (Mayan mechanical face glyph)
        ctx.beginPath();
        ctx.arc(cx, cy, 110, 0, Math.PI * 2);
        ctx.fillStyle = '#0c0b0d';
        ctx.strokeStyle = '#ef6a20';
        ctx.lineWidth = 8;
        ctx.fill();
        ctx.stroke();

        // Core visualizer wave inside the inner seal
        ctx.beginPath();
        for (let i = 0; i < 60; i++) {
          const x = cx - 90 + (i / 60) * 180;
          const index = Math.floor((i / 60) * 128);
          const val = (dataArray[index] / 255) * 60;
          if (i === 0) ctx.moveTo(x, cy - 10 + val);
          else ctx.lineTo(x, cy - 10 + val);
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Circular Emblem text overlay
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SYSTEM CORRUPT', cx, cy - 50);

        ctx.fillStyle = '#ef6a20';
        ctx.font = 'bold 36px Impact';
        ctx.fillText('SYCO', cx, cy + 45);

      } else if (activeTemplate === 4) {
        // ==========================================
        // TEMPLATE 4: BRUTALIST CONCRETE CRYPT (Girders & Tubes)
        // ==========================================
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Background dark industrial chamber lines
        ctx.strokeStyle = '#18171b';
        ctx.lineWidth = 4;
        for (let offset = -200; offset <= 200; offset += 50) {
          ctx.beginPath();
          ctx.moveTo(cx + offset, 0);
          ctx.lineTo(cx + offset * 1.5, 720);
          ctx.stroke();
        }

        // Draw massive central vacuum tubes/signal amplifiers glowing
        for (let i = -1; i <= 1; i += 2) {
          const tx = cx + i * 280;
          const ty = cy;

          // Tube glass chamber
          ctx.fillStyle = '#111013';
          ctx.strokeStyle = '#4e4039';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.rect(tx - 60, ty - 220, 120, 440);
          ctx.fill();
          ctx.stroke();

          // Copper filaments inside glowing reactively
          const glowBright = Math.floor(subBass * 140) + 115;
          ctx.strokeStyle = `rgba(${glowBright}, 65, 10, 0.9)`;
          ctx.shadowColor = `rgba(${glowBright}, 65, 10, 0.8)`;
          ctx.shadowBlur = 20 * subBass;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(tx - 25, ty - 180);
          ctx.lineTo(tx - 25, ty + 180);
          ctx.moveTo(tx + 25, ty - 180);
          ctx.lineTo(tx + 25, ty + 180);
          ctx.stroke();
          ctx.shadowBlur = 0; // reset

          // Horizontal metal grid bands across tube
          ctx.fillStyle = '#3a2d26';
          ctx.fillRect(tx - 65, ty - 120, 130, 20);
          ctx.fillRect(tx - 65, ty + 100, 130, 20);
        }

        // Central monolithic brutalist stenciled concrete pillar
        ctx.fillStyle = '#1e1c1b';
        ctx.strokeStyle = '#3e3834';
        ctx.lineWidth = 8;
        ctx.fillRect(cx - 130, 80, 260, 560);
        ctx.strokeRect(cx - 130, 80, 260, 560);

        // Large high-contrast SYCO23 stencil glyphs
        ctx.fillStyle = `rgba(245, 240, 230, ${0.85 + beatPulse * 0.15})`;
        ctx.font = 'bold 90px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SY', cx, 240);
        ctx.fillText('CO', cx, 340);
        
        ctx.fillStyle = '#df5b10';
        ctx.fillText('23', cx, 440);

        // Oscilloscope graph at the bottom base plate of concrete pillar
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 110, 500, 220, 110);
        ctx.strokeStyle = '#ef6a20';
        ctx.lineWidth = 4;
        ctx.strokeRect(cx - 110, 500, 220, 110);

        ctx.strokeStyle = '#00ff33'; // Glowing Green Matrix lines
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 50; i++) {
          const px = cx - 110 + (i / 50) * 220;
          const py = 555 + (dataArray[i * 2] - 128) * 0.35;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

      } else if (activeTemplate === 5) {
        // ==========================================
        // TEMPLATE 5: SIGNAL GRID (Industrial Diagnostics)
        // ==========================================
        // A minimal technical/vector layout displaying live signal charts and active diagnostics.
        ctx.strokeStyle = 'rgba(239, 106, 32, 0.15)';
        ctx.lineWidth = 1.5;
        
        // Horizontal / Vertical Vector Grid lines
        for (let x = 0; x < canvas.width; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 60) {
          ctx.beginPath();
          ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Draw Symmetrical Radar Circle in left-center
        const rx = 340;
        const ry = 360;
        ctx.strokeStyle = '#ef6a20';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(rx, ry, 180, 0, Math.PI * 2);
        ctx.stroke();
        
        // Glowing sweep radar hand
        const sweepAngle = (globalTime * 0.002) % (Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 106, 32, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(sweepAngle) * 180, ry + Math.sin(sweepAngle) * 180);
        ctx.stroke();

        // Waveform on radar boundaries
        ctx.beginPath();
        for (let i = 0; i < 180; i += 3) {
          const amp = dataArray[i % 128] / 255;
          const rad = 140 + amp * 40;
          const theta = (i / 180) * Math.PI * 2;
          const px = rx + Math.cos(theta) * rad;
          const py = ry + Math.sin(theta) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Technical Readout Box on the right
        const tx = 680;
        const ty = 120;
        ctx.fillStyle = 'rgba(15, 14, 18, 0.85)';
        ctx.strokeStyle = '#3e3a42';
        ctx.lineWidth = 4;
        ctx.fillRect(tx, ty, 520, 480);
        ctx.strokeRect(tx, ty, 520, 480);

        // Readout header
        ctx.fillStyle = '#ef6a20';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('// SYCO23 FREQUENCY SPECTRUM DIAGNOSTIC', tx + 20, ty + 40);

        // Render mini bars chart
        ctx.fillStyle = '#55453a';
        for (let i = 0; i < 24; i++) {
          const barH = (dataArray[i * 4] / 255) * 250;
          // Background spacer bar
          ctx.fillRect(tx + 30 + i * 19, ty + 100, 13, 260);
          // Active level bar
          ctx.fillStyle = '#ef6a20';
          ctx.fillRect(tx + 30 + i * 19, ty + 360 - barH, 13, barH);
          ctx.fillStyle = '#55453a';
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px monospace';
        ctx.fillText(`SUB PRESSURE CORE: ${Math.round(subBass * 100)}% ACTIVE`, tx + 30, ty + 400);
        ctx.fillText(`TRANS-MID AMPLITUDE: ${Math.round(midRange * 100)}%`, tx + 30, ty + 425);
        ctx.fillText(`UNDERGROUND STREAM STATUS: TRANSMITTING`, tx + 30, ty + 450);
      }

      // --- BRANDING INTEGRATION OVERLAYS ---
      // "UNDERGROUND TRANSMISSION. NO SURFACE." tagline at top edge of broadcast screen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.letterSpacing = '2px';
      ctx.fillText('// SYCO23 UNDERGROUND TRANSMISSION // PORT-8000 PIPELINE', 30, 40);

      // Simple real-time active clock overlay
      const clockDate = new Date();
      const clockStr = `${String(clockDate.getHours()).padStart(2, '0')}:${String(clockDate.getMinutes()).padStart(2, '0')}:${String(clockDate.getSeconds()).padStart(2, '0')}.${Math.floor(Math.random() * 99)}`;
      ctx.textAlign = 'right';
      ctx.fillText(`T-GMT: ${clockStr}`, canvas.width - 30, 40);

      // --- OPTIONAL SCREEN FILTERS / ARTIFACTS ---
      // 1. Interactive Technical Grid Overlay
      if (overlayGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < canvas.width; i += 40) {
          ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
        }
        for (let j = 0; j < canvas.height; j += 40) {
          ctx.moveTo(0, j); ctx.lineTo(canvas.width, j);
        }
        ctx.stroke();
      }

      // 2. Glitch horizontal interference bar
      if (overlayGlitch && Math.random() > 0.93) {
        const glitchY = Math.random() * canvas.height;
        const glitchH = 5 + Math.random() * 25;
        ctx.fillStyle = 'rgba(239, 106, 32, 0.18)';
        ctx.fillRect(0, glitchY, canvas.width, glitchH);

        // Slight shift of canvas
        ctx.drawImage(canvas, 12, glitchY, canvas.width - 24, glitchH, -12, glitchY, canvas.width - 24, glitchH);
      }

      // 3. Vintage VHS overlay simulation
      if (vhsFilter) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < canvas.height; i += 3) {
          if (Math.random() > 0.4) {
            ctx.fillRect(0, i, canvas.width, 1.5);
          }
        }
      }

      // LIVE watermark indicator blinking
      if (isLive) {
        const blnk = Math.floor(globalTime / 600) % 2 === 0;
        ctx.fillStyle = blnk ? '#ef6a20' : '#4a1505';
        ctx.beginPath();
        ctx.arc(canvas.width - 150, 80, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('LIVE STREAM', canvas.width - 132, 85);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeTemplate, isPlaying, overlayGrid, overlayGlitch, vhsFilter, isLive, activeSource]);

  return (
    <div className="min-h-screen bg-[#0e0d10] text-[#ded9e2] font-mono flex flex-col selection:bg-[#ef6a20] selection:text-black">
      
      {/* HEADER BAR */}
      <header className="border-b border-[#242129] bg-[#0c0b0e] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Logo Badge */}
          <div className="bg-[#ef6a20] text-black font-extrabold px-3 py-1 text-sm tracking-wider rounded flex items-center gap-2">
            <Radio className="w-4 h-4 animate-pulse" />
            SYCO23
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              SYSTEM CORRUPT <span className="text-[#a65d37] text-xs font-normal">Transmission Deck v4.1</span>
            </h1>
            <p className="text-xs text-[#6e6875]">No surface. Continuous pressure. Underground broadcast node.</p>
          </div>
        </div>

        {/* Live Broadcast Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#17151a] border border-[#2c2833] px-3 py-1.5 rounded text-xs">
            <Cpu className="w-4 h-4 text-[#a65d37]" />
            <span>ENCODER CPU:</span>
            <span className={`font-bold ${cpuUsage > 50 ? 'text-[#ef6a20]' : 'text-emerald-500'}`}>{cpuUsage}%</span>
          </div>

          <div className="flex items-center gap-2 bg-[#17151a] border border-[#2c2833] px-3 py-1.5 rounded text-xs">
            <Database className="w-4 h-4 text-[#a65d37]" />
            <span>APP ID:</span>
            <span className="text-[#ef6a20] font-bold">{appId.substring(0, 15)}</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs border ${
            isLive 
              ? 'bg-[#ef6a20]/10 border-[#ef6a20] text-[#ef6a20] animate-pulse' 
              : 'bg-[#1a181d] border-[#2d2a33] text-[#716c7a]'
          }`}>
            <Wifi className="w-4 h-4" />
            <span className="font-bold">{isLive ? 'ON AIR' : 'OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* CORE CONTROL AREA CONTAINER */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 p-5 max-w-[1800px] w-full mx-auto">
        
        {/* LEFT COLUMN: AUDIO ENGINE & PRESETS (3 COLS) */}
        <section className="xl:col-span-3 flex flex-col gap-5">
          
          {/* AUDIO SOURCE ENGINE CARD */}
          <div className="bg-[#0c0b0e] border border-[#222026] rounded-lg p-5 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#ef6a20]/5 to-transparent pointer-events-none"></div>
            
            <div className="flex items-center justify-between border-b border-[#222026] pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-[#ef6a20]" />
                1. AUDIO PIPELINE
              </h2>
              <span className="text-[10px] bg-[#222026] text-[#b4afb9] px-2 py-0.5 rounded">WEB AUDIO API</span>
            </div>

            {/* Source Type Selector */}
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => handleSourceChange('synth-ritual')}
                className={`flex items-center justify-between p-3 rounded text-xs border text-left transition-all ${
                  activeSource === 'synth-ritual' 
                    ? 'bg-[#ef6a20]/10 border-[#ef6a20] text-white' 
                    : 'bg-[#131216] border-[#222026] text-[#938e9a] hover:border-[#3a3740]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ef6a20]" />
                  <div>
                    <div className="font-bold">PROFILES: "THE RITUAL"</div>
                    <div className="text-[10px] opacity-70">Procedural Bass / Ambient Drone</div>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              </button>

              <button 
                onClick={() => handleSourceChange('synth-warehouse')}
                className={`flex items-center justify-between p-3 rounded text-xs border text-left transition-all ${
                  activeSource === 'synth-warehouse' 
                    ? 'bg-[#ef6a20]/10 border-[#ef6a20] text-white' 
                    : 'bg-[#131216] border-[#222026] text-[#938e9a] hover:border-[#3a3740]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#ef6a20]" />
                  <div>
                    <div className="font-bold">PROFILES: "WAREHOUSE ACID"</div>
                    <div className="text-[10px] opacity-70">138 BPM Resonant Industrial Loop</div>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              </button>

              {/* URL Feed Stream */}
              <div className={`p-3 rounded border flex flex-col gap-2 ${
                activeSource === 'url' ? 'bg-[#ef6a20]/10 border-[#ef6a20]' : 'bg-[#131216] border-[#222026]'
              }`}>
                <button 
                  onClick={() => handleSourceChange('url')}
                  className="flex items-center justify-between text-xs font-bold text-left text-[#938e9a] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#ef6a20]" />
                    EXTERNAL SHOUTCAST URL
                  </span>
                  <div className={`w-2 h-2 rounded-full ${activeSource === 'url' ? 'bg-[#ef6a20]' : 'bg-transparent'}`}></div>
                </button>
                <input 
                  type="text" 
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://icecast.stream/stream" 
                  className="bg-[#0a090c] border border-[#2b2930] text-xs text-white p-2 rounded focus:outline-none focus:border-[#ef6a20]"
                />
              </div>

              {/* Local File Transcode */}
              <div className={`p-3 rounded border flex flex-col gap-2 ${
                activeSource === 'upload' ? 'bg-[#ef6a20]/10 border-[#ef6a20]' : 'bg-[#131216] border-[#222026]'
              }`}>
                <button 
                  onClick={() => handleSourceChange('upload')}
                  className="flex items-center justify-between text-xs font-bold text-left text-[#938e9a] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#ef6a20]" />
                    TRANSCODE MP3/WAV BUFFER
                  </span>
                  <div className={`w-2 h-2 rounded-full ${activeSource === 'upload' ? 'bg-[#ef6a20]' : 'bg-transparent'}`}></div>
                </button>
                <label className="border border-dashed border-[#3e3a47] hover:border-[#ef6a20] py-2 px-3 rounded text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 bg-[#0c0b0d]">
                  <span className="text-[11px] text-[#9a94a2]">
                    {uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Select Audio Document'}
                  </span>
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
            </div>

            {/* Playback Trigger Control */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={handleStartAudio}
                disabled={isPlaying}
                className="bg-[#ef6a20] hover:bg-[#d05715] disabled:opacity-40 text-black font-extrabold py-3 px-4 rounded text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#ef6a20]/15"
              >
                <Play className="w-4 h-4" />
                PLAY AUDIO
              </button>
              <button 
                onClick={handleStopAudio}
                disabled={!isPlaying}
                className="bg-[#242129] hover:bg-[#342e3b] disabled:opacity-40 text-white font-bold py-3 px-4 rounded text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Square className="w-4 h-4" />
                STOP
              </button>
            </div>
          </div>

          {/* PRE-AMP MIXER / DSP FILTER CARD */}
          <div className="bg-[#0c0b0e] border border-[#222026] rounded-lg p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#222026] pb-3">
              <Sliders className="w-4 h-4 text-[#ef6a20]" />
              2. UNDERGROUND MIXER & DSP
            </h2>

            <div className="flex flex-col gap-4 text-xs">
              {/* Pre-amp Gain Gain */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[#a29ca8]">
                  <span>PRE-AMP GAIN (BOOST):</span>
                  <span className="font-bold text-white">{(gainValue * 10).toFixed(1)} dB</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="3.0" 
                  step="0.1"
                  value={gainValue}
                  onChange={(e) => handleGainChange(parseFloat(e.target.value))}
                  className="w-full accent-[#ef6a20] bg-[#16151a] h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Sub Low Pass Filter */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[#a29ca8]">
                  <span>LOW-PASS CORNER FREQ:</span>
                  <span className="font-bold text-[#ef6a20]">{lowPassFreq === 20000 ? 'BYPASSED' : `${lowPassFreq} Hz`}</span>
                </div>
                <input 
                  type="range" 
                  min="80" 
                  max="20000" 
                  step="20"
                  value={lowPassFreq}
                  onChange={(e) => handleLowPassChange(parseInt(e.target.value))}
                  className="w-full accent-[#ef6a20] bg-[#16151a] h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#5e5866]">
                  <span>80 Hz (Heavy Sub Only)</span>
                  <span>Bypass (20kHz)</span>
                </div>
              </div>

              {/* Master Mute Toggle */}
              <button 
                onClick={handleMuteToggle}
                className={`w-full py-2.5 px-4 rounded border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isMuted 
                    ? 'bg-red-950/20 border-red-500 text-red-500' 
                    : 'bg-[#141317] border-[#292730] text-white hover:border-[#3d3a47]'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isMuted ? 'UNMUTE MASTER MONITOR' : 'MUTE LOCAL DECK AUDIO'}
              </button>
            </div>
          </div>

          {/* ACTIVE VU METER BAR PANEL */}
          <div className="bg-[#0c0b0e] border border-[#222026] rounded-lg p-5 flex flex-col gap-3">
            <h2 className="text-xs font-bold text-white tracking-widest uppercase">DYNAMIC DECIBEL METER</h2>
            
            <div className="flex gap-1 items-end h-20 bg-[#070608] p-3 rounded border border-[#1b1a1f] overflow-hidden">
              {/* Symmetrical left-right VU indicators */}
              {[...Array(20)].map((_, i) => {
                const heightPercent = isPlaying 
                  ? Math.max(10, Math.round(50 + Math.sin(Date.now()*0.01 + i*0.4)*30 + Math.random()*20))
                  : 5;
                const isOverload = i > 15;
                const isWarning = i > 11 && i <= 15;
                const barColor = isOverload ? 'bg-red-500' : isWarning ? 'bg-[#ef6a20]' : 'bg-emerald-500';

                return (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full">
                    <div 
                      style={{ height: `${heightPercent}%` }} 
                      className={`w-full rounded-t-sm transition-all duration-75 ${barColor}`}
                    ></div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-[#746e7b] px-1">
              <span>-60 dB</span>
              <span>-12 dB</span>
              <span className="text-red-500 font-bold">0 dB OVER</span>
            </div>
          </div>

        </section>

        {/* CENTER COLUMN: LIVE CANVAS PREVIEW & TEMPLATES CHANGER (6 COLS) */}
        <section className="xl:col-span-6 flex flex-col gap-5">
          
          {/* RITUAL PREVIEW SCREEN */}
          <div className="bg-[#0c0b0e] border border-[#ef6a20]/30 rounded-lg p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs border-b border-[#201e24] pb-2 px-1">
              <span className="text-[#ef6a20] font-bold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef6a20] animate-pulse"></span>
                ACTIVE PIPELINE PREVIEW SCREEN (16:9 OUTPUT)
              </span>
              <span className="text-[#a59ea9]">1280 x 720 (Crisp Procedural)</span>
            </div>

            {/* Simulated Live Viewport canvas */}
            <div className="relative aspect-video w-full bg-black rounded overflow-hidden border border-[#222026]">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full object-contain cursor-crosshair"
              />

              {/* Security scanline glitch effect */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[#ef6a20]/2 to-transparent opacity-60 animate-pulse"></div>
            </div>

            {/* SCREEN ADJUSTMENT BUTTONS */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121114] p-2 rounded text-xs">
              <span className="font-bold text-[#b4afb9]">DIAGNOSTIC CONTROLS:</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setOverlayGrid(!overlayGrid)}
                  className={`px-3 py-1 rounded border transition-all ${
                    overlayGrid ? 'bg-[#ef6a20] text-black border-[#ef6a20]' : 'bg-[#18171c] border-[#2c2933] text-white'
                  }`}
                >
                  ALIGNMENT GRID
                </button>
                <button 
                  onClick={() => setOverlayGlitch(!overlayGlitch)}
                  className={`px-3 py-1 rounded border transition-all ${
                    overlayGlitch ? 'bg-[#ef6a20] text-black border-[#ef6a20]' : 'bg-[#18171c] border-[#2c2933] text-white'
                  }`}
                >
                  RANDOM GLITCH
                </button>
                <button 
                  onClick={() => setVhsFilter(!vhsFilter)}
                  className={`px-3 py-1 rounded border transition-all ${
                    vhsFilter ? 'bg-[#ef6a20] text-black border-[#ef6a20]' : 'bg-[#18171c] border-[#2c2933] text-white'
                  }`}
                >
                  VHS RUST SCANLINES
                </button>
              </div>
            </div>
          </div>

          {/* TEMPLATE CHOOSER SECTIONS (5 Presets) */}
          <div className="bg-[#0c0b0e] border border-[#222026] rounded-lg p-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#222026] pb-3 mb-4">
              <Layers className="w-4 h-4 text-[#ef6a20]" />
              3. SELECT STREAMING TEMPLATE
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { id: 1, title: 'THE RITUAL', desc: 'Ancient Totem Mask', col: 'from-[#ef6a20]/20 to-[#4c1f0a]/30' },
                { id: 2, title: 'WALL OF BASS', desc: 'Symmetrical Stacks', col: 'from-gray-900 to-black' },
                { id: 3, title: 'CORRUPT DISK', desc: 'Mechanical Gears', col: 'from-amber-950/20 to-black' },
                { id: 4, title: 'CONCRETE CRYPT', desc: 'Brutalist Stencils', col: 'from-[#3a2d26]/20 to-zinc-900' },
                { id: 5, title: 'SIGNAL GRID', desc: 'Technical Vector', col: 'from-[#2e3a35]/20 to-black' }
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setActiveTemplate(tmpl.id)}
                  className={`relative p-3 rounded border text-left flex flex-col justify-between h-28 overflow-hidden transition-all duration-300 ${
                    activeTemplate === tmpl.id 
                      ? 'bg-gradient-to-br border-[#ef6a20] ring-1 ring-[#ef6a20]' 
                      : 'bg-[#111013] border-[#222026] hover:border-[#423d4a]'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${tmpl.col} opacity-40 pointer-events-none`}></div>
                  <div className="relative z-10">
                    <span className="text-[10px] text-[#ef6a20] font-bold block mb-1">TEMPLATE {tmpl.id}</span>
                    <span className="text-sm font-extrabold text-white block truncate">{tmpl.title}</span>
                  </div>
                  <span className="text-[10px] text-[#918a99] relative z-10">{tmpl.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SIMULATED ENCODER LOG CARD */}
          <div className="bg-[#08070a] border border-[#222026] rounded-lg p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1b1a1f] pb-3">
              <div className="flex items-center gap-2">
                <TermIcon className="w-4 h-4 text-[#ef6a20]" />
                <span className="text-sm font-bold text-white uppercase">4. PIPELINE TERMINAL FEED</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#a39ca9]">
                <span>Filter:</span>
                <select 
                  value={terminalFilter}
                  onChange={(e) => setTerminalFilter(e.target.value)}
                  className="bg-[#121115] border border-[#2d2933] text-xs text-[#ef6a20] px-2 py-1 rounded cursor-pointer"
                >
                  <option value="all">ALL STREAMS</option>
                  <option value="system">CORE ALERTS</option>
                  <option value="encoder">FFMPEG STACK</option>
                  <option value="user">USER CHAT</option>
                </select>
              </div>
            </div>

            {/* Custom Terminal Content */}
            <div className="bg-[#040405] text-emerald-400 font-mono text-xs p-4 rounded border border-[#1b1920] h-48 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-[#25232c]">
              {logs
                .filter(log => {
                  if (terminalFilter === 'all') return true;
                  return log.type === terminalFilter;
                })
                .map((log, index) => {
                  const tagColors = {
                    system: 'text-[#ef6a20]',
                    info: 'text-sky-400',
                    encoder: 'text-amber-500',
                    user: 'text-[#ffffff]',
                    error: 'text-red-500 font-bold'
                  };

                  return (
                    <div key={index} className="leading-relaxed hover:bg-white/[0.03] px-1 rounded transition-colors">
                      <span className="text-[#65606e] mr-2">[{log.timestamp}]</span>
                      <span className={`${tagColors[log.type] || 'text-white'}`}>{log.message}</span>
                    </div>
                  );
              })}
              <div ref={terminalBottomRef} />
            </div>

            <div className="flex justify-between items-center text-[10px] text-[#5b5763]">
              <span>Pipeline latency: 24ms</span>
              <span>Buffer size: 1024 frames</span>
              <span>Enc: H.264 Core</span>
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: BROADCAST CONTROLS & RTMP DISPATCH (3 COLS) */}
        <section className="xl:col-span-3 flex flex-col gap-5">
          
          {/* BROADCAST STATE CARD (MASTER ARMED SWITCH) */}
          <div className="bg-[#0c0b0e] border border-[#222026] rounded-lg p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#222026] pb-3">
              <Tv className="w-4 h-4 text-[#ef6a20]" />
              5. INGESTION PIPELINE
            </h2>

            {/* ARM Switch with mechanical toggle look */}
            <div className="bg-[#131216] border border-[#2b2830] p-4 rounded flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">ARM TRANSMISSION</span>
                  <span className="text-[10px] text-[#a09aa6]">Enables stream launch button</span>
                </div>
                <button
                  onClick={handleArmToggle}
                  className={`w-14 h-8 rounded-full transition-all duration-300 relative flex items-center p-1 cursor-pointer ${
                    isArmed ? 'bg-[#ef6a20]' : 'bg-[#26242b]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                    isArmed ? 'translate-x-6' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              {isArmed ? (
                <div className="bg-amber-950/20 border border-[#ef6a20]/40 text-[#ef6a20] text-[10px] p-2 rounded flex items-start gap-1.5 animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>WARNING: Transmission key unlocked. Outputting next stream launches active RTMP feed.</span>
                </div>
              ) : (
                <div className="bg-zinc-900 text-zinc-500 text-[10px] p-2 rounded text-center">
                  Ingestion locked. Arm mechanism above.
                </div>
              )}
            </div>

            {/* Master Start Streaming Launch Panel */}
            <div className="flex flex-col gap-3">
              <button
                disabled={!isArmed}
                onClick={handleLiveToggle}
                className={`w-full py-4 rounded font-extrabold text-sm tracking-wider flex items-center justify-center gap-3 transition-all ${
                  isLive 
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                    : isArmed 
                      ? 'bg-[#ef6a20] hover:bg-[#d05715] text-black shadow-md shadow-[#ef6a20]/20' 
                      : 'bg-[#222026] text-[#55525c] cursor-not-allowed border border-[#2c2933]'
                }`}
              >
                <Radio className="w-5 h-5" />
                {isLive ? 'TERMINATE STREAM' : 'START LIVE BROADCAST'}
              </button>

              {isLive && (
                <div className="flex flex-col gap-1 text-center bg-emerald-950/20 border border-emerald-500/40 rounded p-2 text-[11px] text-emerald-400">
                  <span className="font-extrabold animate-pulse">TRANSMITTING PACKETS TO YOUTUBE</span>
                  <span>TIME LIVE: {formatTime(streamTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ENCODER SETTINGS */}
          <div className="bg-[#0c0b0e] border border-[#222026] rounded-lg p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#222026] pb-3">
              <Settings className="w-4 h-4 text-[#ef6a20]" />
              6. RTMP METADATA
            </h2>

            <div className="flex flex-col gap-3 text-xs">
              
              {/* Server Target */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[#a09aa6]">RTMP INGEST HOST:</span>
                <input 
                  type="text" 
                  value={rtmpServer}
                  onChange={(e) => setRtmpServer(e.target.value)}
                  className="bg-[#121115] border border-[#2a2730] text-xs text-white p-2 rounded focus:outline-none focus:border-[#ef6a20]"
                />
              </div>

              {/* Stream Key masked */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[#a09aa6]">STREAM KEY / SHIELD ID:</span>
                <div className="relative">
                  <input 
                    type={showStreamKey ? 'text' : 'password'} 
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    className="bg-[#121115] border border-[#2a2730] text-xs text-white p-2 pr-10 rounded focus:outline-none focus:border-[#ef6a20] w-full"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowStreamKey(!showStreamKey)}
                    className="absolute right-2 top-2 text-[#797380] hover:text-[#ef6a20]"
                  >
                    {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Resolution options */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[#a09aa6]">TARGET RESOLUTION:</span>
                <div className="grid grid-cols-3 gap-1">
                  {['720p', '1080p', '1440p'].map(res => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`py-1 rounded border text-[10px] font-bold ${
                        resolution === res 
                          ? 'bg-[#ef6a20]/10 border-[#ef6a20] text-white' 
                          : 'bg-[#121115] border-[#222026] text-[#75707c]'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Bitrate select */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[#a09aa6]">AUDIO QUALITY PIPELINE:</span>
                <div className="grid grid-cols-3 gap-1">
                  {['128kbps', '256kbps', '320kbps'].map(bit => (
                    <button
                      key={bit}
                      onClick={() => setAudioBitrate(bit)}
                      className={`py-1 rounded border text-[10px] font-bold ${
                        audioBitrate === bit 
                          ? 'bg-[#ef6a20]/10 border-[#ef6a20] text-white' 
                          : 'bg-[#121115] border-[#222026] text-[#75707c]'
                      }`}
                    >
                      {bit}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* LIVE GRAPH STATISTICS SIMULATION CARD */}
          <div className="bg-[#0c0b0e] border border-[#222026] rounded-lg p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#222026] pb-3">
              <Activity className="w-4 h-4 text-[#ef6a20]" />
              7. ANALYTICS DIAGNOSTIC
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#121115] p-2.5 rounded border border-[#222026]">
                <span className="text-[#8d8894] text-[10px] block uppercase">ENCODING FPS</span>
                <span className="text-lg font-bold text-white">{isLive ? simFps : '0.0'}</span>
              </div>
              <div className="bg-[#121115] p-2.5 rounded border border-[#222026]">
                <span className="text-[#8d8894] text-[10px] block uppercase">VIDEO BITRATE</span>
                <span className="text-lg font-bold text-[#ef6a20]">{isLive ? `${simBitrate} kbps` : '0 kbps'}</span>
              </div>
              <div className="bg-[#121115] p-2.5 rounded border border-[#222026]">
                <span className="text-[#8d8894] text-[10px] block uppercase">DROPPED FRAMES</span>
                <span className={`text-lg font-bold ${simDroppedFrames > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {isLive ? simDroppedFrames : '0'}
                </span>
              </div>
              <div className="bg-[#121115] p-2.5 rounded border border-[#222026]">
                <span className="text-[#8d8894] text-[10px] block uppercase">MOCK VIEWERS</span>
                <span className="text-lg font-bold text-white">{isLive ? simViewerCount : '0'}</span>
              </div>
            </div>

            {/* Custom Procedural Wave SVG indicator representing stable transport */}
            <div className="bg-[#080709] border border-[#1d1b22] p-2 rounded">
              <span className="text-[9px] text-zinc-500 block mb-1">PACKET TRANSMISSION FLOW:</span>
              <svg className="w-full h-8" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path 
                  d={`M0,5 Q20,${isLive ? 2 + Math.random()*6 : 5} 40,5 T80,5 T100,5`} 
                  fill="none" 
                  stroke={isLive ? "#ef6a20" : "#423d4a"} 
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

        </section>

      </main>

      {/* FOOTER METRIC BANNER */}
      <footer className="border-t border-[#242129] bg-[#0c0b0e] py-4 px-6 text-center text-[11px] text-[#716c7a] flex flex-wrap justify-between items-center gap-2">
        <span>SYCO23 © BRAND BOOK INTEGRATION. SYSTEM CORRUPT // CONTINUOUS PRESSURE.</span>
        <span>"UNDERGROUND TRANSMISSION. NO SURFACE."</span>
      </footer>

    </div>
  );
}