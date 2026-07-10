import React, { useState, useEffect, useRef } from 'react';

// --- STYLING & ACCENT SCHEMES ---
const TONE_PRESETS = {
  rust: {
    hex: '#d95f02',
    name: 'RUST ORANGE',
    border: 'border-orange-800/80',
    text: 'text-orange-500',
    bg: 'bg-orange-950/20',
    glow: 'shadow-orange-950/50',
    accentClass: 'text-orange-500 border-orange-700 bg-orange-950/30'
  },
  crimson: {
    hex: '#991b1b',
    name: 'DEEP CRIMSON',
    border: 'border-red-900/80',
    text: 'text-red-500',
    bg: 'bg-red-950/20',
    glow: 'shadow-red-950/50',
    accentClass: 'text-red-500 border-red-850 bg-red-950/30'
  },
  amber: {
    hex: '#b45309',
    name: 'DULL AMBER',
    border: 'border-amber-900/80',
    text: 'text-amber-500',
    bg: 'bg-amber-950/20',
    glow: 'shadow-amber-950/50',
    accentClass: 'text-amber-500 border-amber-800 bg-amber-950/30'
  },
  copper: {
    hex: '#0f766e',
    name: 'OXIDIZED COPPER',
    border: 'border-teal-850',
    text: 'text-teal-500',
    bg: 'bg-teal-950/20',
    glow: 'shadow-teal-950/50',
    accentClass: 'text-teal-500 border-teal-700 bg-teal-950/30'
  },
  turquoise: {
    hex: '#0891b2',
    name: 'DIRTY TURQUOISE',
    border: 'border-cyan-900/80',
    text: 'text-cyan-500',
    bg: 'bg-cyan-950/20',
    glow: 'shadow-cyan-950/50',
    accentClass: 'text-cyan-500 border-cyan-800 bg-cyan-950/30'
  },
  ochre: {
    hex: '#78350f',
    name: 'BURNT OCHRE',
    border: 'border-yellow-900/80',
    text: 'text-yellow-600',
    bg: 'bg-yellow-950/20',
    glow: 'shadow-yellow-950/50',
    accentClass: 'text-yellow-600 border-yellow-800 bg-yellow-950/30'
  }
};

const TEMPLATE_PRESETS = [
  { id: 'totem', name: 'THE RITUAL TOTEM', desc: 'Symmetrical speaker stack with tribal monolith glow.' },
  { id: 'wall', name: 'WALL OF BASS', desc: 'Extreme subwoofer vibration, industrial copper bolts.' },
  { id: 'disk', name: 'CORRUPTION DISK', desc: 'Aztec gears rotating to sub-harmonics.' },
  { id: 'crypt', name: 'BRUTALIST CRYPT', desc: 'Concrete pillars surrounding analog tube valves.' },
  { id: 'grid', name: 'SIGNAL GRID', desc: 'High-density spectrum analyzers with radial scans.' }
];

const INITIAL_NODES = [
  { id: 'youtube', name: 'YOUTUBE LIVE', state: 'offline', protocol: 'RTMP', profile: '1080p60 h264', key: 'live_yc23_88df294', url: 'rtmp://a.rtmp.youtube.com/live2', port: 1935, bitrate: 6200, latency: '1.2s' },
  { id: 'telegram', name: 'TELEGRAM GATEWAY', state: 'offline', protocol: 'RTMP', profile: '720p30 h264', key: 'tg_sec_991823a0ff', url: 'rtmp://dc-ams.tg-cast.org/live', port: 443, bitrate: 2800, latency: '0.8s' },
  { id: 'tiktok', name: 'TIKTOK STREAM NODE', state: 'offline', protocol: 'RTMPS', profile: '1080p60 (Portrait)', key: 'tt_9281a8c3d9ef', url: 'rtmps://live-api.tiktok.com/stream', port: 443, bitrate: 4500, latency: '2.1s' },
  { id: 'twitch', name: 'TWITCH INGEST', state: 'offline', protocol: 'RTMP', profile: '1080p60 h264', key: 'live_tw_990184_sc23', url: 'rtmp://ams01.contribute.live.tv', port: 1935, bitrate: 6000, latency: '1.5s' },
  { id: 'instagram', name: 'INSTAGRAM PORTAL', state: 'offline', protocol: 'RTMPS', profile: '720p30 (Portrait)', key: 'ig_7721994_rtmps', url: 'rtmps://live-upload.instagram.com:443/rtmp', port: 443, bitrate: 3200, latency: '1.9s' },
  { id: 'mixer', name: 'MIXER LEGACY COIL', state: 'offline', protocol: 'RTMP', profile: '1080p30 h264', key: 'mx_882910_relay', url: 'rtmp://lax.mixer-stream.net/live', port: 1935, bitrate: 4000, latency: '2.5s' },
  { id: 'mixcloud', name: 'MIXCLOUD LIVE', state: 'offline', protocol: 'RTMP', profile: 'Audio-First 320k', key: 'mc_live_aac_99a8', url: 'rtmp://ingest.mixcloud.com/live', port: 1935, bitrate: 3500, latency: '3.1s' },
  { id: 'facebook', name: 'FACEBOOK BROADCAST', state: 'offline', protocol: 'RTMPS', profile: '1080p30 h264', key: 'fb_live_2210948c290', url: 'rtmps://rtmp-api.facebook.com:443/rtmp', port: 443, bitrate: 4800, latency: '1.7s' },
];

export default function App() {
  // --- STATE ---
  const [accent, setAccent] = useState('copper');
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'builder' | 'monitor'
  const [logs, setLogs] = useState([
    { id: 1, time: '19:15:02', level: 'info', source: 'SYS', msg: 'SYCO23 v4 Broadcast Core initialized.' },
    { id: 2, time: '19:15:04', level: 'info', source: 'SYS', msg: 'Desaturated mineral plates configured. Port 1935 listening.' },
    { id: 3, time: '19:15:05', level: 'succ', source: 'INGEST', msg: 'Local Loopback program feed available: 1920x1080 @ 60fps.' },
  ]);

  // Master toggles
  const [sysPower, setSysPower] = useState(true);
  const [armedAll, setArmedAll] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [faultActive, setFaultActive] = useState(false);

  // Audio / Visual state
  const [preamp, setPreamp] = useState(65);
  const [lowpass, setLowpass] = useState(480);
  const [synthActive, setSynthActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(12); // DB dynamic meter

  // Custom Builder Variables
  const [selectedTemplate, setSelectedTemplate] = useState('totem');
  const [watermark, setWatermark] = useState('SYCO23_V4_SUB_SYSTEM');
  const [safeGrid, setSafeGrid] = useState(true);
  const [intensity, setIntensity] = useState(80);
  const [bgImageName, setBgImageName] = useState('STANDARDS_DEVIATED_01');

  // Drawer states
  const [drawerNode, setDrawerNode] = useState(null); // Node details slide-out
  const [modalMessage, setModalMessage] = useState(null); // Custom system notifications

  // Refs for Synthesizer & Canvas Visualizer
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const synthIntervalRef = useRef(null);
  const logContainerRef = useRef(null);

  const curAccent = TONE_PRESETS[accent];

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Helper: Append formatted telemetry log
  const pushLog = (level, source, msg) => {
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), time: timeStr, level, source, msg }
    ].slice(-100)); // Keep last 100 logs
  };

  // Sound Engine Setup: Industrial rhythmic bass-synth
  const toggleSynthEngine = async () => {
    if (!sysPower) {
      pushLog('err', 'CORE', 'Failed: Power core is offline.');
      return;
    }

    if (synthActive) {
      // Shutdown
      if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      setSynthActive(false);
      pushLog('warn', 'AUDIO', 'Synthesizer acoustics terminated. Defaulting to mathematical waves.');
    } else {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        
        // Filter
        const filterNode = ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(lowpass, ctx.currentTime);

        analyser.connect(filterNode);
        filterNode.connect(ctx.destination);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        setSynthActive(true);
        pushLog('succ', 'AUDIO', 'Web Audio API context initialized. Heavy warehouse sub-synth engaged.');

        // Synthesizer step sequencer
        let step = 0;
        synthIntervalRef.current = setInterval(() => {
          if (!ctx || ctx.state === 'suspended') return;

          // Master Clock Tick
          const time = ctx.currentTime;
          
          // Step 1 & 3: Deep Sub-impact (warehouse kick)
          if (step % 2 === 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.frequency.setValueAtTime(55, time); // A1 Sub-note
            osc.frequency.exponentialRampToValueAtTime(10, time + 0.35);
            
            gain.gain.setValueAtTime((preamp / 100) * 0.8, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);
            
            osc.connect(gain);
            gain.connect(analyser);
            osc.start(time);
            osc.stop(time + 0.4);
          }

          // Random Industrial Drone note (every 4th step)
          if (step % 4 === 1) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            
            // Random dark mechanical step frequencies (82Hz, 110Hz, 73Hz)
            const freqs = [82.41, 110.0, 73.42];
            const chosenFreq = freqs[Math.floor(Math.random() * freqs.length)];
            osc.frequency.setValueAtTime(chosenFreq, time);
            
            gain.gain.setValueAtTime((preamp / 100) * 0.25, time);
            gain.gain.linearRampToValueAtTime((preamp / 100) * 0.05, time + 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
            
            osc.connect(gain);
            gain.connect(analyser);
            osc.start(time);
            osc.stop(time + 1.3);
          }

          step = (step + 1) % 8;
        }, 380); // ~158 BPM layout tempo
      } catch (err) {
        pushLog('err', 'AUDIO', 'Failed to initialze audio hardware: ' + err.message);
      }
    }
  };

  // Adjust lowpass filter in real-time
  useEffect(() => {
    if (audioContextRef.current && analyserRef.current) {
      // Locate the BiquadFilterNode in the chain and adjust
      pushLog('info', 'AUDIO', `Hardware lowpass limit recalibrated: ${lowpass}Hz.`);
    }
  }, [lowpass]);

  // Master control flow: ARM
  const triggerArmState = () => {
    if (!sysPower) {
      pushLog('err', 'CORE', 'Critical Error: Cannot arm endpoints when Main Power is offline.');
      return;
    }
    if (armedAll) {
      // Disarm all
      setNodes((prev) => prev.map((n) => ({ ...n, state: 'offline' })));
      setArmedAll(false);
      pushLog('warn', 'CORE', 'Transmission relays disarmed. Active pipes closed.');
    } else {
      // Arming sequence
      setArmedAll(true);
      setNodes((prev) => prev.map((n) => ({ ...n, state: 'armed' })));
      pushLog('info', 'CORE', 'Routing matrix locked. Initializing ARM relay switches.');
      pushLog('succ', 'CORE', 'All 8 outbound physical ports armed and standing by.');
    }
  };

  // Master control flow: DEPLOY (starts live streaming)
  const triggerDeployState = () => {
    if (!sysPower || !armedAll) {
      pushLog('err', 'CORE', 'Pre-flight check failed. Core must be POWERED and ARMED to deploy.');
      return;
    }
    if (deployed) {
      // Stand down
      setDeployed(false);
      setNodes((prev) => prev.map((n) => ({ ...n, state: 'armed' })));
      pushLog('warn', 'TRANS', 'Broadcasting suspended. Relays returned to armed stance.');
    } else {
      setDeployed(true);
      pushLog('info', 'TRANS', 'Multicast broadcast signal engaged. Negotiating RTMP handshakes...');
      
      // Step-by-step connection simulated per node
      nodes.forEach((node) => {
        setTimeout(() => {
          setNodes((prev) =>
            prev.map((n) => {
              if (n.id === node.id) {
                pushLog('succ', 'RELAY', `Node [${n.name}] connected. Outbound pipeline online at ${n.bitrate}kbps.`);
                return { ...n, state: 'live' };
              }
              return n;
            })
          );
        }, 500 + Math.random() * 1200);
      });
    }
  };

  // Individual node controller
  const toggleNodeState = (nodeId) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          let nextState = 'offline';
          if (n.state === 'offline') nextState = 'armed';
          else if (n.state === 'armed') nextState = 'connecting';
          else if (n.state === 'connecting') nextState = 'live';
          else if (n.state === 'live') nextState = 'cooldown';
          else nextState = 'offline';

          pushLog('info', 'PORT', `Terminal [${n.name}] manual toggle: ${nextState.toUpperCase()}`);
          return { ...n, state: nextState };
        }
        return n;
      })
    );
  };

  // Simulate degraded fault event (Glitch Trigger)
  const triggerFaultSimulation = () => {
    if (!deployed) {
      pushLog('warn', 'DIAG', 'Cannot simulate transmission faults while stream is offline.');
      return;
    }
    setFaultActive(true);
    pushLog('err', 'SYS_FAULT', 'High packet loss detected on primary fiber trunk! Injecting jitter.');
    
    // Choose 2 random nodes to degrade/fail
    const randomIndexes = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4) + 4];
    setNodes((prev) =>
      prev.map((n, idx) => {
        if (randomIndexes.includes(idx)) {
          const newState = Math.random() > 0.5 ? 'degraded' : 'failed';
          pushLog('err', 'PORT_FAULT', `Node [${n.name}] signal compromised. Transmission State: ${newState.toUpperCase()}`);
          return { ...n, state: newState };
        }
        return n;
      })
    );

    setTimeout(() => {
      setFaultActive(false);
      pushLog('succ', 'DIAG', 'Fiber routing backup trunk engaged. Stabilizing packet streams.');
      setNodes((prev) =>
        prev.map((n) => {
          if (n.state === 'degraded' || n.state === 'failed') {
            return { ...n, state: 'live' };
          }
          return n;
        })
      );
    }, 4500);
  };

  // Video Generator Canvas Draw Loop (Procedural Brand treatment)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let angle = 0;

    const render = () => {
      // Clear/Base Mineral dark layer
      ctx.fillStyle = '#111215';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Noise texture simulation
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let i = 0; i < 800; i++) {
        const nx = Math.random() * canvas.width;
        const ny = Math.random() * canvas.height;
        ctx.fillRect(nx, ny, 1.5, 1.5);
      }

      // Analyze real frequency level or synthesize math oscillation
      let powerVal = 0;
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        powerVal = sum / bufferLength;
        // Keep DB updated
        setAudioLevel(Math.min(24, Math.round(powerVal / 8)));
      } else {
        // Mock oscillating wave representing idle audio
        powerVal = 10 + Math.sin(Date.now() / 150) * 8 + (Math.random() * 2);
        setAudioLevel(Math.min(24, Math.round(powerVal / 2)));
      }

      const pulseFactor = 1 + (powerVal / 180) * (intensity / 100);

      // Render Template Types
      if (selectedTemplate === 'totem') {
        // Symmetrical Speaker Totem Stack
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Dark iron tower skeleton
        ctx.strokeStyle = '#22252a';
        ctx.lineWidth = 12;
        ctx.strokeRect(-60, -110, 120, 220);
        
        ctx.fillStyle = '#181a1f';
        ctx.fillRect(-60, -110, 120, 220);

        // Core speaker cones pulsing
        ctx.strokeStyle = '#2a2d34';
        ctx.lineWidth = 3;
        
        // Woofer 1 (Top)
        ctx.beginPath();
        ctx.arc(0, -50, 25 * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = '#14151a';
        ctx.fill();
        ctx.stroke();
        
        // Woofer 2 (Bottom - Big sub)
        ctx.beginPath();
        ctx.arc(0, 35, 40 * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = '#0f1013';
        ctx.fill();
        ctx.stroke();

        // Totem brand eyes (Glowing selected Accent)
        ctx.fillStyle = faultActive && Math.random() > 0.5 ? '#991b1b' : curAccent.hex;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        
        // Tribal angular eyes
        ctx.beginPath();
        ctx.moveTo(-25, -5); ctx.lineTo(-10, -10); ctx.lineTo(-15, -2); ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(25, -5); ctx.lineTo(10, -10); ctx.lineTo(15, -2); ctx.closePath();
        ctx.fill();

        // Carved geometry lines radiating
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.moveTo(-200, 0); ctx.lineTo(-60, 0);
        ctx.moveTo(60, 0); ctx.lineTo(200, 0);
        ctx.moveTo(0, -150); ctx.lineTo(0, -110);
        ctx.moveTo(0, 110); ctx.lineTo(0, 150);
        ctx.stroke();

        ctx.restore();

      } else if (selectedTemplate === 'wall') {
        // Wall of Bass Cabinet Grid
        const cols = 5;
        const rows = 3;
        const colWidth = canvas.width / cols;
        const rowHeight = canvas.height / rows;

        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const cx = c * colWidth + colWidth / 2;
            const cy = r * rowHeight + rowHeight / 2;

            // Box outline
            ctx.strokeStyle = '#23252a';
            ctx.lineWidth = 2;
            ctx.strokeRect(c * colWidth + 5, r * rowHeight + 5, colWidth - 10, rowHeight - 10);
            
            // Sub cone
            ctx.beginPath();
            ctx.arc(cx, cy, (colWidth / 4) * (1 + (powerVal / 220)), 0, Math.PI * 2);
            ctx.fillStyle = '#0d0e11';
            ctx.fill();
            ctx.strokeStyle = '#32363e';
            ctx.stroke();

            // Center core
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fillStyle = curAccent.hex;
            ctx.fill();
          }
        }

      } else if (selectedTemplate === 'disk') {
        // Rotating Mayan ancient system disk
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        angle += 0.01 + (powerVal / 1200);
        ctx.rotate(angle);

        // Core stone ring
        ctx.strokeStyle = '#272a31';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 80, 0, Math.PI * 2);
        ctx.stroke();

        // Outer gear teeth
        ctx.fillStyle = '#1e2126';
        for (let t = 0; t < 12; t++) {
          ctx.rotate(Math.PI / 6);
          ctx.fillRect(-10, -100, 20, 24);
          
          // Outer tribal teeth accents
          ctx.fillStyle = curAccent.hex;
          ctx.fillRect(-3, -110, 6, 12);
          ctx.fillStyle = '#1e2126';
        }

        // Inner audio spikes radiating from symbol
        ctx.strokeStyle = curAccent.hex;
        ctx.lineWidth = 3;
        for (let s = 0; s < 24; s++) {
          ctx.rotate(Math.PI / 12);
          const spikeLen = Math.max(10, powerVal * 0.8 * (Math.random() + 0.3));
          ctx.beginPath();
          ctx.moveTo(0, -60);
          ctx.lineTo(0, -60 - spikeLen);
          ctx.stroke();
        }

        ctx.restore();

      } else if (selectedTemplate === 'crypt') {
        // Brutalist concrete crypt pillars
        ctx.fillStyle = '#181a1f';
        // Left pillar
        ctx.fillRect(10, 10, 60, canvas.height - 20);
        ctx.strokeStyle = '#2f343e';
        ctx.strokeRect(10, 10, 60, canvas.height - 20);
        
        // Right pillar
        ctx.fillRect(canvas.width - 70, 10, 60, canvas.height - 20);
        ctx.strokeRect(canvas.width - 70, 10, 60, canvas.height - 20);

        // Center vacuum tube generators
        const tubes = 3;
        const tubeSpacing = (canvas.width - 180) / (tubes + 1);
        for (let t = 1; t <= tubes; t++) {
          const tx = 90 + t * tubeSpacing;
          const ty = canvas.height / 2;

          // Glass frame
          ctx.strokeStyle = '#373a43';
          ctx.lineWidth = 2;
          ctx.strokeRect(tx - 18, ty - 60, 36, 110);
          ctx.fillStyle = '#111215';
          ctx.fillRect(tx - 18, ty - 60, 36, 110);

          // Glowing filaments matching sound level
          const filamentHeight = Math.max(5, (powerVal / 40) * 80);
          ctx.fillStyle = curAccent.hex;
          ctx.shadowBlur = 12;
          ctx.shadowColor = curAccent.hex;
          ctx.fillRect(tx - 4, ty + 40 - filamentHeight, 8, filamentHeight);
          
          ctx.shadowBlur = 0;
        }

      } else if (selectedTemplate === 'grid') {
        // Technical diagnostic radar overlay
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        // Grid lines
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Circular sweep radar
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        angle += 0.02;
        ctx.rotate(angle);
        
        const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.8, `${curAccent.hex}15`);
        gradient.addColorStop(1, `${curAccent.hex}40`);
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.arc(0, 0, 120, 0, Math.PI / 2);
        ctx.lineTo(0,0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Rolling vertical bars
        ctx.fillStyle = `${curAccent.hex}a0`;
        for (let b = 10; b < canvas.width; b += 15) {
          const barH = 5 + Math.sin(b * 0.05 + Date.now() / 200) * 15 * pulseFactor;
          ctx.fillRect(b, canvas.height - barH - 10, 10, barH);
        }
      }

      // Safety grid alignment stencils & labels (if active)
      if (safeGrid) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        // Action safe (10%)
        ctx.strokeRect(canvas.width * 0.05, canvas.height * 0.05, canvas.width * 0.9, canvas.height * 0.9);
        // Crosshair center
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 10, canvas.height / 2); ctx.lineTo(canvas.width / 2 + 10, canvas.height / 2);
        ctx.moveTo(canvas.width / 2, canvas.height / 2 - 10); ctx.lineTo(canvas.width / 2, canvas.height / 2 + 10);
        ctx.stroke();

        // Telemetry Overlay HUD
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = '7px monospace';
        ctx.fillText(`SYS: ARMED // ${selectedTemplate.toUpperCase()}_MODE_A`, 28, 25);
        ctx.fillText(`SRC: FEED_LOOPBACK_1080P60`, 28, 35);
        ctx.fillText(`INTENSITY: ${intensity}% // COILS: ACTIVE`, 28, 45);

        // Watermark text lower bottom left
        ctx.fillText(watermark, 28, canvas.height - 20);
        ctx.fillText('SYCO23 UNDERGROUND TRANSMISSION SURF', canvas.width - 200, canvas.height - 20);
      }

      // Live indicator pulsing red if deploying
      if (deployed) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(canvas.width - 25, 25, 5 + Math.sin(Date.now() / 100) * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('LIVE PROGRAM', canvas.width - 98, 28);
      } else {
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.arc(canvas.width - 25, 25, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a8a29e';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('STANDBY', canvas.width - 75, 28);
      }

      // CRT Scanline / Glitch effect overlay if Fault Active
      if (faultActive && Math.random() > 0.4) {
        ctx.fillStyle = 'rgba(153, 27, 27, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Random horizontal glitch slices
        ctx.fillStyle = '#111215';
        for (let g = 0; g < 5; g++) {
          const sliceY = Math.random() * canvas.height;
          const sliceH = 8 + Math.random() * 20;
          ctx.drawImage(canvas, 0, sliceY, canvas.width, sliceH, Math.random() * 20 - 10, sliceY, canvas.width, sliceH);
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, Math.random() * canvas.height);
        ctx.lineTo(canvas.width, Math.random() * canvas.height);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedTemplate, watermark, safeGrid, intensity, bgImageName, accent, deployed, faultActive]);

  // Utility Clipboard Copy with fallback
  const handleCopyToClipboard = (textToCopy, platform) => {
    // Create an input off-screen, select it, copy it
    const input = document.createElement('input');
    input.value = textToCopy;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      setModalMessage({
        title: 'TELEMETRY EXPORTED',
        body: `Ingest credential for [${platform}] has been copied to operator clipboard.`
      });
      pushLog('succ', 'CLI', `Secured key for ${platform} copied to clipboard.`);
    } catch (err) {
      pushLog('err', 'CLI', 'Clipboard copy failed.');
    }
    document.body.removeChild(input);
  };

  // Switch Master Power
  const togglePower = () => {
    if (sysPower) {
      // Shutdown whole machine
      setSysPower(false);
      setArmedAll(false);
      setDeployed(false);
      if (synthActive) toggleSynthEngine();
      setNodes((prev) => prev.map((n) => ({ ...n, state: 'offline' })));
      pushLog('warn', 'SYS', 'Main broadcast power bus terminated. All outputs dead.');
    } else {
      setSysPower(true);
      pushLog('succ', 'SYS', 'Primary power bus initialized. High-voltage capacitors charged.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0e10] text-[#cacdd2] font-sans antialiased flex flex-col selection:bg-stone-800">
      
      {/* HEADER BAR */}
      <header className="bg-[#111215] border-b border-stone-800 px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            {/* Symmetrical tribal logo representation */}
            <div className="w-8 h-8 bg-stone-900 border border-stone-700 flex items-center justify-center relative overflow-hidden">
              <span className={`text-sm font-black font-mono tracking-tighter ${sysPower ? curAccent.text : 'text-stone-600'}`}>SY</span>
              <div className={`absolute bottom-0 inset-x-0 h-1 ${sysPower ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest font-mono text-white">SYCO23 <span className="text-[10px] text-stone-500 font-normal">v4_MCAST_CTL</span></h1>
              <p className="text-[9px] text-stone-500 uppercase font-mono">Underground Broadcast Grid Core</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#171a1f] px-2.5 py-1 border border-stone-800/80 rounded-sm">
            <span className={`w-2 h-2 rounded-full ${sysPower ? 'bg-emerald-500 animate-pulse' : 'bg-stone-700'}`}></span>
            <span className="text-[10px] font-mono uppercase text-stone-400">
              {sysPower ? 'SYS_ONLINE' : 'SYS_SHUTDOWN'}
            </span>
          </div>
        </div>

        {/* ACCENT ROTATOR / THEME HARMONIZER */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-stone-500 uppercase">Acoustic Theme:</span>
            <div className="flex items-center gap-1 bg-[#15171b] p-1 border border-stone-800 rounded">
              {Object.keys(TONE_PRESETS).map((presetKey) => {
                const isSelected = accent === presetKey;
                return (
                  <button
                    key={presetKey}
                    onClick={() => {
                      setAccent(presetKey);
                      pushLog('info', 'UI', `Harmonizer shifted accent profile to: ${TONE_PRESETS[presetKey].name}`);
                    }}
                    title={TONE_PRESETS[presetKey].name}
                    className={`w-3.5 h-3.5 rounded-sm transition-transform duration-100 ${isSelected ? 'scale-110 border border-white' : 'opacity-40 hover:opacity-100'}`}
                    style={{ backgroundColor: TONE_PRESETS[presetKey].hex }}
                  />
                );
              })}
            </div>
          </div>

          <div className="text-[10px] font-mono text-stone-500 text-right hidden lg:block">
            <span>OPERATOR: #092_WHS</span><br />
            <span>LOC: DRESDEN_SAX_DE</span>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE WRAPPER */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT COLUMN: SYSTEM CONTROL SPINE */}
        <div className="w-full lg:w-[320px] bg-[#111215] border-r border-stone-800 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          
          {/* Module 1: Master Hardware Toggles */}
          <div className="relative bg-[#15171b] border border-stone-800/85 p-3.5 rounded-sm shadow-inner">
            <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2">
              <span className="text-xs font-mono font-bold tracking-wider text-stone-400">01 // CORE POWER</span>
              <span className="text-[9px] font-mono text-stone-600">PLATE 4B-9</span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Main power rocker */}
              <div className="flex items-center justify-between bg-[#1b1e24] p-2 border border-stone-800/80 rounded">
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-stone-300">CORE HIGH PRESSURE BUS</div>
                  <div className="text-[9px] text-stone-500">Energize main broadcast rails</div>
                </div>
                <button
                  onClick={togglePower}
                  className={`relative w-11 h-6 transition-colors duration-150 rounded-sm p-0.5 focus:outline-none ${sysPower ? 'bg-stone-700' : 'bg-rose-950/40 border border-rose-800/60'}`}
                >
                  <div className={`w-4 h-5 rounded-xs transition-transform duration-150 shadow-md ${sysPower ? 'translate-x-6 bg-emerald-500' : 'translate-x-0 bg-stone-600'}`}></div>
                </button>
              </div>

              {/* Sequential Relays */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                {/* Arm outbound */}
                <button
                  onClick={triggerArmState}
                  disabled={!sysPower}
                  className={`flex flex-col items-start p-2 border font-mono text-left transition-all ${
                    !sysPower 
                      ? 'opacity-30 cursor-not-allowed bg-stone-900 border-stone-800' 
                      : armedAll 
                        ? `${curAccent.border} ${curAccent.bg} text-white` 
                        : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <span className="text-[8px] text-stone-500">RELAY SWITCH [02]</span>
                  <span className="text-xs font-bold mt-1">ARM MATRIX</span>
                  <span className="text-[9px] mt-1 text-stone-400">{armedAll ? 'STATE: ARMED_ON' : 'STATE: COLD'}</span>
                </button>

                {/* Deploy broadcast */}
                <button
                  onClick={triggerDeployState}
                  disabled={!sysPower || !armedAll}
                  className={`flex flex-col items-start p-2 border font-mono text-left transition-all ${
                    !sysPower || !armedAll
                      ? 'opacity-30 cursor-not-allowed bg-stone-900 border-stone-800'
                      : deployed
                        ? 'bg-rose-950/40 border-rose-800 text-rose-500 shadow-lg shadow-rose-950/20'
                        : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <span className="text-[8px] text-stone-500">RELAY SWITCH [03]</span>
                  <span className="text-xs font-bold mt-1">DEPLOY OUT</span>
                  <span className="text-[9px] mt-1 text-stone-400">{deployed ? 'STATE: ON_AIR' : 'STATE: COLD'}</span>
                </button>
              </div>

              {/* Critical Abort Red Switch */}
              <button
                onClick={() => {
                  if (deployed || armedAll) {
                    setDeployed(false);
                    setArmedAll(false);
                    setNodes((prev) => prev.map((n) => ({ ...n, state: 'offline' })));
                    pushLog('err', 'ABORT', 'EMERGENCY COIL ABORT TRIGGERED BY OPERATOR. SIGNAL DECAPITATED!');
                  }
                }}
                disabled={!sysPower || (!deployed && !armedAll)}
                className={`w-full py-2 border font-mono text-center font-black tracking-widest text-xs transition-colors uppercase ${
                  (!deployed && !armedAll) || !sysPower
                    ? 'opacity-25 bg-stone-900 border-stone-800 text-stone-600 cursor-not-allowed'
                    : 'bg-rose-900 border-rose-700 text-white hover:bg-rose-850 active:translate-y-0.5'
                }`}
              >
                !!! COIL_ABORT !!!
              </button>
            </div>
          </div>

          {/* Module 2: Ingest Signal Meter & Levels */}
          <div className="relative bg-[#15171b] border border-stone-800/85 p-3.5 rounded-sm flex-1 flex flex-col gap-3 min-h-[220px]">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="text-xs font-mono font-bold tracking-wider text-stone-400">02 // SIGNAL INGEST</span>
              <span className="text-[9px] font-mono text-stone-600">INPUT SOURCE</span>
            </div>

            {/* Ingest Feed Meta */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#1b1e24] p-2 border border-stone-800/80">
              <div>
                <span className="text-stone-500">VIDEO FEED:</span>
                <p className="text-stone-300 font-bold">1080p60 h264</p>
              </div>
              <div>
                <span className="text-stone-500">INGEST_RATE:</span>
                <p className="text-stone-300 font-bold">6,530 kbps</p>
              </div>
              <div className="col-span-2 pt-1 border-t border-stone-800/50">
                <span className="text-stone-500">AUDIO INGEST:</span>
                <p className="text-stone-300 font-bold">48kHz L-PCM Loopback</p>
              </div>
            </div>

            {/* Live DB decibel scale bar */}
            <div className="flex-1 flex flex-col justify-end gap-1.5 font-mono">
              <div className="flex justify-between text-[9px] text-stone-500">
                <span>PEAK INGEST LVL</span>
                <span>{audioLevel * 3} DB</span>
              </div>
              
              <div className="h-6 bg-stone-950 p-0.5 border border-stone-800 flex items-center gap-0.5 overflow-hidden">
                {Array.from({ length: 24 }).map((_, idx) => {
                  const isActive = idx <= audioLevel;
                  let col = 'bg-teal-700';
                  if (idx > 16) col = 'bg-yellow-600';
                  if (idx > 20) col = 'bg-rose-700';
                  return (
                    <div
                      key={idx}
                      className={`flex-1 h-full rounded-xs transition-opacity duration-75 ${isActive ? col : 'bg-stone-900/40'}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Audio Synth controls (Procedural synthesis) */}
            <div className="bg-[#1b1e24] p-2.5 border border-stone-800/80 rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">Acoustic Generator</span>
                <button
                  onClick={toggleSynthEngine}
                  disabled={!sysPower}
                  className={`text-[9px] px-2 py-0.5 font-mono border rounded ${
                    !sysPower 
                      ? 'bg-stone-900 text-stone-700 border-stone-800' 
                      : synthActive 
                        ? `${curAccent.accentClass} font-bold` 
                        : 'bg-stone-950 text-stone-500 border-stone-800 hover:text-stone-300'
                  }`}
                >
                  {synthActive ? 'LOCAL_SYNTH_ON' : 'ENGAGE_SYNTH'}
                </button>
              </div>

              {/* Knob Simulators */}
              <div className="space-y-2 mt-2">
                <div>
                  <div className="flex justify-between text-[8px] font-mono text-stone-500">
                    <span>PRE-AMP BOOST</span>
                    <span>{preamp} dB</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={preamp}
                    onChange={(e) => setPreamp(Number(e.target.value))}
                    disabled={!sysPower}
                    className="w-full accent-stone-400 bg-stone-900 h-1 rounded cursor-pointer mt-0.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[8px] font-mono text-stone-500">
                    <span>LOWPASS COIL LIMIT</span>
                    <span>{lowpass} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="1500"
                    step="10"
                    value={lowpass}
                    onChange={(e) => setLowpass(Number(e.target.value))}
                    disabled={!sysPower}
                    className="w-full accent-stone-400 bg-stone-900 h-1 rounded cursor-pointer mt-0.5"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Module 3: Structural Grill / Vent Aesthetic */}
          <div className="bg-[#121316] border border-stone-900 p-2 flex flex-col gap-1 rounded-sm select-none">
            <span className="text-[7px] font-mono text-stone-600 text-center uppercase tracking-widest">COOLING GRATING // SYCO TRANSMITTER SUB SYSTEM</span>
            <div className="flex justify-center gap-1.5 py-1">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="w-1.5 h-3 bg-stone-950 rounded-xs border-r border-stone-800/50 flex-shrink-0" />
              ))}
            </div>
          </div>

        </div>

        {/* CENTER COLUMN: MAIN OPERATION CANVAS & VIEWS */}
        <div className="flex-1 bg-[#131518] p-4 flex flex-col gap-4 overflow-y-auto">
          
          {/* MAIN TABS RAIL */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-px">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider uppercase border-t-2 border-x transition-all ${
                  activeTab === 'matrix'
                    ? `bg-[#131518] text-white ${curAccent.border.replace('border-', 'border-t-')} border-x-stone-800`
                    : 'bg-[#101214]/60 text-stone-500 border-transparent hover:text-stone-300'
                }`}
              >
                OUTBOUND DESTINATION MATRIX
              </button>
              <button
                onClick={() => setActiveTab('builder')}
                className={`px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider uppercase border-t-2 border-x transition-all ${
                  activeTab === 'builder'
                    ? `bg-[#131518] text-white ${curAccent.border.replace('border-', 'border-t-')} border-x-stone-800`
                    : 'bg-[#101214]/60 text-stone-500 border-transparent hover:text-stone-300'
                }`}
              >
                TEMPLATE DESIGN & BUILDER
              </button>
              <button
                onClick={() => setActiveTab('monitor')}
                className={`px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider uppercase border-t-2 border-x transition-all ${
                  activeTab === 'monitor'
                    ? `bg-[#131518] text-white ${curAccent.border.replace('border-', 'border-t-')} border-x-stone-800`
                    : 'bg-[#101214]/60 text-stone-500 border-transparent hover:text-stone-300'
                }`}
              >
                MONITOR STATION
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[9px] text-stone-500 bg-[#16181c] px-2 py-1 border border-stone-800">
              <span className="text-stone-600">ENCODER STATE:</span>
              <span className="font-bold text-stone-300">FFMPEG_X264_AAC</span>
            </div>
          </div>

          {/* VIEW 1: DESTINATION MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#171a1f] p-3 border border-stone-800 gap-2">
                <div>
                  <h2 className="text-xs uppercase font-mono font-bold tracking-wide text-stone-200">Outbound Transmission Relays</h2>
                  <p className="text-[10px] text-stone-500 font-mono">Independent RTMP-first nodes feeding global public infrastructure.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={triggerFaultSimulation}
                    disabled={!deployed}
                    className={`text-[9px] font-mono font-bold px-3 py-1 border rounded uppercase transition-colors ${
                      !deployed
                        ? 'bg-stone-900 border-stone-800 text-stone-600 cursor-not-allowed'
                        : 'bg-rose-950/30 border-rose-800 text-rose-500 hover:bg-rose-900/40'
                    }`}
                  >
                    ⚡ Simulate Trunk Glitch
                  </button>
                </div>
              </div>

              {/* Nodes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {nodes.map((node) => {
                  // Style badge based on node state
                  let stateBg = 'bg-stone-950 text-stone-500 border-stone-800';
                  let stateLabel = 'OFFLINE';
                  let statusGlow = 'bg-stone-700';

                  if (node.state === 'armed') {
                    stateBg = 'bg-amber-950/40 text-amber-500 border-amber-800';
                    stateLabel = 'ARMED';
                    statusGlow = 'bg-amber-500 animate-pulse';
                  } else if (node.state === 'connecting') {
                    stateBg = 'bg-teal-950/40 text-teal-400 border-teal-800';
                    stateLabel = 'CONNECTING';
                    statusGlow = 'bg-teal-400 animate-ping';
                  } else if (node.state === 'live') {
                    stateBg = `bg-stone-900 text-[#0f766e] border-teal-800`;
                    stateLabel = 'LIVE_STABLE';
                    statusGlow = 'bg-emerald-400';
                  } else if (node.state === 'degraded') {
                    stateBg = 'bg-rose-950/30 text-rose-500 border-rose-800/80 animate-pulse';
                    stateLabel = 'DEGRADED';
                    statusGlow = 'bg-rose-500 animate-ping';
                  } else if (node.state === 'failed') {
                    stateBg = 'bg-rose-950 text-rose-600 border-rose-900 font-black';
                    stateLabel = 'RELAY_FAILED';
                    statusGlow = 'bg-rose-700';
                  } else if (node.state === 'cooldown') {
                    stateBg = 'bg-stone-900 text-stone-400 border-stone-700';
                    stateLabel = 'COOLDOWN';
                    statusGlow = 'bg-yellow-600';
                  }

                  return (
                    <div
                      key={node.id}
                      className="bg-[#15171b] border border-stone-800/80 p-3 flex flex-col justify-between gap-3 relative rounded-sm hover:border-stone-700 transition-colors"
                    >
                      {/* Anchor corner bolts */}
                      <span className="absolute top-1 left-1 text-[6px] text-stone-700 select-none">+</span>
                      <span className="absolute top-1 right-1 text-[6px] text-stone-700 select-none">+</span>
                      
                      {/* Node Header */}
                      <div className="space-y-1 border-b border-stone-800/60 pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold tracking-wider text-white truncate">{node.name}</span>
                          <span className="text-[8px] font-mono bg-[#1c1e24] px-1 text-stone-500 border border-stone-800">{node.protocol}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono text-stone-500">
                          <span>Profile: {node.profile}</span>
                          <span>Port: {node.port}</span>
                        </div>
                      </div>

                      {/* Health telemetry values */}
                      <div className="bg-stone-950/50 p-2 border border-stone-800/60 rounded space-y-1 font-mono text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-stone-500">STATUS BADGE:</span>
                          <div className={`flex items-center gap-1.5 px-1.5 py-px border text-[8px] font-bold ${stateBg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusGlow}`}></span>
                            {stateLabel}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">TARGET BANDWIDTH:</span>
                          <span className="text-stone-300 font-bold">{node.state === 'live' || node.state === 'degraded' ? `${node.bitrate} kb/s` : '0 kb/s'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">DELAY TO EDGE:</span>
                          <span className="text-stone-400">{node.latency}</span>
                        </div>
                      </div>

                      {/* Manual Action Grid */}
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                        <button
                          onClick={() => toggleNodeState(node.id)}
                          disabled={!sysPower}
                          className="py-1 bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:border-stone-700 rounded-sm font-bold uppercase"
                        >
                          Manual Switch
                        </button>
                        <button
                          onClick={() => {
                            setDrawerNode(node);
                            pushLog('info', 'DIAG', `Secured diagnostic drawer opened for Node: ${node.name}`);
                          }}
                          className="py-1 bg-stone-900 border border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-700 rounded-sm uppercase"
                        >
                          Inspect Kit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: TEMPLATE DESIGN & BUILDER */}
          {activeTab === 'builder' && (
            <div className="space-y-4">
              
              {/* Informational plate */}
              <div className="bg-[#171a1f] p-3 border border-stone-800">
                <h2 className="text-xs uppercase font-mono font-bold tracking-wide text-stone-200">Program Visualizer Configurator</h2>
                <p className="text-[10px] text-stone-500 font-mono">Design layout templates loaded dynamically onto the master program visualizer engine.</p>
              </div>

              {/* Template grid selector */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {TEMPLATE_PRESETS.map((t) => {
                  const isSelected = selectedTemplate === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTemplate(t.id);
                        pushLog('info', 'ENGINE', `Program layout shifted to [${t.name}]. Resynthesizing frame matrix.`);
                      }}
                      className={`text-left p-3 border rounded-sm relative transition-all flex flex-col justify-between min-h-[100px] ${
                        isSelected 
                          ? `${curAccent.border} ${curAccent.bg} text-white` 
                          : 'bg-[#15171b] border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {/* Check dot marker */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-mono uppercase text-stone-500">Preset Slot</span>
                        <div className={`w-2 h-2 rounded-full ${isSelected ? curAccent.text.replace('text-', 'bg-') : 'bg-stone-800'}`}></div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-mono font-bold tracking-wider leading-tight text-stone-200">{t.name}</h4>
                        <p className="text-[9px] text-stone-500 font-mono mt-1 leading-normal">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Builder Hardware sliders & Text parameters */}
              <div className="bg-[#15171b] border border-stone-800 p-4">
                <div className="border-b border-stone-800 pb-3 mb-4">
                  <h3 className="text-xs font-mono font-bold tracking-widest text-stone-300">LAYOUT HARDWARE TUNER</h3>
                  <p className="text-[9px] text-stone-500 font-mono">Direct pixel manipulation controls styled for field transmission environments.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Slider parameters */}
                  <div className="space-y-4 font-mono">
                    <div>
                      <div className="flex justify-between text-[10px] text-stone-400">
                        <span>PULSE INTENSITY RESPONSIVENESS</span>
                        <span className="font-bold text-white">{intensity}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="120"
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        className="w-full accent-stone-300 bg-stone-900 h-1.5 rounded cursor-pointer mt-1"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 bg-stone-950/40 border border-stone-800 rounded">
                      <div>
                        <span className="text-[10px] text-stone-400">SAFETY ALIGNMENT GRID</span>
                        <p className="text-[8px] text-stone-500">Superimpose action-safe guides</p>
                      </div>
                      <button
                        onClick={() => setSafeGrid(!safeGrid)}
                        className={`px-3 py-1 text-[9px] font-bold border rounded transition-colors ${
                          safeGrid 
                            ? `${curAccent.accentClass}` 
                            : 'bg-stone-900 border-stone-800 text-stone-500'
                        }`}
                      >
                        {safeGrid ? 'GRID_ON' : 'GRID_OFF'}
                      </button>
                    </div>
                  </div>

                  {/* Text inputs (system identifiers) */}
                  <div className="space-y-3 font-mono">
                    <div>
                      <span className="text-[9px] text-stone-500 uppercase">PROGRAM METADATA WATERMARK:</span>
                      <input
                        type="text"
                        value={watermark}
                        onChange={(e) => setWatermark(e.target.value.toUpperCase())}
                        placeholder="ENTER WATERMARK LABEL"
                        maxLength={24}
                        className="w-full bg-[#1b1e24] text-white border border-stone-800 focus:border-stone-600 outline-none px-3 py-1.5 text-xs tracking-wider rounded-sm mt-1"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] text-stone-500 uppercase">INTERNAL BACKGROUND TEMPLATE SELECT:</span>
                      <select
                        value={bgImageName}
                        onChange={(e) => {
                          setBgImageName(e.target.value);
                          pushLog('info', 'ENGINE', `Sub-plate texture map re-anchored to: ${e.target.value}`);
                        }}
                        className="w-full bg-[#1b1e24] text-white border border-stone-800 focus:border-stone-600 outline-none px-3 py-1.5 text-xs tracking-wider rounded-sm mt-1"
                      >
                        <option value="STANDARDS_DEVIATED_01">DEVIATED WAREHOUSE MAP 01</option>
                        <option value="SYCO_MAINFRAME_09">SYCO MAINFRAME BACKING 09</option>
                        <option value="CUB_ROUTING_X">CUB ROTATIONAL PATTERN X</option>
                        <option value="EMPTY_MINERAL_DESAT">EMPTY MINERAL DESATURATION</option>
                      </select>
                    </div>
                  </div>

                  {/* Visual treating preview representation */}
                  <div className="border border-stone-800 bg-[#101214] p-3 flex flex-col justify-between font-mono">
                    <div>
                      <span className="text-[8px] text-stone-600">PRE-RENDERING SUMMARY</span>
                      <div className="mt-1 text-xs text-stone-300 font-bold tracking-wider">
                        {selectedTemplate.toUpperCase()} + {bgImageName}
                      </div>
                      <p className="text-[9px] text-stone-500 mt-2 leading-relaxed">
                        Composite frame routes active audio amplitudes through dynamic matrices to create highly responsive tribal visualizers.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        pushLog('succ', 'BUILDER', 'Visual render settings locked into local transmission memory.');
                        setActiveTab('monitor');
                      }}
                      className={`w-full py-1.5 text-[10px] border font-bold uppercase transition-colors ${curAccent.accentClass}`}
                    >
                      Commit Layout Configuration
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* VIEW 3: MONITOR STATION */}
          {activeTab === 'monitor' && (
            <div className="space-y-4">
              <div className="bg-[#171a1f] p-3 border border-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-xs uppercase font-mono font-bold tracking-wide text-stone-200">Widescreen Master Program Feed</h2>
                  <p className="text-[10px] text-stone-500 font-mono">Built-in frontend video preview representing active broadcast feed output.</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-stone-500 bg-stone-950 px-2 py-1 border border-stone-800">
                    <span>GRID LINES:</span>
                    <button
                      onClick={() => setSafeGrid(!safeGrid)}
                      className={`font-bold uppercase ${safeGrid ? curAccent.text : 'text-stone-600'}`}
                    >
                      {safeGrid ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Minimal Monitor Window with thick dark borders */}
              <div className="bg-stone-950 border-[6px] border-[#181a1f] p-1 shadow-2xl relative group max-w-4xl mx-auto w-full">
                
                {/* Micro-detail carving markings */}
                <div className="absolute top-[-5px] left-4 text-[7px] text-stone-600 font-mono select-none bg-[#181a1f] px-1">STENCIL_A99</div>
                <div className="absolute bottom-[-5px] right-4 text-[7px] text-stone-600 font-mono select-none bg-[#181a1f] px-1">SYS_ENG_OK</div>

                <div className="relative aspect-video bg-[#0c0d10] overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={854}
                    height={480}
                    className="w-full h-full block object-contain"
                  />
                </div>
              </div>

              {/* Program metrics dashboard under player */}
              <div className="bg-[#15171b] border border-stone-800 p-3.5 rounded-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-[10px]">
                  <div>
                    <span className="text-stone-500 uppercase block">VIDEO STREAM QUALITY:</span>
                    <span className="text-stone-300 font-bold block mt-1">1080p @ 60.00 fps</span>
                    <span className="text-stone-600 text-[9px] block">AVC h.264 High@L4.2</span>
                  </div>
                  <div>
                    <span className="text-stone-500 uppercase block">AUDIO SPECS:</span>
                    <span className="text-stone-300 font-bold block mt-1">AAC Stereo 48.0 kHz</span>
                    <span className="text-stone-600 text-[9px] block">Bitrate: 256 kb/s</span>
                  </div>
                  <div>
                    <span className="text-stone-500 uppercase block">FRAME STATISTICS:</span>
                    <span className="text-stone-300 font-bold block mt-1">DR: 0 // DP: 0 // QU: 100%</span>
                    <span className="text-stone-600 text-[9px] block">Jitter rate: 0.12 ms</span>
                  </div>
                  <div>
                    <span className="text-stone-500 uppercase block">ENCODER COMPRESSION:</span>
                    <span className="text-stone-300 font-bold block mt-1">CBR Mode / 1-Pass Preset</span>
                    <span className="text-[#0f766e] text-[9px] font-bold block uppercase">Hardware Accel: Intel QSV</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: TELEMETRY LOG RAIL & OPERATOR DRAWER */}
        <div className="w-full lg:w-[320px] bg-[#111215] border-t lg:border-t-0 lg:border-l border-stone-800 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <span className="text-xs font-mono font-bold tracking-wider text-stone-400">03 // REAL-TIME LOGS</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setLogs([]);
                  pushLog('info', 'LOGS', 'Telemetry feed wiped by operator.');
                }}
                className="text-[8px] font-mono px-1.5 py-px border border-stone-800 text-stone-500 hover:text-stone-300"
              >
                CLEAR
              </button>
            </div>
          </div>

          {/* COLORIZED LOG PANEL */}
          <div className="flex-1 bg-stone-950 border border-stone-900 rounded-sm p-2 flex flex-col min-h-[220px]">
            <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto font-mono text-[10px] leading-tight space-y-1.5 pr-1 max-h-[380px] lg:max-h-none scrollbar-thin scrollbar-thumb-stone-800"
            >
              {logs.map((log) => {
                let logCol = 'text-stone-400';
                if (log.level === 'warn') logCol = 'text-amber-500';
                if (log.level === 'err') logCol = 'text-rose-500 font-bold';
                if (log.level === 'succ') logCol = 'text-teal-400';
                if (log.level === 'debg') logCol = 'text-stone-600';

                return (
                  <div key={log.id} className="border-b border-stone-950 pb-1">
                    <span className="text-stone-600 font-light mr-1">[{log.time}]</span>
                    <span className="text-stone-500 text-[9px] bg-[#16181c] px-1 rounded-xs border border-stone-900 mr-1">{log.source}</span>
                    <span className={logCol}>{log.msg}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-stone-900 pt-2 mt-2 flex justify-between items-center text-[8px] font-mono text-stone-600">
              <span>STATUS: CAP_OK</span>
              <span>FILTER: REAL_TIME</span>
            </div>
          </div>

          {/* Quick instructions/notes card */}
          <div className="bg-[#15171b] border border-stone-800/80 p-3 font-mono text-[10px] space-y-2">
            <span className="text-stone-400 font-bold block uppercase tracking-wider">Operational Notes:</span>
            <p className="text-stone-500 leading-normal">
              Ensure you copy the RTMP stream key and ingest address to target servers before deploying transmission.
            </p>
            <div className="text-stone-600 text-[9px] pt-1.5 border-t border-stone-850">
              STRICT PROHIBITION: Do not use consumer overlays. Keep visualizer parameters heavy, industrial, and centered on subwoofer performance.
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER STATS PANEL */}
      <footer className="bg-[#111215] border-t border-stone-800 py-1.5 px-4 flex flex-col sm:flex-row items-center justify-between text-[9.5px] font-mono text-stone-500 shrink-0 gap-2">
        <div className="flex items-center gap-4">
          <span>TX_SYS: v4.882</span>
          <span>COILS: READY</span>
          <span>TOTAL DEPLOYED TARGETS: {nodes.filter(n => n.state === 'live').length} / 8</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>RTMP CONCURRENT ROUTING ACTIVE</span>
        </div>
      </footer>

      {/* DRAWER SLIDE-OVER: TRANSMISSION KIT DETAILS */}
      {drawerNode && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs font-mono">
          <div className="w-full max-w-md bg-[#131518] h-full border-l border-stone-800 p-6 flex flex-col justify-between shadow-2xl relative">
            
            {/* Corner screws */}
            <span className="absolute top-2 left-2 text-stone-700 font-bold">+</span>
            <span className="absolute bottom-2 left-2 text-stone-700 font-bold">+</span>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h3 className="text-xs uppercase font-bold tracking-widest text-stone-500">Node Ingest Diagnostics</h3>
                  <h2 className="text-sm font-bold text-white mt-0.5">{drawerNode.name}</h2>
                </div>
                <button
                  onClick={() => setDrawerNode(null)}
                  className="w-6 h-6 border border-stone-800 bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Ingest fields plates */}
              <div className="space-y-4">
                <div className="bg-[#181a1f] p-3.5 border border-stone-850 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-stone-500 uppercase font-bold">Protocol Type</span>
                    <span className="text-[10px] text-teal-400 font-bold">{drawerNode.protocol}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-stone-500 uppercase font-bold">Port Configuration</span>
                    <span className="text-stone-300">{drawerNode.port}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-stone-500 uppercase font-bold">Encoding Profile</span>
                    <span className="text-stone-300">{drawerNode.profile}</span>
                  </div>
                </div>

                {/* RTMP Server URL copy row */}
                <div className="space-y-1">
                  <span className="text-[10px] text-stone-500 font-bold block uppercase">RTMP INGEST ADDR:</span>
                  <div className="flex bg-[#1b1e24] border border-stone-800 overflow-hidden rounded-xs">
                    <input
                      type="text"
                      readOnly
                      value={drawerNode.url}
                      className="flex-1 bg-transparent px-3 py-1.5 text-[11px] text-stone-300 outline-none truncate font-bold"
                    />
                    <button
                      onClick={() => handleCopyToClipboard(drawerNode.url, drawerNode.name)}
                      className="px-3 bg-stone-900 border-l border-stone-800 text-stone-400 hover:text-white text-[10px]"
                    >
                      COPY
                    </button>
                  </div>
                </div>

                {/* Secure Stream Key copy row */}
                <div className="space-y-1">
                  <span className="text-[10px] text-stone-500 font-bold block uppercase">SECURE TRANSMISSION KEY:</span>
                  <div className="flex bg-[#1b1e24] border border-stone-800 overflow-hidden rounded-xs">
                    <input
                      type="password"
                      readOnly
                      value={drawerNode.key}
                      className="flex-1 bg-transparent px-3 py-1.5 text-[11px] text-stone-300 outline-none truncate font-bold"
                    />
                    <button
                      onClick={() => handleCopyToClipboard(drawerNode.key, drawerNode.name)}
                      className="px-3 bg-stone-900 border-l border-stone-800 text-stone-400 hover:text-white text-[10px]"
                    >
                      COPY
                    </button>
                  </div>
                </div>

                {/* Simulated Diagnostic logs for this specific node */}
                <div className="bg-stone-950/70 p-3 border border-stone-900 rounded space-y-2">
                  <span className="text-[9px] text-stone-500 block uppercase font-bold">Active Telemetry Readout:</span>
                  <div className="space-y-1 text-[9.5px]">
                    <div className="flex justify-between">
                      <span className="text-stone-600">Current Jitter:</span>
                      <span className="text-stone-400">0.08ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Keyframe Interval:</span>
                      <span className="text-stone-400">2.00s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Active Buffer:</span>
                      <span className="text-stone-400">128kb</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  toggleNodeState(drawerNode.id);
                  setDrawerNode(null);
                }}
                className={`w-full py-2.5 text-xs font-bold uppercase border tracking-wider transition-colors ${curAccent.accentClass}`}
              >
                Change Relay Output State
              </button>
              
              <button
                onClick={() => setDrawerNode(null)}
                className="w-full py-2 bg-stone-900 border border-stone-800 text-stone-500 hover:text-stone-300 text-xs font-bold uppercase tracking-wider"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SYSTEM CONFIRMATION MODAL */}
      {modalMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs font-mono p-4">
          <div className="bg-[#15171b] border border-stone-700 w-full max-w-sm p-5 relative rounded-sm shadow-2xl">
            {/* Corners */}
            <span className="absolute top-1 left-1 text-[7px] text-stone-600">+</span>
            <span className="absolute top-1 right-1 text-[7px] text-stone-600">+</span>
            <span className="absolute bottom-1 left-1 text-[7px] text-stone-600">+</span>
            <span className="absolute bottom-1 right-1 text-[7px] text-stone-600">+</span>
            
            <h3 className="text-xs font-black tracking-widest text-emerald-500 uppercase border-b border-stone-800 pb-2 mb-3">
              🛰️ {modalMessage.title}
            </h3>
            
            <p className="text-[11px] text-stone-300 leading-relaxed mb-5">
              {modalMessage.body}
            </p>

            <button
              onClick={() => setModalMessage(null)}
              className={`w-full py-1.5 text-[10px] border font-bold uppercase transition-colors ${curAccent.accentClass}`}
            >
              Acknowledge Code Readout
            </button>
          </div>
        </div>
      )}

    </div>
  );
}