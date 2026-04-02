import React, { useState, useEffect, useRef } from 'react';
import './SpeechToText.css';

const SpeechToText = ({ isOpen, onClose, onTranscript }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [language, setLanguage] = useState('vi-VN'); 
    const recognitionRef = useRef(null);
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (!isListening || !canvasRef.current) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            stopAudio();
            return;
        }

        setupAudio();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bars = 44; 
        const barWidth = 1;
        const gap = 1;
        let data = Array(bars).fill(0.2);

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let volume = 0;
            if (analyserRef.current) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                volume = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
            }

            const isActuallySpeaking = volume > 8;

            for (let i = 0; i < bars; i++) {
                if (isActuallySpeaking) {
                    const target = 0.2 + (volume / 50) * Math.random() * 0.8;
                    data[i] = data[i] * 0.7 + target * 0.3;
                    data[i] = Math.max(0.2, Math.min(0.9, data[i]));
                } else {
                    data[i] = data[i] * 0.8 + 0.2 * 0.2;
                }

                const h = data[i] * canvas.height;
                const x = i * (barWidth + gap);
                const y = (canvas.height - h) / 2;

                const distFromCenter = Math.abs(i - bars / 2) / (bars / 2);
                ctx.globalAlpha = Math.max(0.1, 1 - Math.pow(distFromCenter, 6));

                ctx.fillStyle = '#db4c3f';
                ctx.beginPath();
                ctx.rect(x, y, barWidth, h);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            stopAudio();
        };
    }, [isListening]);

    const setupAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            audioContextRef.current = audioContext;
        } catch (err) {
            console.error("Audio analysis failed:", err);
        }
    };

    const stopAudio = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        analyserRef.current = null;
    };

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('speechRecognition' in window)) {
            setError('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language; 

        recognitionRef.current.onresult = (event) => {
            let currentTranscript = '';
            for (let i = 0; i < event.results.length; ++i) {
                currentTranscript += event.results[i][0].transcript;
            }
            setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed') {
                setError('Microphone access denied.');
            } else if (event.error === 'no-speech') {
            } else {
                setError('An error occurred while recording.');
            }
            setIsListening(false);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [language]); 
    useEffect(() => {
        if (isOpen) {
            startListening();
        } else {
            stopListening();
        }
    }, [isOpen]);

    const startListening = () => {
        setError(null);
        setTranscript('');
        setIsListening(true);
        setTimeout(() => {
            try {
                if (recognitionRef.current) {
                    recognitionRef.current.start();
                }
            } catch (e) {
                if (e.name !== 'InvalidStateError') setIsListening(false);
            }
        }, 100);
    };

    const stopListening = () => {
        setIsListening(false);
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }
    };

    const handleLanguageToggle = (e) => {
        e.stopPropagation();
        const newLang = language === 'vi-VN' ? 'en-US' : 'vi-VN';
        setLanguage(newLang);
        if (isListening) {
            stopListening();
            setTimeout(startListening, 100);
        }
    };

    const handleDone = () => {
        if (transcript) {
            onTranscript(transcript);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="stt-overlay" onClick={onClose}>
            <div className="stt-container" onClick={(e) => e.stopPropagation()}>
                <div className="stt-header">
                    <div className="stt-header-left">
                        <span className="stt-title">Voice add</span>
                        <button
                            className="stt-lang-toggle"
                            onClick={handleLanguageToggle}
                            title="Switch language"
                        >
                            <span className={language === 'vi-VN' ? 'active' : ''}>VI</span>
                            <span className="stt-lang-sep">/</span>
                            <span className={language === 'en-US' ? 'active' : ''}>EN</span>
                        </button>
                    </div>
                    <div className="stt-header-right">
                        <canvas
                            ref={canvasRef}
                            width="90"
                            height="16"
                            className={`stt-waveform-canvas ${isListening ? 'active' : ''}`}
                            style={{ width: '90px', height: '16px' }}
                        />
                        <div className="stt-header-actions">
                            <SmallMicIcon />
                            <ArrowDownIcon />
                        </div>
                    </div>
                </div>

                <div className="stt-body">
                    <div className="stt-content-area">
                        {transcript ? (
                            <div className="stt-task-preview">
                                <div className="stt-checkbox-placeholder"></div>
                                <div className="stt-task-content">
                                    <p className="stt-text">{transcript}</p>
                                    <div className="stt-project-label">
                                        <span>Inbox</span>
                                        <InboxSmallIcon />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="stt-hints-view">
                                <p className="hints-intro">Dictate your tasks, TaskList will record them.</p>
                                <div className="hint-item">
                                    <MicOutlineIcon />
                                    <span>Try "Send a quote today at 5pm, add it to Work project"</span>
                                </div>
                                <div className="hint-item">
                                    <MicOutlineIcon />
                                    <span>Say a date, time, project, priority, or label</span>
                                </div>
                                <div className="hint-item">
                                    <MicOutlineIcon />
                                    <span>Edit or delete tasks by asking; end session with "that's it"</span>
                                </div>
                                <button className="hints-more">
                                    Show more tips <ArrowDownIcon />
                                </button>
                            </div>
                        )}
                    </div>
                    {error && <p className="stt-error-msg">{error}</p>}
                </div>

                <div className="stt-footer">
                    <div className="stt-footer-left">
                        <span className="stt-session-badge">
                            {transcript ? '1' : '0'} SESSION RESTANTE
                        </span>
                    </div>
                    <div className="stt-footer-right">
                        <button className="stt-btn-cancel" onClick={onClose}>
                            {transcript ? 'Delete' : 'Cancel'}
                        </button>
                        <button
                            className={`stt-btn-done ${transcript ? 'active' : ''}`}
                            onClick={handleDone}
                            disabled={!transcript}
                        >
                            Add task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SmallMicIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path fill="#666" d="M17.5 10a.5.5 0 0 1 .492.41l.008.09V12a6 6 0 0 1-5.5 5.98V20h3a.5.5 0 0 1 .492.41l.008.09a.5.5 0 0 1-.41.492L15.5 21h-7a.5.5 0 0 1-.09-.992L8.5 20h3v-2.02a6 6 0 0 1-5.495-5.745L6 12v-1.5a.5.5 0 0 1 .992-.09L7 10.5V12a5 5 0 0 0 9.995.217L17 12v-1.5a.5.5 0 0 1 .5-.5M12 3a4 4 0 0 1 4 4v5a4 4 0 1 1-8 0V7a4 4 0 0 1 4-4m0 1a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3"></path>
    </svg>
);

const MicOutlineIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="22"></line>
        <line x1="8" y1="22" x2="16" y2="22"></line>
    </svg>
);

const ArrowDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="stt-arrow-down-icon">
        <path fill="#666" d="M7.646 9.646 4.854 6.854A.5.5 0 0 1 5.207 6h5.586a.5.5 0 0 1 .353.854L8.354 9.646a.5.5 0 0 1-.708 0"></path>
    </svg>
);

const InboxSmallIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8.062 4h7.876a2 2 0 0 1 1.94 1.515l2.062 8.246q.06.24.06.486V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.754a2 2 0 0 1 .06-.485L6.12 5.515A2 2 0 0 1 8.061 4m0 1a1 1 0 0 0-.97.758L5.03 14.004a1 1 0 0 0-.03.242V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.754a1 1 0 0 0-.03-.242L16.91 5.758a1 1 0 0 0-.97-.758zm6.643 10a2.75 2.75 0 0 1-5.41 0H7a.5.5 0 1 1 0-1h2.75a.5.5 0 0 1 .5.5 1.75 1.75 0 1 0 3.5 0 .5.5 0 0 1 .5-.5H17a.5.5 0 0 1 0 1z" clipRule="evenodd"></path>
    </svg>
);

export default SpeechToText;
