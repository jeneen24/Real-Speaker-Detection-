# 🎤 Real Speaker Detection & Live Transcription System
A real-time multi-speaker detection and speech-to-text web application that uses the Web Audio API and Web Speech API to:

Detect and visualize multiple connected microphones.

Identify which speaker is currently the closest/loudest.

Transcribe speech in real time with language selection.

Display and rank live transcriptions by speaker activity.
--
# 🚀 Features
Multi-Microphone Support – Add and manage multiple audio input devices.

Real-Time Visualization – Dynamic audio intensity bars, frequency spectrum, and active speaker indicators.

Closest Speaker Detection – Identify the most dominant/active speaker during conversation.

Live Transcription – Convert speech to text instantly using the Web Speech API.

Multi-Language Support – Choose from multiple languages and dialects.

Adjustable Sensitivity & VAD Threshold – Fine-tune voice detection accuracy.

Speaker Ranking – Show rank of speakers based on current loudness.
--
# 📂 Project Structure


├── index.html      # Main HTML interface
├── styles.css      # UI styling and animations
├── script.js       # Main JavaScript logic for detection & transcription
└── README.md       # Project documentation
--
# 🛠️ How It Works
Microphone Access – The app requests permission to access one or more microphones.

Audio Processing – Each microphone is connected to an AnalyserNode to capture volume and frequency data.

Voice Activity Detection (VAD) – RMS and decibel calculations determine if a speaker is active.

Speaker Ranking – Active speakers are sorted by intensity to find the closest/loudest.

Speech Recognition – The browser’s Speech Recognition API transcribes active speech.

Live UI Updates – Speaker list, transcriptions, and visualizations update in real time.
--
# 📋 Requirements
A modern browser that supports:

Web Audio API

SpeechRecognition API (Chrome recommended)

Microphone(s) connected to the system.
--
# ▶️ Usage
Open index.html in a supported browser.

Select the interface language and speech recognition language.

Click "Start" to begin detection.

Add one or more microphones from the devices list.

Speak into any connected microphone – the app detects who is speaking and transcribes speech.

Click "Stop" to end detection.
--
# ⚙️ Configuration Options
VAD Threshold (vadThreshold) – Adjusts the decibel level needed to detect speech.

Sensitivity (sensitivity) – Controls RMS threshold for voice activity.

Language – Choose the speech recognition language from the dropdown.
--
# 🎨 UI Overview
Speaker List – Shows all connected microphones, their current activity, intensity, and peak frequency.

Audio Visualization Canvas – Displays intensity bars and frequency spectrum for each speaker.

Transcriptions List – Shows recent transcriptions with speaker name, intensity, rank, and timestamp.

Status Bar – Displays the current system state.
--
# ⚠️ Notes

Prepare all microphones and select the desired language before starting detection for the most accurate results.

Speech Recognition requires internet access in most browsers.

Some browsers may restrict multi-microphone access for privacy reasons.

Best performance is achieved in Google Chrome.


--
# 🚀 New Advanced Features:
Enhanced Audio Processing:

Higher sample rate (48kHz) for better quality
Advanced spectral analysis with centroid, rolloff, and zero-crossing rate calculations
Noise gating with adjustable threshold
Auto-calibration feature that adapts to ambient noise

Smart Speaker Identification:

Spectral fingerprinting - each speaker gets unique voice characteristics
Speech pattern learning - system learns individual speaking styles
Multi-factor speaker matching using volume, spectral features, and speech patterns
Voice consistency tracking for better identification accuracy

Advanced Transcription:

Multiple language support (10 languages)
Confidence scoring with visual indicators
Alternative transcriptions showing other possibilities
Sentiment analysis (positive/negative/neutral)
Speech metrics (word count, estimated duration, speaking rate)

Rich Visualizations:

Animated gradient backgrounds with time-based effects
Pulsating speaker circles with intensity-based sizing
Radial frequency visualization around each speaker
Global spectrum analyzer at the bottom
Real-time analytics overlay

Professional Analytics:

Session tracking with start/end times
Speaking time per person
Word count and frequency analysis
Spectral feature monitoring
Export functionality for session data in JSON format

Modern UI/UX:

Glassmorphism design with blur effects
Responsive grid layout
Smooth animations and transitions
Professional color schemes
Advanced controls panel

Data Export & Analysis:

Session data export with complete analytics
Speech pattern storage
Frequency analysis history
Speaker profiling data


The system now provides enterprise-level features with beautiful visualizations, making it suitable for professional meeting analysis, research applications, or advanced audio monitoring scenarios. The interface is modern and responsive, working well on both desktop and mobile devices.

