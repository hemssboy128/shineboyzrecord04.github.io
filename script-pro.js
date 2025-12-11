// Shine Boyz Pro Studio - Application DAW Professionnelle

class ShineBoyzProStudio {
    constructor() {
        this.currentProject = null;
        this.tracks = [];
        this.audioContext = null;
        this.mediaRecorder = null;
        this.isRecording = false;
        this.isPlaying = false;
        this.currentTime = 0;
        this.tempo = 120;
        this.timeSignature = '4/4';
        this.audioFiles = [];
        this.projects = [];
        this.offlineMode = true;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initialisation Shine Boyz Pro Studio');
        
        // Vérifier le mode hors ligne
        this.checkOfflineMode();
        
        // Initialiser l'audio
        await this.initAudio();
        
        // Charger les données locales
        this.loadLocalData();
        
        // Configurer l'interface
        this.setupUI();
        
        // Démarrer le métronome visuel
        this.startVisualMetronome();
        
        // Gérer le drag & drop
        this.setupDragAndDrop();
        
        console.log('✅ Studio prêt');
    }
    
    checkOfflineMode() {
        this.offlineMode = !navigator.onLine;
        if (this.offlineMode) {
            console.log('📴 Mode hors ligne activé');
            this.showNotification('Mode hors ligne - Fonctions locales disponibles', 'info');
        } else {
            console.log('📡 Mode en ligne');
        }
    }
    
    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Test du microphone
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Créer un MediaRecorder pour l'enregistrement
            this.mediaRecorder = new MediaRecorder(stream);
            this.setupMediaRecorder();
            
            // Arrêter les tracks temporairement
            stream.getTracks().forEach(track => track.stop());
            
        } catch (error) {
            console.warn('Audio non disponible:', error);
            this.showNotification('Audio non disponible - Mode lecture seule', 'warning');
        }
    }
    
    setupMediaRecorder() {
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.handleAudioData(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            console.log('Enregistrement terminé');
            this.isRecording = false;
            this.updateTransportUI();
        };
    }
    
    setupUI() {
        // Transport controls
        document.getElementById('playBtn').addEventListener('click', () => this.togglePlay());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecord());
        document.getElementById('loopBtn').addEventListener('click', () => this.toggleLoop());
        document.getElementById('metronomeBtn').addEventListener('click', () => this.toggleMetronome());
        
        // Import/Export
        document.getElementById('saveBtn').addEventListener('click', () => this.saveProject());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportProject());
        document.getElementById('newProjectBtn').addEventListener('click', () => this.createNewProject());
        document.getElementById('addTrackBtn').addEventListener('click', () => this.addTrack());
        document.getElementById('toggleMixer').addEventListener('click', () => this.toggleMixer());
        
        // Panels
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchPanel(e.target.dataset.panel));
        });
        
        // AI Tools
        document.querySelectorAll('.ai-tool-card .tool-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.closest('.ai-tool-card').dataset.tool;
                this.runAITool(tool);
            });
        });
        
        // Modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });
        
        // Import modal
        document.querySelectorAll('.import-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.openFileBrowser(type);
            });
        });
        
        // Master volume
        const masterVolume = document.getElementById('masterVolume');
        if (masterVolume) {
            masterVolume.addEventListener('input', (e) => {
                this.updateMasterVolume(e.target.value);
            });
        }
        
        // Mettre à jour le temps en temps réel
        setInterval(() => this.updateTimeDisplay(), 100);
    }
    
    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        
        if (dropZone) {
            dropZone.addEventListener('click', () => fileInput.click());
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                
                const files = Array.from(e.dataTransfer.files);
                this.handleDroppedFiles(files);
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.handleDroppedFiles(files);
            });
        }
    }
    
    async handleDroppedFiles(files) {
        const audioFiles = files.filter(file => 
            file.type.startsWith('audio/') || 
            ['.wav', '.mp3', '.flac', '.ogg', '.m4a'].some(ext => 
                file.name.toLowerCase().endsWith(ext)
            )
        );
        
        const midiFiles = files.filter(file => 
            file.type === 'audio/midi' || 
            file.name.toLowerCase().endsWith('.mid') ||
            file.name.toLowerCase().endsWith('.midi')
        );
        
        for (const file of audioFiles) {
            await this.importAudioFile(file);
        }
        
        for (const file of midiFiles) {
            await this.importMidiFile(file);
        }
        
        if (audioFiles.length + midiFiles.length > 0) {
            this.showNotification(`${audioFiles.length} audio + ${midiFiles.length} MIDI importés`, 'success');
        }
    }
    
    async importAudioFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const audioData = e.target.result;
                
                // Créer un objet audio
                const audio = {
                    id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    type: 'audio',
                    file: file,
                    data: audioData,
                    duration: 0, // À calculer
                    format: file.type,
                    size: file.size,
                    importedAt: new Date().toISOString()
                };
                
                // Ajouter à la bibliothèque
                this.audioFiles.push(audio);
                
                // Sauvegarder localement
                this.saveToLocalStorage(`audio_${audio.id}`, audio);
                
                // Créer une piste audio
                this.createAudioTrack(audio);
                
                // Ajouter au browser
                this.addToFileBrowser(audio);
                
                resolve(audio);
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async importMidiFile(file) {
        // Pour une vraie implémentation, utiliser une librairie MIDI
        const midi = {
            id: `midi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name.replace(/\.[^/.]+$/, ""),
            type: 'midi',
            file: file,
            importedAt: new Date().toISOString()
        };
        
        this.saveToLocalStorage(`midi_${midi.id}`, midi);
        this.createMidiTrack(midi);
        
        return midi;
    }
    
    createAudioTrack(audio) {
        const track = {
            id: `track_${Date.now()}`,
            name: audio.name,
            type: 'audio',
            audio: audio,
            volume: 0,
            pan: 0,
            mute: false,
            solo: false,
            regions: []
        };
        
        this.tracks.push(track);
        this.addTrackToUI(track);
        this.addChannelStrip(track);
        
        // Créer une région audio
        const region = {
            id: `region_${Date.now()}`,
            trackId: track.id,
            type: 'audio',
            start: 0,
            duration: 30, // Estimation
            audio: audio
        };
        
        track.regions.push(region);
        this.createAudioRegion(region);
    }
    
    createMidiTrack(midi) {
        const track = {
            id: `track_${Date.now()}`,
            name: midi.name,
            type: 'midi',
            midi: midi,
            volume: 0,
            pan: 0,
            mute: false,
            solo: false,
            regions: []
        };
        
        this.tracks.push(track);
        this.addTrackToUI(track);
        this.addChannelStrip(track);
        
        // Créer une région MIDI
        const region = {
            id: `region_${Date.now()}`,
            trackId: track.id,
            type: 'midi',
            start: 0,
            duration: 16, // 4 mesures à 120 BPM
            midi: midi
        };
        
        track.regions.push(region);
        this.createMidiRegion(region);
    }
    
    addTrackToUI(track) {
        const trackList = document.getElementById('trackList');
        
        const trackHeader = document.createElement('div');
        trackHeader.className = 'track-header';
        trackHeader.innerHTML = `
            <div class="track-name">${track.name}</div>
            <div class="track-controls">
                <button class="track-btn" title="Mute"><i class="fas fa-volume-mute"></i></button>
                <button class="track-btn" title="Solo"><i class="fas fa-headphones"></i></button>
                <button class="track-btn" title="Record"><i class="fas fa-circle"></i></button>
            </div>
        `;
        
        trackList.appendChild(trackHeader);
    }
    
    addChannelStrip(track) {
        const mixerChannels = document.getElementById('mixerChannels');
        
        const channelStrip = document.createElement('div');
        channelStrip.className = 'channel-strip';
        channelStrip.dataset.trackId = track.id;
        channelStrip.innerHTML = `
            <div class="channel-name">${track.name}</div>
            <div class="channel-meter">
                <div class="channel-meter-level"></div>
            </div>
            <div class="channel-fader">
                <input type="range" class="volume-fader" min="-60" max="6" value="0" orient="vertical">
                <span class="volume-value">0 dB</span>
            </div>
        `;
        
        mixerChannels.appendChild(channelStrip);
        
        // Ajouter les événements
        const fader = channelStrip.querySelector('.volume-fader');
        fader.addEventListener('input', (e) => {
            const value = e.target.value;
            track.volume = value;
            channelStrip.querySelector('.volume-value').textContent = `${value} dB`;
        });
    }
    
    createAudioRegion(region) {
        const arrangeArea = document.getElementById('arrangeArea');
        
        const regionEl = document.createElement('div');
        regionEl.className = 'audio-region';
        regionEl.style.left = `${region.start * 10}px`;
        regionEl.style.width = `${region.duration * 10}px`;
        regionEl.style.top = `${this.tracks.findIndex(t => t.id === region.trackId) * 80 + 10}px`;
        regionEl.textContent = region.audio.name;
        
        arrangeArea.appendChild(regionEl);
        
        // Rendre déplaçable
        this.makeRegionDraggable(regionEl, region);
    }
    
    createMidiRegion(region) {
        const arrangeArea = document.getElementById('arrangeArea');
        
        const regionEl = document.createElement('div');
        regionEl.className = 'midi-region';
        regionEl.style.left = `${region.start * 10}px`;
        regionEl.style.width = `${region.duration * 10}px`;
        regionEl.style.top = `${this.tracks.findIndex(t => t.id === region.trackId) * 80 + 10}px`;
        regionEl.textContent = region.midi.name;
        
        arrangeArea.appendChild(regionEl);
        
        // Rendre déplaçable
        this.makeRegionDraggable(regionEl, region);
    }
    
    makeRegionDraggable(element, region) {
        let isDragging = false;
        let startX, startLeft;
        
        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startLeft = parseInt(element.style.left) || 0;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            e.preventDefault();
        });
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const newLeft = Math.max(0, startLeft + deltaX);
            
            element.style.left = `${newLeft}px`;
            region.start = newLeft / 10; // Convertir en secondes
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }
    
    addToFileBrowser(file) {
        const fileList = document.querySelector('.file-list');
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = file.id;
        fileItem.innerHTML = `
            <div class="file-icon">
                <i class="${file.type === 'audio' ? 'fas fa-music' : 'fas fa-piano'}"></i>
            </div>
            <div class="file-name">${file.name}</div>
        `;
        
        fileItem.addEventListener('click', () => {
            if (file.type === 'audio') {
                this.createAudioTrack(file);
            } else {
                this.createMidiTrack(file);
            }
        });
        
        fileList.appendChild(fileItem);
    }
    
    // Transport controls
    togglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.play();
        }
    }
    
    play() {
        this.isPlaying = true;
        this.updateTransportUI();
        this.showNotification('Lecture démarrée', 'success');
        
        // Simuler l'avancement du curseur
        this.playbackInterval = setInterval(() => {
            this.currentTime += 0.1;
            this.updateTimeDisplay();
        }, 100);
    }
    
    stop() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.updateTransportUI();
        this.updateTimeDisplay();
        
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
        }
        
        this.showNotification('Arrêté', 'info');
    }
    
    toggleRecord() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }
    
    async startRecording() {
        if (!this.audioContext) {
            await this.initAudio();
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true 
            });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.setupMediaRecorder();
            this.mediaRecorder.start();
            
            this.isRecording = true;
            this.updateTransportUI();
            
            // Créer une piste d'enregistrement
            const track = {
                id: `record_${Date.now()}`,
                name: 'Enregistrement',
                type: 'audio',
                isRecording: true,
                volume: 0,
                pan: 0,
                mute: false,
                solo: false,
                regions: []
            };
            
            this.tracks.push(track);
            this.addTrackToUI(track);
            this.addChannelStrip(track);
            
            this.showNotification('Enregistrement démarré', 'success');
            
        } catch (error) {
            console.error('Erreur enregistrement:', error);
            this.showNotification('Erreur d\'enregistrement', 'error');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateTransportUI();
            
            this.showNotification('Enregistrement terminé', 'success');
        }
    }
    
    handleAudioData(audioData) {
        // Sauvegarder l'audio en local
        const audioBlob = new Blob([audioData], { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Créer un objet audio
        const audio = {
            id: `recorded_${Date.now()}`,
            name: `Enregistrement ${new Date().toLocaleTimeString()}`,
            type: 'audio',
            blob: audioBlob,
            url: audioUrl,
            duration: 0,
            importedAt: new Date().toISOString()
        };
        
        this.audioFiles.push(audio);
        this.saveToLocalStorage(`audio_${audio.id}`, audio);
        
        // Mettre à jour la piste d'enregistrement
        const recordTrack = this.tracks.find(t => t.isRecording);
        if (recordTrack) {
            recordTrack.name = audio.name;
            recordTrack.isRecording = false;
            recordTrack.audio = audio;
            
            // Mettre à jour l'UI
            const trackHeader = document.querySelector(`[data-track-id="${recordTrack.id}"] .track-name`);
            if (trackHeader) {
                trackHeader.textContent = audio.name;
            }
        }
    }
    
    toggleLoop() {
        const loopBtn = document.getElementById('loopBtn');
        const isLooping = loopBtn.classList.toggle('active');
        
        this.showNotification(isLooping ? 'Boucle activée' : 'Boucle désactivée', 'info');
    }
    
    toggleMetronome() {
        const metronomeBtn = document.getElementById('metronomeBtn');
        const isMetronomeOn = metronomeBtn.classList.toggle('active');
        
        this.showNotification(isMetronomeOn ? 'Métronome activé' : 'Métronome désactivé', 'info');
    }
    
    startVisualMetronome() {
        // Animation du métronome visuel
        setInterval(() => {
            if (!this.isPlaying) return;
            
            const beats = Math.floor(this.currentTime * this.tempo / 60);
            const isBeat = beats % 4 === 0;
            
            if (isBeat) {
                const metronomeBtn = document.getElementById('metronomeBtn');
                if (metronomeBtn.classList.contains('active')) {
                    metronomeBtn.style.color = '#ff0000';
                    setTimeout(() => {
                        metronomeBtn.style.color = '';
                    }, 100);
                }
            }
        }, 1000 / (this.tempo / 60));
    }
    
    updateTransportUI() {
        const playBtn = document.getElementById('playBtn');
        const recordBtn = document.getElementById('recordBtn');
        
        if (playBtn) {
            playBtn.innerHTML = this.isPlaying ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
        }
        
        if (recordBtn) {
            if (this.isRecording) {
                recordBtn.style.animation = 'pulse 1s infinite';
                recordBtn.style.color = '#ff0000';
            } else {
                recordBtn.style.animation = '';
                recordBtn.style.color = '';
            }
        }
    }
    
    updateTimeDisplay() {
        const timeElement = document.getElementById('currentTime');
        if (!timeElement) return;
        
        const hours = Math.floor(this.currentTime / 3600);
        const minutes = Math.floor((this.currentTime % 3600) / 60);
        const seconds = Math.floor(this.currentTime % 60);
        const milliseconds = Math.floor((this.currentTime % 1) * 100);
        
        timeElement.textContent = 
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}.` +
            `${milliseconds.toString().padStart(2, '0')}`;
    }
    
    updateMasterVolume(value) {
        const db = (value - 80) / 2;
        const dbElement = document.getElementById('masterDb');
        
        if (dbElement) {
            dbElement.textContent = `${db.toFixed(1)} dB`;
        }
    }
    
    // Projects management
    createNewProject() {
        const projectName = prompt('Nom du nouveau projet:', `Projet ${new Date().toLocaleDateString()}`);
        if (!projectName) return;
        
        const project = {
            id: `project_${Date.now()}`,
            name: projectName,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            tempo: this.tempo,
            timeSignature: this.timeSignature,
            tracks: this.tracks.map(t => ({
                ...t,
                // Ne pas inclure les données audio volumineuses
                audio: t.audio ? { id: t.audio.id, name: t.audio.name } : null,
                midi: t.midi ? { id: t.midi.id, name: t.midi.name } : null
            }))
        };
        
        this.currentProject = project;
        this.projects.push(project);
        
        this.saveToLocalStorage('projects', this.projects);
        this.saveToLocalStorage(`project_${project.id}`, project);
        
        this.updateProjectList();
        this.showNotification(`Projet "${projectName}" créé`, 'success');
    }
    
    saveProject() {
        if (!this.currentProject) {
            this.showNotification('Aucun projet à sauvegarder', 'warning');
            return;
        }
        
        this.currentProject.modified = new Date().toISOString();
        this.currentProject.tracks = this.tracks;
        
        this.saveToLocalStorage(`project_${this.currentProject.id}`, this.currentProject);
        this.showNotification('Projet sauvegardé', 'success');
    }
    
    async exportProject() {
        if (!this.currentProject) {
            this.showNotification('Aucun projet à exporter', 'warning');
            return;
        }
        
        // Simuler l'exportation
        this.showNotification('Exportation en cours...', 'info');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Créer un fichier de projet
        const projectData = JSON.stringify(this.currentProject, null, 2);
        const blob = new Blob([projectData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Télécharger
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentProject.name.replace(/\s+/g, '_')}.shineboyz`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        this.showNotification('Projet exporté avec succès', 'success');
    }
    
    loadLocalData() {
        // Charger les projets
        const savedProjects = this.loadFromLocalStorage('projects');
        if (savedProjects) {
            this.projects = savedProjects;
            this.updateProjectList();
        }
        
        // Charger les fichiers audio
        this.loadAudioFilesFromStorage();
    }
    
    loadAudioFilesFromStorage() {
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith('audio_')) {
                try {
                    const audio = JSON.parse(localStorage.getItem(key));
                    this.audioFiles.push(audio);
                } catch (error) {
                    console.warn('Erreur chargement audio:', key, error);
                }
            }
        });
    }
    
    updateProjectList() {
        const projectList = document.getElementById('projectList');
        if (!projectList) return;
        
        projectList.innerHTML = '';
        
        this.projects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = `project-item ${this.currentProject?.id === project.id ? 'active' : ''}`;
            projectItem.innerHTML = `
                <span>${project.name}</span>
                <i class="fas fa-play"></i>
            `;
            
            projectItem.addEventListener('click', () => {
                this.loadProject(project.id);
            });
            
            projectList.appendChild(projectItem);
        });
    }
    
    async loadProject(projectId) {
        const project = this.loadFromLocalStorage(`project_${projectId}`);
        if (!project) {
            this.showNotification('Projet non trouvé', 'error');
            return;
        }
        
        this.currentProject = project;
        this.tempo = project.tempo;
        this.timeSignature = project.timeSignature;
        
        // Réinitialiser l'interface
        this.clearInterface();
        
        // Recharger les pistes
        if (project.tracks) {
            project.tracks.forEach(trackData => {
                // Reconstruire les pistes
                // Note: Dans une vraie implémentation, il faudrait recharger les fichiers audio
                this.tracks.push(trackData);
                this.addTrackToUI(trackData);
                this.addChannelStrip(trackData);
            });
        }
        
        this.updateProjectList();
        this.showNotification(`Projet "${project.name}" chargé`, 'success');
    }
    
    clearInterface() {
        // Vider les listes
        this.tracks = [];
        
        const trackList = document.getElementById('trackList');
        const mixerChannels = document.getElementById('mixerChannels');
        const arrangeArea = document.getElementById('arrangeArea');
        
        if (trackList) trackList.innerHTML = '';
        if (mixerChannels) mixerChannels.innerHTML = '';
        if (arrangeArea) arrangeArea.innerHTML = '';
    }
    
    switchPanel(panelName) {
        // Mettre à jour les onglets
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.panel === panelName);
        });
        
        // Afficher le contenu correspondant
        const panelContent = document.getElementById('panelContent');
        if (!panelContent) return;
        
        switch(panelName) {
            case 'browser':
                panelContent.innerHTML = this.createBrowserPanel();
                break;
            case 'inspector':
                panelContent.innerHTML = this.createInspectorPanel();
                break;
            case 'plugins':
                panelContent.innerHTML = this.createPluginsPanel();
                break;
            case 'ai':
                panelContent.innerHTML = this.createAIPanel();
                break;
        }
    }
    
    createBrowserPanel() {
        return `
            <div class="browser-panel">
                <div class="file-browser">
                    <div class="file-tree">
                        <h4>Bibliothèque locale</h4>
                        <div>Audio Files (${this.audioFiles.length})</div>
                        <div>Projets (${this.projects.length})</div>
                        <div>Samples</div>
                        <div>Presets</div>
                    </div>
                    <div class="file-list" id="audioFileList">
                        ${this.audioFiles.map(audio => `
                            <div class="file-item" data-file-id="${audio.id}">
                                <div class="file-icon">
                                    <i class="fas fa-music"></i>
                                </div>
                                <div class="file-name">${audio.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    createInspectorPanel() {
        const selectedTrack = this.tracks[0] || null;
        
        return `
            <div style="padding: 20px;">
                <h3>Inspector</h3>
                ${selectedTrack ? `
                    <div class="inspector-track">
                        <h4>${selectedTrack.name}</h4>
                        <div>Type: ${selectedTrack.type}</div>
                        <div>Volume: ${selectedTrack.volume} dB</div>
                        <div>Pan: ${selectedTrack.pan}</div>
                        <div>Mute: ${selectedTrack.mute ? 'Oui' : 'Non'}</div>
                        <div>Solo: ${selectedTrack.solo ? 'Oui' : 'Non'}</div>
                    </div>
                ` : '<p>Aucune piste sélectionnée</p>'}
            </div>
        `;
    }
    
    createPluginsPanel() {
        return `
            <div style="padding: 20px;">
                <h3>Plugins Shine Boyz</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px;">
                    <div class="plugin-card">
                        <i class="fas fa-equalizer"></i>
                        <span>EQ Pro</span>
                    </div>
                    <div class="plugin-card">
                        <i class="fas fa-compress"></i>
                        <span>Compresseur</span>
                    </div>
                    <div class="plugin-card">
                        <i class="fas fa-echo"></i>
                        <span>Reverb</span>
                    </div>
                    <div class="plugin-card">
                        <i class="fas fa-sync"></i>
                        <span>Auto-Tune</span>
                    </div>
                    <div class="plugin-card">
                        <i class="fas fa-sliders-h"></i>
                        <span>Multiband</span>
                    </div>
                    <div class="plugin-card">
                        <i class="fas fa-satellite-dish"></i>
                        <span>Widener</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    createAIPanel() {
        return `
            <div style="padding: 20px;">
                <h3><i class="fas fa-robot"></i> Studio IA Shine Boyz</h3>
                <p style="color: var(--text-dim); margin: 10px 0;">Outils d'intelligence artificielle pour la production musicale</p>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
                    <div class="ai-tool-card">
                        <h4>Séparation STEMS</h4>
                        <p>Sépare les voix, batterie, basse, autres</p>
                        <button class="tool-action" onclick="studio.runAITool('separate')">Démarrer</button>
                    </div>
                    
                    <div class="ai-tool-card">
                        <h4>Recomposition IA</h4>
                        <p>Modifie l'arrangement avec IA</p>
                        <button class="tool-action" onclick="studio.runAITool('recompose')">Démarrer</button>
                    </div>
                    
                    <div class="ai-tool-card">
                        <h4>Génération Instrumentale</h4>
                        <p>Crée un beat original selon le style</p>
                        <button class="tool-action" onclick="studio.runAITool('generate')">Générer</button>
                    </div>
                    
                    <div class="ai-tool-card">
                        <h4>Mastering IA</h4>
                        <p>Mastering automatique professionnel</p>
                        <button class="tool-action" onclick="studio.runAITool('master')">Masteriser</button>
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: var(--hover-color); border-radius: 6px;">
                    <h4>Recomposition Avancée</h4>
                    <p>Importez un morceau complet (voix + instrumental) et l'IA vous proposera:</p>
                    <ul style="margin: 10px 0 10px 20px; color: var(--text-dim);">
                        <li>Nouveaux arrangements</li>
                        <li>Différents styles musicaux</li>
                        <li>Variations d'instrumentation</li>
                        <li>Nouvelles mélodies</li>
                    </ul>
                    <button class="tool-action" style="background: var(--accent-orange);">
                        <i class="fas fa-upload"></i> Importer pour Recomposition
                    </button>
                </div>
            </div>
        `;
    }
    
    async runAITool(tool) {
        this.showNotification(`Lancement de l'outil IA: ${tool}`, 'info');
        
        // Simuler le traitement IA
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        switch(tool) {
            case 'separate':
                this.showNotification('Séparation audio terminée - 4 stems créés', 'success');
                break;
            case 'recompose':
                this.showNotification('Recomposition IA terminée - Nouvel arrangement généré', 'success');
                break;
            case 'generate':
                this.showNotification('Instrumental IA généré - Ajouté aux pistes', 'success');
                // Ajouter un instrumental généré
                this.addGeneratedInstrumental();
                break;
            case 'master':
                this.showNotification('Mastering IA appliqué - Qualité professionnelle', 'success');
                break;
        }
    }
    
    addGeneratedInstrumental() {
        const instrumental = {
            id: `generated_${Date.now()}`,
            name: 'Beat IA Shine Boyz',
            type: 'audio',
            generated: true,
            style: 'Afrobeat',
            tempo: this.tempo,
            duration: 180
        };
        
        this.createAudioTrack(instrumental);
    }
    
    toggleMixer() {
        const mixerWindow = document.getElementById('mixerWindow');
        mixerWindow.style.display = mixerWindow.style.display === 'none' ? 'flex' : 'none';
    }
    
    openFileBrowser(type) {
        const input = document.createElement('input');
        input.type = 'file';
        
        if (type === 'audio') {
            input.accept = 'audio/*';
        } else if (type === 'midi') {
            input.accept = '.mid,.midi';
        }
        
        input.multiple = true;
        
        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleDroppedFiles(files);
        });
        
        input.click();
    }
    
    // Utilitaires de stockage
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Erreur sauvegarde localStorage:', error);
            this.showNotification('Espace de stockage insuffisant', 'error');
        }
    }
    
    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Erreur chargement localStorage:', key, error);
            return null;
        }
    }
    
    // Utilitaires UI
    showNotification(message, type = 'info') {
        // Créer une notification temporaire
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'error' ? 'exclamation-circle' : 
                              type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#00cc88' : 
                         type === 'error' ? '#ff4444' : 
                         type === 'warning' ? '#ffaa00' : '#0099ff'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    addTrack() {
        const trackName = prompt('Nom de la nouvelle piste:', `Piste ${this.tracks.length + 1}`);
        if (!trackName) return;
        
        const track = {
            id: `track_${Date.now()}`,
            name: trackName,
            type: 'audio',
            volume: 0,
            pan: 0,
            mute: false,
            solo: false,
            regions: []
        };
        
        this.tracks.push(track);
        this.addTrackToUI(track);
        this.addChannelStrip(track);
        
        this.showNotification(`Piste "${trackName}" ajoutée`, 'success');
    }
}

// Service Worker pour le mode hors ligne
const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker enregistré:', registration);
        } catch (error) {
            console.error('Erreur Service Worker:', error);
        }
    }
};

// Fichier Service Worker : `sw.js`
const serviceWorkerCode = `
// Service Worker pour Shine Boyz Pro Studio
const CACHE_NAME = 'shine-boyz-pro-v1.0';
const urlsToCache = [
    './',
    './index-pro.html',
    './styles-pro.css',
    './script-pro.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://unpkg.com/wavesurfer.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
`;

// Créer le fichier Service Worker
if (typeof window !== 'undefined') {
    // Enregistrer le Service Worker
    registerServiceWorker();
    
    // Démarrer l'application
    window.addEventListener('load', () => {
        window.studio = new ShineBoyzProStudio();
    });
}