<template>
  <div class="stream-controller">
    <div class="section-header">
      <h2 class="section-title">
        <PlayIcon class="title-icon" />
        Stream Controller
      </h2>
      <p class="section-subtitle">Start streaming to your channels</p>
    </div>
    
    <div class="stream-setup-card">
      <h3 class="card-title">
        <VideoIcon class="card-icon" />
        Stream Setup
      </h3>
      
      <!-- File Selection -->
      <div class="file-section">
        <label class="section-label">
          <FolderIcon class="label-icon" />
          Video File
        </label>
        
        <!-- File Tabs -->
        <div class="file-tabs">
          <button 
            :class="['file-tab', { active: fileMode === 'upload' }]" 
            @click="fileMode = 'upload'"
          >
            <UploadIcon class="tab-icon" />
            Upload New
          </button>
          <button 
            :class="['file-tab', { active: fileMode === 'existing' }]" 
            @click="fileMode = 'existing'; fetchUploadedFiles()"
          >
            <FolderOpenIcon class="tab-icon" />
            Use Existing ({{ uploadedFiles.length }})
          </button>
        </div>
        
        <!-- Upload New File -->
        <div v-if="fileMode === 'upload'" class="upload-section">
          <div class="file-input-wrapper">
            <input type="file" @change="onFile" class="file-input" accept="video/*" />
            <div class="file-display">
              <span v-if="!file" class="file-placeholder">Click to select video file</span>
              <span v-else class="file-name">🎥 {{ file.name }}</span>
            </div>
          </div>
          <div v-if="file" class="upload-actions">
            <button @click="uploadFile" :disabled="uploading" class="btn btn-upload">
              <UploadIcon v-if="!uploading" class="btn-icon" />
              <span v-if="!uploading">Upload File</span>
              <span v-else>⏳ Uploading...</span>
            </button>
          </div>
        </div>
        
        <!-- Existing Files -->
        <div v-else class="existing-files">
          <div v-if="uploadedFiles.length === 0" class="empty-files">
            <FolderIcon class="empty-icon" />
            <p>No uploaded files</p>
            <p class="empty-subtitle">Upload a file first to see it here</p>
          </div>
          <div v-else>
            <div class="playlist-controls">
              <label class="playlist-label">
                <ListIcon class="label-icon" />
                Playlist Mode ({{ selectedFiles.length }} files selected)
              </label>
              <div class="playlist-actions">
                <button @click="selectAllFiles" class="playlist-btn">
                  <CheckSquareIcon class="btn-icon" />
                  Select All
                </button>
                <button @click="clearSelection" class="playlist-btn">
                  <XSquareIcon class="btn-icon" />
                  Clear All
                </button>
              </div>
            </div>
            <div class="files-grid">
              <label v-for="uploadedFile in uploadedFiles" :key="uploadedFile.filename" class="file-option">
                <input type="checkbox" :value="uploadedFile.filename" v-model="selectedFiles" class="checkbox-input" />
                <div class="file-card">
                  <VideoIcon class="file-icon" />
                  <div class="file-info">
                    <span class="file-title">{{ uploadedFile.originalName || uploadedFile.filename }}</span>
                    <span class="file-meta">{{ formatFileSize(uploadedFile.size) }} • {{ formatDate(uploadedFile.uploadedAt) }}</span>
                  </div>
                  <div class="file-actions">
                    <button @click.stop="downloadFile(uploadedFile.filename)" class="action-btn download-btn" title="Download">
                      <DownloadIcon class="action-icon" />
                    </button>
                    <button @click.stop="deleteFile(uploadedFile.filename)" class="action-btn delete-btn" title="Delete">
                      <TrashIcon class="action-icon" />
                    </button>
                  </div>
                  <span class="checkbox-check">✓</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Channel Selection -->
      <div class="channels-section">
        <label class="section-label">
          <TvIcon class="label-icon" />
          Select Channels ({{ selected.length }}/{{ channels.length }})
        </label>
        <div v-if="channels.length === 0" class="empty-channels">
          <TvIcon class="empty-icon" />
          <p>No channels available</p>
          <p class="empty-subtitle">Add channels first to start streaming</p>
        </div>
        <div v-else class="channels-grid">
          <label v-for="c in channels" :key="c.id" class="channel-checkbox">
            <input type="checkbox" :value="c.id" v-model="selected" class="checkbox-input" />
            <div class="checkbox-card">
              <TvIcon class="channel-icon" />
              <span class="channel-name">{{ c.name }}</span>
              <span class="check-mark">✓</span>
            </div>
          </label>
        </div>
      </div>
      
      <!-- Stream Mode -->
      <div class="mode-section">
        <label class="section-label">
          <SettingsIcon class="label-icon" />
          Stream Mode
        </label>
        <div class="mode-options">
          <label class="mode-option">
            <input type="radio" value="per_channel" v-model="mode" class="radio-input" />
            <div class="mode-card">
              <RefreshCwIcon class="mode-icon" />
              <div class="mode-info">
                <span class="mode-title">Per Channel</span>
                <span class="mode-desc">Separate process for each channel</span>
              </div>
            </div>
          </label>
          <label class="mode-option">
            <input type="radio" value="tee" v-model="mode" class="radio-input" />
            <div class="mode-card">
              <ZapIcon class="mode-icon" />
              <div class="mode-info">
                <span class="mode-title">Tee Mode</span>
                <span class="mode-desc">Single process to all channels</span>
              </div>
            </div>
          </label>
        </div>
      </div>
      
      <!-- Control Buttons -->
      <div class="control-section">
        <button @click="start" :disabled="(!file && selectedFiles.length===0) || selected.length===0 || streaming || store.activeStreamId" class="btn btn-start">
          <PlayIcon v-if="!streaming" class="btn-icon" />
          <span v-if="!streaming && !store.activeStreamId">Start Stream</span>
          <span v-else-if="streaming">⏳ Starting...</span>
          <span v-else>Stream Active</span>
        </button>
        <button @click="stop" :disabled="!store.activeStreamId" class="btn btn-stop">
          <StopCircleIcon class="btn-icon" />
          Stop Stream
        </button>
      </div>
      
      <!-- Status -->
      <div v-if="status || store.activeStreamId" class="status-section">
        <div v-if="store.activeStreamId" class="stream-active-card">
          <div class="active-header">
            <div class="active-indicator">
              <div class="pulse-dot"></div>
              <PlayIcon class="active-icon" />
            </div>
            <div class="active-info">
              <h4 class="active-title">Stream Active</h4>
              <p class="active-details">Streaming to {{ selected.length || 'selected' }} channels</p>
            </div>
            <div class="active-actions">
              <button @click="stop" class="btn-stop-inline">
                <StopCircleIcon class="stop-icon" />
                Stop
              </button>
            </div>
          </div>
        </div>
        <div v-else-if="status" :class="['status-message', statusType]">
          <span class="status-icon">{{ statusIcon }}</span>
          <span>{{ status }}</span>
        </div>
      </div>
    </div>
    
    <!-- FFmpeg Log -->
    <div v-if="store.activeStreamId" class="log-section">
      <h3 class="log-title">
        <TerminalIcon class="log-icon" />
        FFmpeg Output
      </h3>
      <div class="log-container">
        <pre class="log-content">{{ log || 'Waiting for output...' }}</pre>
        <button @click="clearLog" class="clear-log-btn">
          <TrashIcon class="clear-icon" />
          Clear
        </button>
      </div>
    </div>
    
    <!-- Delete File Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirm" class="delete-modal">
        <div class="modal-overlay" @click="cancelDelete"></div>
        <div class="delete-modal-content">
          <TrashIcon class="delete-icon" />
          <h3 class="delete-title">Delete File</h3>
          <p class="delete-message">
            Are you sure you want to delete <strong>"{{ deleteConfirm.name }}"</strong>?
            <br><span class="delete-warning">This action cannot be undone.</span>
          </p>
          <div class="delete-actions">
            <button @click="cancelDelete" class="btn btn-cancel">
              <XIcon class="btn-icon" />
            Cancel
            </button>
            <button @click="confirmDelete" class="btn btn-danger">
              <TrashIcon class="btn-icon" />
            Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<script setup>
import { ref, computed, watch, onMounted, Teleport } from 'vue'
import { PlayIcon, VideoIcon, FolderIcon, UploadIcon, FolderOpenIcon, DownloadIcon, TrashIcon, TvIcon, SettingsIcon, RefreshCwIcon, ZapIcon, StopCircleIcon, TerminalIcon, XIcon, ListIcon, CheckSquareIcon, XSquareIcon } from 'lucide-vue-next'
import { io } from 'socket.io-client'
import { store } from '../main'
const backend = __BACKEND__
const channels = ref([])
const selected = ref([])
const status = ref('')
const file = ref(null)
const fileMode = ref('upload')
const uploadedFiles = ref([])
const selectedFiles = ref([])
// Use store for persistent state
const activeStreamId = computed(() => store.activeStreamId)
const setActiveStreamId = (id) => { store.activeStreamId = id }
const mode = ref('per_channel')
const log = ref('')
const streaming = ref(false)
const uploading = ref(false)
const deleteConfirm = ref(null)
const statusType = ref('')
const statusIcon = ref('')
let socket
async function fetchChannels(){
  const res = await fetch(`${backend}/channels`, { headers: { Authorization:`Bearer ${store.token}` } })
  channels.value = await res.json()
}

async function checkActiveStreams(){
  try {
    const res = await fetch(`${backend}/active-streams`, { headers: { Authorization:`Bearer ${store.token}` } })
    if (res.ok) {
      const streams = await res.json()
      if (streams.length > 0) {
        const stream = streams[0] // Get latest active stream
        setActiveStreamId(stream.id)
        store.streamStatus = `Stream active (ID: ${stream.id})`
        connectSocket()
      }
    }
  } catch (error) {
    console.error('Failed to check active streams:', error)
  }
}
function onFile(e){ 
  file.value = e.target.files[0]
  selectedFiles.value = []
}

async function uploadFile() {
  if (!file.value) return
  
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('video', file.value)
    
    const res = await fetch(`${backend}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${store.token}` },
      body: fd
    })
    
    if (res.ok) {
      file.value = null
      await fetchUploadedFiles()
      fileMode.value = 'existing'
      status.value = 'File uploaded successfully!'
      statusType.value = 'success'
      statusIcon.value = '✅'
      setTimeout(() => { status.value = '' }, 5000)
    } else {
      status.value = await res.text()
      statusType.value = 'error'
      statusIcon.value = '⚠️'
    }
  } catch (error) {
    status.value = 'Upload failed'
    statusType.value = 'error'
    statusIcon.value = '⚠️'
    setTimeout(() => { status.value = '' }, 5000)
  } finally {
    uploading.value = false
  }
}

async function fetchUploadedFiles(){
  try {
    const res = await fetch(`${backend}/uploaded-files`, { 
      headers: { Authorization: `Bearer ${store.token}` } 
    })
    if (res.ok) {
      uploadedFiles.value = await res.json()
    }
  } catch (error) {
    console.error('Failed to fetch uploaded files:', error)
  }
}

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown size'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date'
  return new Date(dateString).toLocaleDateString()
}

async function downloadFile(filename) {
  try {
    const res = await fetch(`${backend}/download-file/${filename}`, {
      headers: { Authorization: `Bearer ${store.token}` }
    })
    
    if (res.ok) {
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } else {
      alert('Failed to download file')
    }
  } catch (error) {
    alert('Error downloading file')
  }
}

function deleteFile(filename) {
  deleteConfirm.value = { filename, name: filename }
}

function confirmDelete() {
  if (deleteConfirm.value) {
    performDelete(deleteConfirm.value.filename)
    deleteConfirm.value = null
  }
}

function cancelDelete() {
  deleteConfirm.value = null
}

async function performDelete(filename) {
  try {
    const res = await fetch(`${backend}/delete-file/${filename}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${store.token}` }
    })
    
    if (res.ok) {
      await fetchUploadedFiles()
      const index = selectedFiles.value.indexOf(filename)
      if (index > -1) {
        selectedFiles.value.splice(index, 1)
      }
    } else {
      alert('Failed to delete file')
    }
  } catch (error) {
    alert('Error deleting file')
  }
}
async function start(){
  status.value=''; streaming.value=true
  try {
    let filename
    
    if (fileMode.value === 'upload') {
      if (!file.value) return
      const fd = new FormData(); fd.append('video', file.value)
      const up = await fetch(`${backend}/upload`, { method:'POST', headers:{ Authorization:`Bearer ${store.token}` }, body: fd })
      if (!up.ok){ 
        status.value = await up.text()
        statusType.value = 'error'
        statusIcon.value = '⚠️'
        return 
      }
      const uploadResult = await up.json()
      filename = uploadResult.filename
    } else {
      if (selectedFiles.value.length === 0) {
        status.value = 'Please select at least one file'
        statusType.value = 'error'
        statusIcon.value = '⚠️'
        setTimeout(() => { status.value = '' }, 5000)
        return
      }
      filename = selectedFiles.value
    }
    
    const res = await fetch(`${backend}/stream/start`, {
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${store.token}` },
      body: JSON.stringify({ files: filename, channelIds: selected.value, mode: mode.value })
    })
    if (!res.ok){ 
      status.value = await res.text()
      statusType.value = 'error'
      statusIcon.value = '⚠️'
      return 
    }
    const data = await res.json()
    setActiveStreamId(data.activeStreamId)
    store.streamStatus = `Streaming started to ${selected.value.length} channels`
    status.value = `Streaming started to ${selected.value.length} channels`
    statusType.value = 'success'
    statusIcon.value = '✅'
    setTimeout(() => { status.value = '' }, 5000)
    connectSocket()
  } finally {
    streaming.value = false
  }
}
async function stop(){
  if (!store.activeStreamId) return
  const res = await fetch(`${backend}/stream/stop`, {
    method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${store.token}` },
    body: JSON.stringify({ activeStreamId: store.activeStreamId })
  })
  if (!res.ok){ 
    status.value = await res.text()
    statusType.value = 'error'
    statusIcon.value = '⚠️'
    return 
  }
  setActiveStreamId(null)
  store.streamStatus = ''
  status.value = 'Stream stopped successfully'
  statusType.value = 'info'
  statusIcon.value = '🛑'
  setTimeout(() => { status.value = '' }, 5000)
  log.value = ''
}

function selectAllFiles() {
  selectedFiles.value = uploadedFiles.value.map(f => f.filename)
}

function clearSelection() {
  selectedFiles.value = []
}

function clearLog(){
  log.value = ''
}
function connectSocket(){
  if (socket) return
  socket = io(backend, { transports:['websocket'] })
  socket.on('connect', ()=>{
    socket.emit('auth', store.token)
  })
  socket.on('authed', (p)=>{
    if (!p.ok) return
  })
  socket.on('ffmpeg_log', (m)=>{
    if (store.activeStreamId && m.jobId === store.activeStreamId){
      log.value += m.line
      if (log.value.length > 20000) log.value = log.value.slice(-20000)
    }
  })
}
// Watch for channel updates from other components
watch(() => store.channelsUpdated, () => {
  fetchChannels()
})

onMounted(()=>{ fetchChannels(); fetchUploadedFiles(); checkActiveStreams(); if (store.token) connectSocket() })
</script>
<style scoped>
.stream-controller {
  max-width: 1000px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 2rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.title-icon {
  width: 2rem;
  height: 2rem;
}

.section-subtitle {
  color: #718096;
  font-size: 1rem;
}

.stream-setup-card {
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid #e2e8f0;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 2rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.card-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.file-section {
  margin-bottom: 2rem;
}

.file-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.file-tab {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  color: #4a5568;
}

.file-tab.active {
  border-color: #667eea;
  background: #f0f4ff;
  color: #667eea;
}

.file-tab:hover:not(.active) {
  border-color: #cbd5e0;
  background: #f7fafc;
}

.upload-section {
  margin-top: 1rem;
}

.upload-actions {
  margin-top: 1rem;
  text-align: center;
}

.btn-upload {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1rem;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-upload:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.existing-files {
  margin-top: 1rem;
}

.empty-files {
  text-align: center;
  padding: 2rem;
  color: #718096;
}

.files-grid {
  display: grid;
  gap: 1rem;
}

.file-option {
  cursor: pointer;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.radio-input:checked + .file-card {
  border-color: #667eea;
  background: #f0f4ff;
}

.file-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #667eea;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-title {
  font-weight: 500;
  color: #2d3748;
}

.file-meta {
  font-size: 0.9rem;
  color: #718096;
}

.checkbox-check {
  opacity: 0;
  color: #667eea;
  font-weight: bold;
  transition: opacity 0.3s ease;
}

.file-option .checkbox-input:checked + .file-card .checkbox-check {
  opacity: 1;
}

.file-option .checkbox-input:checked + .file-card {
  border-color: #667eea;
  background: #f0f4ff;
}

.playlist-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.playlist-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #4a5568;
}

.playlist-actions {
  display: flex;
  gap: 0.5rem;
}

.playlist-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  font-weight: 500;
  color: #4a5568;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.playlist-btn:hover {
  border-color: #667eea;
  background: #f0f4ff;
  color: #667eea;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.download-btn {
  background: #e6fffa;
  color: #319795;
}

.download-btn:hover {
  background: #b2f5ea;
  transform: translateY(-1px);
}

.delete-btn {
  background: #fed7d7;
  color: #e53e3e;
}

.delete-btn:hover {
  background: #feb2b2;
  transform: translateY(-1px);
}

.action-icon {
  width: 1rem;
  height: 1rem;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.tab-icon {
  width: 1rem;
  height: 1rem;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  color: #cbd5e0;
  margin-bottom: 1rem;
}

.delete-modal {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 999999 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.modal-overlay {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background: rgba(0, 0, 0, 0.6) !important;
  backdrop-filter: blur(8px) !important;
}

.delete-modal-content {
  position: relative !important;
  background: white !important;
  border-radius: 20px !important;
  padding: 2rem !important;
  max-width: 400px !important;
  width: 90% !important;
  text-align: center !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
  animation: modalSlideIn 0.3s ease-out !important;
  z-index: 1000000 !important;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.delete-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  filter: drop-shadow(0 4px 8px rgba(239, 68, 68, 0.3));
}

.delete-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #dc2626;
  margin-bottom: 1rem;
}

.delete-message {
  color: #4b5563;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.delete-warning {
  color: #ef4444;
  font-size: 0.9rem;
  font-weight: 500;
}

.delete-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-cancel {
  background: #f3f4f6;
  color: #6b7280;
  border: 2px solid #e5e7eb;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel:hover {
  background: #e5e7eb;
  color: #4b5563;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
}

.upload-label {
  display: block;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 0.5rem;
}

.file-input-wrapper {
  position: relative;
}

.file-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.file-display {
  padding: 1rem;
  border: 2px dashed #cbd5e0;
  border-radius: 12px;
  text-align: center;
  background: white;
  transition: all 0.3s ease;
  cursor: pointer;
}

.file-display:hover {
  border-color: #667eea;
  background: #f7fafc;
}

.file-placeholder {
  color: #a0aec0;
}

.file-name {
  color: #2d3748;
  font-weight: 500;
}

.channels-section {
  margin-bottom: 2rem;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 1rem;
}

.label-icon {
  width: 1rem;
  height: 1rem;
}

.empty-channels {
  text-align: center;
  padding: 2rem;
  color: #718096;
}

.empty-subtitle {
  font-size: 0.9rem;
  opacity: 0.8;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.channel-checkbox {
  cursor: pointer;
}

.checkbox-input {
  display: none;
}

.checkbox-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.checkbox-input:checked + .checkbox-card {
  border-color: #667eea;
  background: #f0f4ff;
}

.channel-icon {
  width: 1.2rem;
  height: 1.2rem;
  color: #667eea;
}

.channel-name {
  flex: 1;
  font-weight: 500;
  color: #2d3748;
}

.check-mark {
  opacity: 0;
  color: #667eea;
  font-weight: bold;
  transition: opacity 0.3s ease;
}

.checkbox-input:checked + .checkbox-card .check-mark {
  opacity: 1;
}

.mode-section {
  margin-bottom: 2rem;
}

.mode-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.mode-option {
  cursor: pointer;
}

.radio-input {
  display: none;
}

.mode-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.radio-input:checked + .mode-card {
  border-color: #667eea;
  background: #f0f4ff;
}

.mode-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #667eea;
}

.mode-info {
  display: flex;
  flex-direction: column;
}

.mode-title {
  font-weight: 600;
  color: #2d3748;
}

.mode-desc {
  font-size: 0.9rem;
  color: #718096;
}

.control-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.btn {
  flex: 1;
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.btn-start {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);
}

.btn-start:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(72, 187, 120, 0.4);
}

.btn-stop {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(245, 101, 101, 0.3);
}

.btn-stop:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(245, 101, 101, 0.4);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.status-section {
  margin-top: 1rem;
}

.stream-active-card {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  border-radius: 16px;
  padding: 1.5rem;
  color: white;
  box-shadow: 0 8px 25px rgba(72, 187, 120, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.active-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.active-indicator {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #ff4444;
  border-radius: 50%;
  animation: pulse 2s infinite;
  top: -2px;
  right: -2px;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(255, 68, 68, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(255, 68, 68, 0);
  }
}

.active-icon {
  width: 2rem;
  height: 2rem;
  color: white;
}

.active-info {
  flex: 1;
}

.active-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: white;
}

.active-details {
  font-size: 0.9rem;
  margin: 0;
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.9);
}

.active-actions {
  display: flex;
  align-items: center;
}

.btn-stop-inline {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  box-shadow: 0 4px 15px rgba(245, 101, 101, 0.3);
}

.btn-stop-inline:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(245, 101, 101, 0.4);
}

.stop-icon {
  width: 1rem;
  height: 1rem;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 12px;
  font-weight: 500;
}

.status-message.success {
  background: #c6f6d5;
  color: #2f855a;
  border-left: 4px solid #38a169;
}

.status-message.error {
  background: #fed7d7;
  color: #c53030;
  border-left: 4px solid #e53e3e;
}

.status-message.info {
  background: #bee3f8;
  color: #2b6cb0;
  border-left: 4px solid #3182ce;
}

.log-section {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.log-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.log-icon {
  width: 1.3rem;
  height: 1.3rem;
}

.log-container {
  position: relative;
  background: #1a202c;
  border-radius: 12px;
  overflow: hidden;
}

.log-content {
  height: 300px;
  overflow: auto;
  background: #1a202c;
  color: #68d391;
  padding: 1rem;
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.clear-log-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(255,255,255,0.1);
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.clear-icon {
  width: 0.8rem;
  height: 0.8rem;
}

.clear-log-btn:hover {
  background: rgba(255,255,255,0.2);
}

@media (max-width: 768px) {
  .channels-grid {
    grid-template-columns: 1fr;
  }
  
  .mode-options {
    grid-template-columns: 1fr;
  }
  
  .control-section {
    flex-direction: column;
  }
}
</style>
