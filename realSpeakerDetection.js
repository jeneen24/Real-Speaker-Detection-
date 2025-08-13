class RealSpeakerDetectionSystem {
    constructor() {
        this.isRecording = false;
        this.audioStreams = new Map();
        this.audioAnalyzers = new Map();
        this.speakers = new Map();
        this.transcriptions = [];
        this.speakerId = 0;
        this.audioContext = null;
        this.vadThreshold = -40;
        this.sensitivity = 5;
        this.processingInterval = null;
        this.availableDevices = [];
        this.currentLanguage = 'en-US';
        
        // Web Speech API for real transcription
        this.recognition = null;
        this.isTranscribing = false;
        this.transcriptionTimeout = null;
        
        this.initializeSpeechRecognition();
        this.initializeElements();
        this.bindEvents();
        this.loadAudioDevices();
        this.updateSystemStatus('System Ready');
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.addMicBtn = document.getElementById('addMicBtn');
        this.speakersList = document.getElementById('speakersList');
        this.transcriptionsList = document.getElementById('transcriptionsList');
        this.devicesList = document.getElementById('devicesList');
        this.audioCanvas = document.getElementById('audioCanvas');
        this.canvasCtx = this.audioCanvas.getContext('2d');
        this.systemStatus = document.getElementById('systemStatus');
        
        // Settings elements
        this.vadThresholdSlider = document.getElementById('vadThreshold');
        this.vadValue = document.getElementById('vadValue');
        this.sensitivitySlider = document.getElementById('sensitivity');
        this.sensitivityValue = document.getElementById('sensitivityValue');
        this.languageSelect = document.getElementById('language');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startRealDetection());
        this.stopBtn.addEventListener('click', () => this.stopDetection());
        this.addMicBtn.addEventListener('click', () => this.addMicrophone());
        
        // Settings events
        this.vadThresholdSlider.addEventListener('input', (e) => {
            this.vadThreshold = parseInt(e.target.value);
            this.vadValue.textContent = `${this.vadThreshold} dB`;
        });
        
        this.sensitivitySlider.addEventListener('input', (e) => {
            this.sensitivity = parseInt(e.target.value);
            this.sensitivityValue.textContent = e.target.value;
        });

        this.languageSelect.addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            if (this.recognition && this.isRecording) {
                this.restartSpeechRecognition();
            }
        });
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.currentLanguage;
            this.recognition.maxAlternatives = 1;
            
            this.recognition.onstart = () => {
                console.log('Speech recognition started');
                this.isTranscribing = true;
                this.updateSystemStatus('Listening for speech...');
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                if (finalTranscript.trim()) {
                    this.handleTranscription(finalTranscript.trim());
                    this.updateSystemStatus('Transcription completed');
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    this.updateSystemStatus('Microphone access denied');
                } else {
                    this.updateSystemStatus(`Speech recognition error: ${event.error}`);
                }
            };
            
            this.recognition.onend = () => {
                if (this.isRecording) {
                    // Auto-restart recognition if still recording
                    setTimeout(() => {
                        if (this.isRecording) {
                            this.recognition.start();
                        }
                    }, 100);
                } else {
                    this.isTranscribing = false;
                    this.updateSystemStatus('Speech recognition stopped');
                }
            };
        } else {
            console.warn('Speech Recognition API not supported');
            this.updateSystemStatus('Speech recognition not supported in this browser');
        }
    }

    restartSpeechRecognition() {
        if (this.recognition && this.isTranscribing) {
            this.recognition.stop();
            setTimeout(() => {
                this.recognition.lang = this.currentLanguage;
                this.recognition.start();
            }, 500);
        }
    }

    async loadAudioDevices() {
        try {
            // Request permission first to get device labels
            await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                stream.getTracks().forEach(track => track.stop());
            });
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableDevices = devices.filter(device => device.kind === 'audioinput');
            this.renderDevicesList();
            
            console.log(`Found ${this.availableDevices.length} audio input devices`);
        } catch (error) {
            console.error('Error loading audio devices:', error);
            this.devicesList.innerHTML = '<p class="error">Unable to load audio devices. Please check permissions.</p>';
        }
    }

    renderDevicesList() {
        if (this.availableDevices.length === 0) {
            this.devicesList.innerHTML = '<p class="loading-devices">No audio devices found</p>';
            return;
        }

        this.devicesList.innerHTML = this.availableDevices.map((device, index) => {
            const isInUse = Array.from(this.speakers.values()).some(speaker => 
                speaker.deviceId === device.deviceId
            );
            
            return `
                <div class="device-item ${isInUse ? 'in-use' : ''}">
                    <span class="device-name">
                        ${device.label || `Microphone ${index + 1}`}
                        ${isInUse ? '(In Use)' : ''}
                    </span>
                    <button class="device-btn" 
                            onclick="speakerSystem.addSpecificMicrophone('${device.deviceId}', '${device.label || `Mic ${index + 1}`}')"
                            ${isInUse ? 'disabled' : ''}>
                        ${isInUse ? 'Added' : 'Add Device'}
                    </button>
                </div>
            `;
        }).join('');
    }

    async startRealDetection() {
        try {
            this.updateSystemStatus('Initializing audio system...');
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Request default microphone first
            await this.addMicrophone();
            
            this.isRecording = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            
            this.updateButtonStatus('recording');
            this.startAudioProcessing();
            
            // Start speech recognition
            if (this.recognition) {
                this.recognition.lang = this.currentLanguage;
                this.recognition.start();
            }
            
            this.updateSystemStatus('Detection active - Listening...');
            
        } catch (error) {
            console.error('Error starting detection:', error);
            this.updateSystemStatus('Failed to start detection');
            alert('Error accessing microphone. Please check permissions and try again.');
            this.stopDetection();
        }
    }

    async addMicrophone() {
        try {
            this.updateSystemStatus('Adding default microphone...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100,
                    channelCount: 1
                }
            });
            
            await this.processMicrophoneStream(stream, 'Default Microphone', 'default');
            this.updateSystemStatus('Default microphone added successfully');
        } catch (error) {
            console.error('Error adding microphone:', error);
            this.updateSystemStatus('Failed to add microphone');
            throw error;
        }
    }

    async addSpecificMicrophone(deviceId, deviceName) {
        try {
            this.updateSystemStatus(`Adding ${deviceName}...`);
            
            // Check if device is already in use
            const existingSpeaker = Array.from(this.speakers.values()).find(s => s.deviceId === deviceId);
            if (existingSpeaker) {
                alert('This device is already in use!');
                return;
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: deviceId },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100,
                    channelCount: 1
                }
            });
            
            await this.processMicrophoneStream(stream, deviceName, deviceId);
            this.updateSystemStatus(`${deviceName} added successfully`);
            this.renderDevicesList(); // Update device list to show "in use"
        } catch (error) {
            console.error('Error adding specific microphone:', error);
            this.updateSystemStatus(`Failed to add ${deviceName}`);
            alert(`Could not access ${deviceName}. Please check permissions.`);
        }
    }

    async processMicrophoneStream(stream, name, deviceId) {
        const speakerId = this.speakerId++;
        
        try {
            // Create audio analyzer
            const source = this.audioContext.createMediaStreamSource(stream);
            const analyzer = this.audioContext.createAnalyser();
            
            analyzer.fftSize = 2048;
            analyzer.smoothingTimeConstant = 0.8;
            analyzer.minDecibels = -90;
            analyzer.maxDecibels = -10;
            
            source.connect(analyzer);
            
            // Create speaker object
            const speaker = {
                id: speakerId,
                name: name,
                deviceId: deviceId,
                stream: stream,
                source: source,
                analyzer: analyzer,
                intensity: 0,
                isActive: false,
                rmsHistory: [],
                peakFrequency: 0,
                color: this.generateSpeakerColor(speakerId),
                lastActivityTime: 0
            };

            this.speakers.set(speakerId, speaker);
            this.audioAnalyzers.set(speakerId, analyzer);
            this.renderSpeakers();
            
            console.log(`Added microphone: ${name} (ID: ${speakerId})`);
            
        } catch (error) {
            console.error('Error processing microphone stream:', error);
            // Clean up stream on error
            stream.getTracks().forEach(track => track.stop());
            throw error;
        }
    }

    generateSpeakerColor(id) {
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
            '#9b59b6', '#1abc9c', '#ff6b6b', '#4ecdc4',
            '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'
        ];
        return colors[id % colors.length];
    }

    startAudioProcessing() {
        const bufferLength = 2048;
        
        this.processingInterval = setInterval(() => {
            if (!this.isRecording) return;

            this.speakers.forEach(speaker => {
                const analyzer = speaker.analyzer;
                const dataArray = new Uint8Array(analyzer.frequencyBinCount);
                const timeDataArray = new Uint8Array(analyzer.fftSize);
                
                // Get frequency data for visualization
                analyzer.getByteFrequencyData(dataArray);
                
                // Get time domain data for RMS calculation
                analyzer.getByteTimeDomainData(timeDataArray);
                
                // Calculate RMS (Root Mean Square)
                let rms = 0;
                for (let i = 0; i < timeDataArray.length; i++) {
                    const sample = (timeDataArray[i] - 128) / 128; // Normalize to -1 to 1
                    rms += sample * sample;
                }
                rms = Math.sqrt(rms / timeDataArray.length);
                
                // Convert RMS to decibels
                const db = rms > 0 ? 20 * Math.log10(rms) : -100;
                
                // Scale intensity to 0-100 range
                speaker.intensity = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
                
                // Voice Activity Detection with hysteresis
                const isCurrentlyActive = db > this.vadThreshold && rms > (0.005 * this.sensitivity / 5);
                
                if (isCurrentlyActive) {
                    speaker.lastActivityTime = Date.now();
                    speaker.isActive = true;
                } else {
                    // Keep active for 500ms after voice stops to avoid flickering
                    speaker.isActive = (Date.now() - speaker.lastActivityTime) < 500;
                }
                
                // Store RMS history for smoothing
                speaker.rmsHistory.push(rms);
                if (speaker.rmsHistory.length > 10) {
                    speaker.rmsHistory.shift();
                }
                
                // Find peak frequency
                let maxIndex = 0;
                let maxValue = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    if (dataArray[i] > maxValue) {
                        maxValue = dataArray[i];
                        maxIndex = i;
                    }
                }
                speaker.peakFrequency = (maxIndex * this.audioContext.sampleRate) / (2 * analyzer.fftSize);
            });

            this.renderSpeakers();
            this.drawAudioVisualization();
        }, 50); // Update every 50ms for smooth visualization
    }

    drawAudioVisualization() {
        const canvas = this.audioCanvas;
        const ctx = this.canvasCtx;
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas with gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        const speakersArray = Array.from(this.speakers.values());
        if (speakersArray.length === 0) {
            // Draw "No Audio" message
            ctx.fillStyle = '#666';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No microphones active', width / 2, height / 2);
            return;
        }

        const barWidth = width / speakersArray.length;

        speakersArray.forEach((speaker, index) => {
            const analyzer = speaker.analyzer;
            const bufferLength = analyzer.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyzer.getByteFrequencyData(dataArray);

            const x = index * barWidth;
            const barHeight = (speaker.intensity / 100) * height * 0.8;

            // Draw main intensity bar
            const barGradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
            if (speaker.isActive) {
                barGradient.addColorStop(0, speaker.color);
                barGradient.addColorStop(1, speaker.color + '88');
            } else {
                barGradient.addColorStop(0, '#444');
                barGradient.addColorStop(1, '#222');
            }
            
            ctx.fillStyle = barGradient;
            ctx.fillRect(x + 5, height - barHeight, barWidth - 10, barHeight);

            // Draw speaker name and info
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(speaker.name, x + 10, height - 10);
            
            // Draw intensity value
            ctx.fillStyle = '#aaa';
            ctx.font = '10px Arial';
            ctx.fillText(`${speaker.intensity.toFixed(0)}%`, x + 10, height - 25);

            // Draw frequency spectrum (mini version)
            const spectrumWidth = barWidth - 20;
            const spectrumHeight = 60;
            const spectrumX = x + 10;
            const spectrumY = height - spectrumHeight - 45;

            // Draw spectrum bars
            const barsToShow = Math.min(32, Math.floor(dataArray.length / 8));
            for (let i = 0; i < barsToShow; i++) {
                const dataIndex = Math.floor((i * dataArray.length) / barsToShow);
                const barHeightSpec = (dataArray[dataIndex] / 255) * spectrumHeight;
                const barWidthSpec = spectrumWidth / barsToShow;
                
                const alpha = speaker.isActive ? '0.8' : '0.3';
                const r = parseInt(speaker.color.slice(1, 3), 16);
                const g = parseInt(speaker.color.slice(3, 5), 16);
                const b = parseInt(speaker.color.slice(5, 7), 16);
                
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.fillRect(
                    spectrumX + i * barWidthSpec, 
                    spectrumY + spectrumHeight - barHeightSpec, 
                    barWidthSpec - 1, 
                    barHeightSpec
                );
            }

            // Draw activity indicator
            if (speaker.isActive) {
                ctx.beginPath();
                ctx.arc(x + barWidth - 20, 20, 8, 0, 2 * Math.PI);
                ctx.fillStyle = '#4CAF50';
                ctx.fill();
                
                // Pulse effect
                ctx.beginPath();
                ctx.arc(x + barWidth - 20, 20, 12, 0, 2 * Math.PI);
                ctx.strokeStyle = '#4CAF50';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });
    }

    handleTranscription(text) {
        if (!text || text.length < 2) return;
        
        // Find the most active speaker for this transcription
        const activeSpeakers = Array.from(this.speakers.values())
            .filter(s => s.isActive)
            .sort((a, b) => b.intensity - a.intensity);

        let closestSpeaker = activeSpeakers[0];
        
        // If no active speakers, use the one with highest recent activity
        if (!closestSpeaker) {
            const recentSpeakers = Array.from(this.speakers.values())
                .filter(s => (Date.now() - s.lastActivityTime) < 2000)
                .sort((a, b) => b.intensity - a.intensity);
            closestSpeaker = recentSpeakers[0];
        }
        
        if (!closestSpeaker) {
            console.warn('No suitable speaker found for transcription');
            return;
        }

        const transcription = {
            id: Date.now() + Math.random(),
            speakerId: closestSpeaker.id,
            speakerName: closestSpeaker.name,
            text: text,
            intensity: closestSpeaker.intensity,
            timestamp: new Date(),
            rank: 1,
            confidence: 1.0 // Could be extracted from speech recognition results
        };

        this.transcriptions.unshift(transcription);
        
        // Keep only last 50 transcriptions
        if (this.transcriptions.length > 50) {
            this.transcriptions = this.transcriptions.slice(0, 50);
        }

        this.renderTranscriptions();
        console.log(`Transcription from ${closestSpeaker.name}: "${text}"`);
    }

    calculateSpeakerRanking() {
        return Array.from(this.speakers.values())
            .filter(s => s.isActive)
            .sort((a, b) => b.intensity - a.intensity);
    }

    renderSpeakers() {
        const rankedSpeakers = this.calculateSpeakerRanking();
        const allSpeakers = Array.from(this.speakers.values())
            .sort((a, b) => b.intensity - a.intensity);

        if (allSpeakers.length === 0) {
            this.speakersList.innerHTML = '<div class="no-microphones">No microphones connected.</div>';
            return;
        }

        this.speakersList.innerHTML = allSpeakers.map((speaker, index) => {
            const isClosest = rankedSpeakers[0]?.id === speaker.id;
            const statusClass = speaker.isActive ? 'active' : 'inactive';
            const intensityPercent = speaker.intensity;
            const rank = rankedSpeakers.findIndex(s => s.id === speaker.id) + 1;

            return `
                <div class="speaker-item ${statusClass}">
                    <div class="speaker-avatar" style="background: ${speaker.color}">
                        ${speaker.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="speaker-info">
                        <div class="speaker-name">
                            ${speaker.name}
                            ${isClosest && speaker.isActive ? ' 👑' : ''}
                        </div>
                        <div class="speaker-status">
                            ${speaker.isActive ? '🎙️ Speaking' : '🔇 Silent'}
                            ${speaker.isActive ? ` (Rank #${rank})` : ''}
                        </div>
                        <div class="intensity-bar">
                            <div class="intensity-fill" style="width: ${intensityPercent}%"></div>
                        </div>
                        <div class="db-value">
                            Intensity: ${speaker.intensity.toFixed(1)}%
                            ${speaker.peakFrequency > 0 ? ` | Peak: ${Math.round(speaker.peakFrequency)}Hz` : ''}
                        </div>
                        <button class="remove-mic-btn" onclick="speakerSystem.removeMicrophone(${speaker.id})">
                            Remove Mic
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTranscriptions() {
        if (this.transcriptions.length === 0) {
            this.transcriptionsList.innerHTML = '<div class="no-transcriptions">Start speaking to see live transcriptions...</div>';
            return;
        }

        // Update ranks based on current speaker intensities at time of transcription
        this.transcriptions.forEach(transcription => {
            const speaker = this.speakers.get(transcription.speakerId);
            if (speaker) {
                const rankedSpeakers = this.calculateSpeakerRanking();
                const rank = rankedSpeakers.findIndex(s => s.id === speaker.id) + 1;
                transcription.rank = rank || 999;
            }
        });

        const sortedTranscriptions = [...this.transcriptions]
            .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

        this.transcriptionsList.innerHTML = sortedTranscriptions.map((transcription, index) => {
            const isFromActiveSpeaker = transcription.rank <= 3;
            const timeAgo = this.getTimeAgo(transcription.timestamp);
            const speaker = this.speakers.get(transcription.speakerId);

            return `
                <div class="transcription-item ${isFromActiveSpeaker ? 'closest' : ''}">
                    <div class="transcription-header">
                        <div class="transcription-speaker">
                            <span style="color: ${speaker ? speaker.color : '#666'}">●</span>
                            ${transcription.speakerName}
                        </div>
                        <div class="transcription-rank">
                            ${transcription.rank === 1 ? '👑 Loudest' : 
                              transcription.rank <= 3 ? `Rank #${transcription.rank}` : 
                              'Background'}
                        </div>
                    </div>
                    <div class="transcription-text">"${transcription.text}"</div>
                    <div class="transcription-meta">
                        <span>Intensity: ${transcription.intensity.toFixed(1)}%</span>
                        <span>${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    removeMicrophone(speakerId) {
        const speaker = this.speakers.get(speakerId);
        if (speaker) {
            // Stop the audio stream
            speaker.stream.getTracks().forEach(track => track.stop());
            
            // Disconnect audio nodes
            speaker.source.disconnect();
            
            // Remove from maps
            this.speakers.delete(speakerId);
            this.audioAnalyzers.delete(speakerId);
            
            // Re-render
            this.renderSpeakers();
            this.renderDevicesList();
            
            this.updateSystemStatus(`Removed microphone: ${speaker.name}`);
            console.log(`Removed microphone: ${speaker.name}`);
        }
    }

    stopDetection() {
        this.isRecording = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        
        // Stop all audio streams
        this.speakers.forEach(speaker => {
            speaker.stream.getTracks().forEach(track => track.stop());
            speaker.source.disconnect();
        });
        
        // Clear speakers
        this.speakers.clear();
        this.audioAnalyzers.clear();
        
        // Stop speech recognition
        if (this.recognition && this.isTranscribing) {
            this.recognition.stop();
            this.isTranscribing = false;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.updateButtonStatus('idle');
        this.clearIntervals();
        
        // Clear displays
        this.speakersList.innerHTML = '<div class="no-microphones">Detection stopped</div>';
        this.transcriptionsList.innerHTML = '<div class="no-transcriptions">Detection stopped</div>';
        
        // Clear canvas
        const ctx = this.canvasCtx;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.audioCanvas.width, this.audioCanvas.height);
        
        this.renderDevicesList();
        this.updateSystemStatus('Detection stopped');
    }

    updateButtonStatus(status) {
        const startIndicator = this.startBtn.querySelector('.status-indicator');
        const stopIndicator = this.stopBtn.querySelector('.status-indicator');
        const systemIndicator = this.systemStatus.querySelector('.status-indicator');
        
        [startIndicator, stopIndicator, systemIndicator].forEach(indicator => {
            if (indicator) {
                indicator.className = `status-indicator ${status}`;
            }
        });
    }

    updateSystemStatus(message) {
        const statusText = this.systemStatus.querySelector('span:not(.status-indicator)');
        if (statusText) {
            statusText.textContent = message;
        } else {
            // Fallback if structure is different
            this.systemStatus.innerHTML = `
                <span class="status-indicator idle"></span>
                ${message}
            `;
        }
        console.log(`System Status: ${message}`);
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }

    clearIntervals() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        if (this.transcriptionTimeout) {
            clearTimeout(this.transcriptionTimeout);
            this.transcriptionTimeout = null;
        }
    }

    // Utility method for debugging
    getSystemInfo() {
        return {
            isRecording: this.isRecording,
            speakerCount: this.speakers.size,
            transcriptionCount: this.transcriptions.length,
            audioContextState: this.audioContext ? this.audioContext.state : 'null',
            speechRecognitionSupported: !!this.recognition,
            currentLanguage: this.currentLanguage
        };
    }
}

// Initialize the system when page loads and make it globally accessible
let speakerSystem;
document.addEventListener('DOMContentLoaded', () => {
    speakerSystem = new RealSpeakerDetectionSystem();
    window.speakerSystem = speakerSystem; // Make globally accessible for debugging
    
    // Add global error handler
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        if (speakerSystem) {
            speakerSystem.updateSystemStatus('System error occurred');
        }
    });
    
    console.log('Real Speaker Detection System initialized');
});