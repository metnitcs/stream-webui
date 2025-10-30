<template>
  <div class="schedule-manager">
    <div class="section-header">
      <h2 class="section-title">
        <CalendarIcon class="title-icon" />
        Schedule Manager
      </h2>
      <p class="section-subtitle">Schedule streams for later</p>
    </div>
    
    <div class="schedule-setup-card">
      <h3 class="card-title">
        <ClockIcon class="card-icon" />
        Create Schedule
      </h3>
      
      <!-- Input Mode Selection -->
      <div class="input-mode-section">
        <label class="section-label">
          <SettingsIcon class="label-icon" />
          Input Mode
        </label>
        <div class="input-mode-tabs">
          <button 
            :class="['mode-tab', { active: inputMode === 'standard' }]" 
            @click="inputMode = 'standard'; resetSelections()"
          >
            <VideoIcon class="tab-icon" />
            Standard
          </button>
          <button 
            :class="['mode-tab', { active: inputMode === 'multi' }]" 
            @click="inputMode = 'multi'; resetSelections()"
          >
            <SplitIcon class="tab-icon" />
            Multi-Input
          </button>
        </div>
      </div>
      
      <!-- File Selection -->
      <div class="file-section">
        <label class="section-label">
          <FolderIcon class="label-icon" />
          {{ inputMode === 'multi' ? 'Select Files' : 'Video Files' }}
        </label>
        <div v-if="uploadedFiles.length === 0" class="empty-files">
          <FolderIcon class="empty-icon" />
          <p>No uploaded files</p>
          <p class="empty-subtitle">Upload files first to schedule streams</p>
        </div>
        <div v-else>
          <!-- Multi-Input Mode -->
          <div v-if="inputMode === 'multi'" class="multi-input-section">
            <div class="multi-input-controls">
              <label class="multi-label">
                <VideoIcon class="label-icon" />
                Video Sources ({{ selectedVideoFiles.length }} selected)
              </label>
              <label class="multi-label">
                <VolumeXIcon class="label-icon" />
                Audio Sources ({{ selectedAudioFiles.length }} selected)
              </label>
              <div class="multi-actions">
                <button @click="clearVideoSelection" class="clear-btn">
                  <XIcon class="clear-icon" />
                  Clear Videos
                </button>
                <button @click="clearAudioSelection" class="clear-btn">
                  <XIcon class="clear-icon" />
                  Clear Audios
                </button>
              </div>
            </div>
            <div class="files-grid multi-grid">
              <label v-for="uploadedFile in uploadedFiles" :key="uploadedFile.filename" class="file-option multi-option">
                <div class="file-card multi-card">
                  <VideoIcon class="file-icon" />
                  <div class="file-info">
                    <span class="file-title">{{ uploadedFile.originalName || uploadedFile.filename }}</span>
                    <span class="file-meta">{{ formatFileSize(uploadedFile.size) }}</span>
                  </div>
                  <div class="multi-selectors">
                    <button 
                      @click="toggleVideoSelection(uploadedFile.filename)" 
                      :class="['selector-btn', 'video-btn', { active: selectedVideoFiles.includes(uploadedFile.filename) }]"
                      :title="selectedVideoFiles.includes(uploadedFile.filename) ? 'Remove from Videos' : 'Add to Videos'"
                    >
                      <VideoIcon class="selector-icon" />
                      <span v-if="selectedVideoFiles.includes(uploadedFile.filename)" class="selection-number">
                        {{ selectedVideoFiles.indexOf(uploadedFile.filename) + 1 }}
                      </span>
                    </button>
                    <button 
                      @click="toggleAudioSelection(uploadedFile.filename)" 
                      :class="['selector-btn', 'audio-btn', { active: selectedAudioFiles.includes(uploadedFile.filename) }]"
                      :title="selectedAudioFiles.includes(uploadedFile.filename) ? 'Remove from Audios' : 'Add to Audios'"
                    >
                      <VolumeXIcon class="selector-icon" />
                      <span v-if="selectedAudioFiles.includes(uploadedFile.filename)" class="selection-number">
                        {{ selectedAudioFiles.indexOf(uploadedFile.filename) + 1 }}
                      </span>
                    </button>
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          <!-- Standard Mode -->
          <div v-else class="standard-input-section">
            <div class="playlist-controls">
              <label class="playlist-label">
                <ListIcon class="label-icon" />
                Selected Files ({{ selectedFiles.length }})
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
                    <span class="file-meta">{{ formatFileSize(uploadedFile.size) }}</span>
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
          Select Channels ({{ selectedChannels.length }}/{{ channels.length }})
        </label>
        <div v-if="channels.length === 0" class="empty-channels">
          <TvIcon class="empty-icon" />
          <p>No channels available</p>
          <p class="empty-subtitle">Add channels first to schedule streams</p>
        </div>
        <div v-else class="channels-grid">
          <label v-for="c in channels" :key="c.id" class="channel-checkbox">
            <input type="checkbox" :value="c.id" v-model="selectedChannels" class="checkbox-input" />
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
      
      <!-- Schedule Time -->
      <div class="schedule-section">
        <label class="section-label">
          <CalendarIcon class="label-icon" />
          Schedule Time
        </label>
        <div class="datetime-input">
          <input type="datetime-local" v-model="scheduleTime" class="datetime-field" />
        </div>
      </div>
      
      <!-- Create Schedule Button -->
      <div class="control-section">
        <button @click="createSchedule" :disabled="!canSchedule || creating" class="btn btn-schedule">
          <CalendarPlusIcon v-if="!creating" class="btn-icon" />
          <span v-if="!creating">Create Schedule</span>
          <span v-else>⏳ Creating...</span>
        </button>
      </div>
      
      <!-- Status -->
      <div v-if="status" class="status-section">
        <div :class="['status-message', statusType]">
          <span class="status-icon">{{ statusIcon }}</span>
          <span>{{ status }}</span>
        </div>
      </div>
    </div>
    
    <!-- Scheduled Streams -->
    <div class="schedules-section">
      <div class="schedules-header">
        <h3 class="section-subtitle">
          <ListIcon class="subtitle-icon" />
          Scheduled Streams ({{ schedules.length }})
        </h3>
        <button @click="fetchSchedules" class="refresh-btn" title="Refresh">
          <RefreshCwIcon class="refresh-icon" />
        </button>
      </div>
      <div v-if="schedules.length === 0" class="empty-schedules">
        <CalendarIcon class="empty-icon" />
        <p>No scheduled streams</p>
        <p class="empty-subtitle">Create your first schedule above</p>
      </div>
      <div v-else class="schedules-grid">
        <div v-for="schedule in schedules" :key="schedule.id" class="schedule-card">
          <div class="schedule-header">
            <div class="schedule-info">
              <h4 class="schedule-title">
                <CalendarIcon class="schedule-icon" />
                {{ formatScheduleTime(schedule.start_at) }}
              </h4>
              <div class="schedule-meta">
                <span class="schedule-files">
                  <VideoIcon class="meta-icon" />
                  {{ getFileCount(schedule.input_file) }} files
                </span>
                <span class="schedule-channels">
                  <TvIcon class="meta-icon" />
                  {{ schedule.channel_ids.length }} channels
                </span>
                <span class="schedule-mode">
                  <SettingsIcon class="meta-icon" />
                  {{ schedule.mode }}
                </span>
              </div>
            </div>
            <div class="schedule-actions">
              <span :class="['status-badge', schedule.status]">
                {{ schedule.status }}
              </span>
              <div class="action-buttons">
                <button v-if="schedule.status === 'running'" @click="stopSchedule(schedule.id)" class="action-btn stop-btn" title="Stop Stream">
                  <StopCircleIcon class="action-icon" />
                </button>
                <button v-if="schedule.status === 'pending'" @click="editSchedule(schedule)" class="action-btn edit-btn" title="Edit">
                  <EditIcon class="action-icon" />
                </button>
                <button @click="deleteSchedule(schedule.id)" class="action-btn delete-btn" title="Delete">
                  <TrashIcon class="action-icon" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Delete Schedule Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirm" class="delete-modal">
        <div class="modal-overlay" @click="cancelDelete"></div>
        <div class="delete-modal-content">
          <TrashIcon class="delete-icon" />
          <h3 class="delete-title">Delete Schedule</h3>
          <p class="delete-message">
            Are you sure you want to delete the schedule for <strong>"{{ deleteConfirm.name }}"</strong>?
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
    
    <!-- Stop Schedule Confirmation Modal -->
    <Teleport to="body">
      <div v-if="stopConfirm" class="stop-modal">
        <div class="modal-overlay" @click="cancelStop"></div>
        <div class="stop-modal-content">
          <StopCircleIcon class="stop-icon" />
          <h3 class="stop-title">Stop Stream</h3>
          <p class="stop-message">
            Are you sure you want to stop the scheduled stream for <strong>"{{ stopConfirm.name }}"</strong>?
            <br><span class="stop-warning">The stream will be terminated immediately.</span>
          </p>
          <div class="stop-actions">
            <button @click="cancelStop" class="btn btn-cancel">
              <XIcon class="btn-icon" />
              Cancel
            </button>
            <button @click="confirmStop" class="btn btn-stop">
              <StopCircleIcon class="btn-icon" />
              Stop Stream
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, Teleport } from 'vue'
import { CalendarIcon, ClockIcon, FolderIcon, ListIcon, CheckSquareIcon, XSquareIcon, VideoIcon, TvIcon, SettingsIcon, RefreshCwIcon, ZapIcon, CalendarPlusIcon, StopCircleIcon, EditIcon, TrashIcon, XIcon, SplitIcon, VolumeXIcon } from 'lucide-vue-next'
import { store } from '../main'

const backend = __BACKEND__
const uploadedFiles = ref([])
const selectedFiles = ref([])
const selectedVideoFiles = ref([])
const selectedAudioFiles = ref([])
const inputMode = ref('standard')
const channels = ref([])
const selectedChannels = ref([])
const mode = ref('per_channel')
const scheduleTime = ref('')
const schedules = ref([])
const status = ref('')
const statusType = ref('')
const statusIcon = ref('')
const creating = ref(false)
const deleteConfirm = ref(null)
const stopConfirm = ref(null)
let refreshInterval = null

const canSchedule = computed(() => {
  const hasFiles = inputMode.value === 'multi' 
    ? (selectedVideoFiles.value.length > 0 && selectedAudioFiles.value.length > 0)
    : selectedFiles.value.length > 0
  
  return hasFiles && selectedChannels.value.length > 0 && scheduleTime.value
})

async function fetchUploadedFiles() {
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

async function fetchChannels() {
  const res = await fetch(`${backend}/channels`, { headers: { Authorization:`Bearer ${store.token}` } })
  channels.value = await res.json()
}

async function fetchSchedules() {
  try {
    const res = await fetch(`${backend}/schedules`, { headers: { Authorization:`Bearer ${store.token}` } })
    if (res.ok) {
      schedules.value = await res.json()
    }
  } catch (error) {
    console.error('Failed to fetch schedules:', error)
  }
}

function selectAllFiles() {
  selectedFiles.value = uploadedFiles.value.map(f => f.filename)
}

function clearSelection() {
  selectedFiles.value = []
}

function resetSelections() {
  selectedFiles.value = []
  selectedVideoFiles.value = []
  selectedAudioFiles.value = []
}

function toggleVideoSelection(filename) {
  const index = selectedVideoFiles.value.indexOf(filename)
  if (index > -1) {
    selectedVideoFiles.value.splice(index, 1)
  } else {
    selectedVideoFiles.value.push(filename)
  }
}

function toggleAudioSelection(filename) {
  const index = selectedAudioFiles.value.indexOf(filename)
  if (index > -1) {
    selectedAudioFiles.value.splice(index, 1)
  } else {
    selectedAudioFiles.value.push(filename)
  }
}

function clearVideoSelection() {
  selectedVideoFiles.value = []
}

function clearAudioSelection() {
  selectedAudioFiles.value = []
}

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown size'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function formatScheduleTime(dateString) {
  // Parse UTC timestamp and display in local timezone
  const date = new Date(dateString)
  
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function getFileCount(inputFile) {
  try {
    return JSON.parse(inputFile).length
  } catch {
    return 1
  }
}

async function createSchedule() {
  if (!canSchedule.value) return
  
  creating.value = true
  status.value = ''
  
  try {
    const res = await fetch(`${backend}/schedules`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${store.token}` 
      },
      body: JSON.stringify({
        ...(inputMode.value === 'multi' ? {
          videoFiles: selectedVideoFiles.value,
          audioFiles: selectedAudioFiles.value,
          inputType: 'multi'
        } : {
          files: selectedFiles.value,
          inputType: 'standard'
        }),
        channelIds: selectedChannels.value,
        mode: mode.value,
        startAt: new Date(scheduleTime.value).toISOString()
      })
    })
    
    if (res.ok) {
      status.value = 'Schedule created successfully!'
      statusType.value = 'success'
      statusIcon.value = '✅'
      setTimeout(() => { status.value = '' }, 5000)
      
      // Reset form
      resetSelections()
      selectedChannels.value = []
      scheduleTime.value = ''
      
      // Refresh schedules
      await fetchSchedules()
    } else {
      status.value = await res.text()
      statusType.value = 'error'
      statusIcon.value = '⚠️'
      setTimeout(() => { status.value = '' }, 5000)
    }
  } catch (error) {
    status.value = 'Failed to create schedule'
    statusType.value = 'error'
    statusIcon.value = '⚠️'
    setTimeout(() => { status.value = '' }, 5000)
  } finally {
    creating.value = false
  }
}

function stopSchedule(scheduleId) {
  const schedule = schedules.value.find(s => s.id === scheduleId)
  stopConfirm.value = { 
    id: scheduleId, 
    name: formatScheduleTime(schedule.start_at)
  }
}

function confirmStop() {
  if (stopConfirm.value) {
    performStop(stopConfirm.value.id)
    stopConfirm.value = null
  }
}

function cancelStop() {
  stopConfirm.value = null
}

async function performStop(scheduleId) {
  try {
    // Find active stream for this schedule and stop it
    const res = await fetch(`${backend}/active-streams`, { headers: { Authorization: `Bearer ${store.token}` } })
    if (res.ok) {
      const streams = await res.json()
      const activeStream = streams.find(s => s.id) // Find the active stream
      if (activeStream) {
        await fetch(`${backend}/stream/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.token}` },
          body: JSON.stringify({ activeStreamId: activeStream.id })
        })
      }
    }
    await fetchSchedules()
  } catch (error) {
    alert('Failed to stop schedule')
  }
}

function editSchedule(schedule) {
  // Populate form with schedule data
  try {
    const inputData = JSON.parse(schedule.input_file)
    if (inputData.type === 'multi') {
      inputMode.value = 'multi'
      selectedVideoFiles.value = inputData.videoFiles || []
      selectedAudioFiles.value = inputData.audioFiles || []
      selectedFiles.value = []
    } else {
      inputMode.value = 'standard'
      selectedFiles.value = inputData.files || [inputData]
      selectedVideoFiles.value = []
      selectedAudioFiles.value = []
    }
  } catch {
    inputMode.value = 'standard'
    selectedFiles.value = [schedule.input_file]
    selectedVideoFiles.value = []
    selectedAudioFiles.value = []
  }
  selectedChannels.value = schedule.channel_ids
  mode.value = schedule.mode
  
  // Convert UTC back to local datetime for editing
  const localDate = new Date(schedule.start_at)
  const year = localDate.getFullYear()
  const month = String(localDate.getMonth() + 1).padStart(2, '0')
  const day = String(localDate.getDate()).padStart(2, '0')
  const hours = String(localDate.getHours()).padStart(2, '0')
  const minutes = String(localDate.getMinutes()).padStart(2, '0')
  scheduleTime.value = `${year}-${month}-${day}T${hours}:${minutes}`
  
  // Delete the old schedule
  deleteSchedule(schedule.id, false)
}

function deleteSchedule(scheduleId, confirm = true) {
  if (!confirm) {
    performDelete(scheduleId)
    return
  }
  
  const schedule = schedules.value.find(s => s.id === scheduleId)
  deleteConfirm.value = { 
    id: scheduleId, 
    name: formatScheduleTime(schedule.start_at)
  }
}

function confirmDelete() {
  if (deleteConfirm.value) {
    performDelete(deleteConfirm.value.id)
    deleteConfirm.value = null
  }
}

function cancelDelete() {
  deleteConfirm.value = null
}

async function performDelete(scheduleId) {
  try {
    const res = await fetch(`${backend}/schedules/${scheduleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${store.token}` }
    })
    
    if (res.ok) {
      await fetchSchedules()
    } else {
      alert('Failed to delete schedule')
    }
  } catch (error) {
    alert('Error deleting schedule')
  }
}

onMounted(() => {
  fetchUploadedFiles()
  fetchChannels()
  fetchSchedules()
  
  // Auto-refresh schedules every 30 seconds
  refreshInterval = setInterval(() => {
    fetchSchedules()
  }, 30000)
})

// Cleanup interval on unmount
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.schedule-manager {
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

.schedule-setup-card {
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

.file-section, .channels-section, .mode-section, .schedule-section {
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

.empty-files, .empty-channels {
  text-align: center;
  padding: 2rem;
  color: #718096;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  color: #cbd5e0;
  margin-bottom: 1rem;
}

.empty-subtitle {
  font-size: 0.9rem;
  opacity: 0.8;
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

.checkbox-input {
  display: none;
}

.checkbox-input:checked + .file-card {
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

.checkbox-input:checked + .file-card .checkbox-check {
  opacity: 1;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.channel-checkbox {
  cursor: pointer;
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

.datetime-input {
  display: flex;
  justify-content: center;
}

.datetime-field {
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  transition: all 0.3s ease;
  min-width: 250px;
}

.datetime-field:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.control-section {
  text-align: center;
  margin-bottom: 1rem;
}

.btn {
  padding: 1rem 2rem;
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
}

.btn-schedule {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-schedule:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.status-section {
  margin-top: 1rem;
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

.schedules-section {
  margin-top: 2rem;
}

.schedules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.refresh-btn {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover {
  border-color: #667eea;
  background: #f0f4ff;
  transform: rotate(180deg);
}

.refresh-icon {
  width: 1rem;
  height: 1rem;
  color: #4a5568;
  transition: color 0.2s ease;
}

.refresh-btn:hover .refresh-icon {
  color: #667eea;
}

.section-subtitle {
  color: #718096;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.subtitle-icon {
  width: 1rem;
  height: 1rem;
}

.empty-schedules {
  text-align: center;
  padding: 3rem;
  color: #718096;
}

.schedules-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.schedule-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.schedule-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.schedule-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stop-btn {
  background: #fed7d7;
  color: #e53e3e;
}

.stop-btn:hover {
  background: #feb2b2;
  transform: translateY(-1px);
}

.edit-btn {
  background: #bee3f8;
  color: #2b6cb0;
}

.edit-btn:hover {
  background: #90cdf4;
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
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  color: #ef4444;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
}

.stop-modal {
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

.stop-modal-content {
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

.stop-icon {
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  color: #f59e0b;
  filter: drop-shadow(0 4px 8px rgba(245, 158, 11, 0.3));
}

.stop-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #d97706;
  margin-bottom: 1rem;
}

.stop-message {
  color: #4b5563;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.stop-warning {
  color: #f59e0b;
  font-size: 0.9rem;
  font-weight: 500;
}

.stop-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-stop {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-stop:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
}

.schedule-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.schedule-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.schedule-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.schedule-files, .schedule-channels, .schedule-mode {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: #718096;
}

.meta-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.pending {
  background: #fef5e7;
  color: #d69e2e;
}

.status-badge.running {
  background: #c6f6d5;
  color: #2f855a;
}

.status-badge.done {
  background: #bee3f8;
  color: #2b6cb0;
}

.status-badge.failed {
  background: #fed7d7;
  color: #c53030;
}

.input-mode-section {
  margin-bottom: 2rem;
}

.input-mode-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f7fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.mode-tab {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  color: #4a5568;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.mode-tab.active {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tab-icon {
  width: 1rem;
  height: 1rem;
}

.multi-input-section {
  margin-top: 1rem;
}

.multi-input-controls {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f0f4ff;
  border-radius: 12px;
  border: 2px solid #667eea;
  align-items: center;
  justify-content: space-between;
}

.multi-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #667eea;
}

.multi-actions {
  display: flex;
  gap: 0.5rem;
}

.clear-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  color: #718096;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.clear-btn:hover {
  border-color: #f56565;
  background: #fed7d7;
  color: #c53030;
}

.clear-icon {
  width: 0.8rem;
  height: 0.8rem;
}

.multi-grid {
  display: grid;
  gap: 1rem;
}

.multi-option {
  cursor: default;
}

.multi-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.multi-card:hover {
  border-color: #cbd5e0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.multi-selectors {
  display: flex;
  gap: 0.5rem;
}

.selector-btn {
  position: relative;
  padding: 0.5rem;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selector-btn:hover {
  transform: translateY(-1px);
}

.video-btn.active {
  border-color: #667eea;
  background: #f0f4ff;
  color: #667eea;
}

.audio-btn.active {
  border-color: #38a169;
  background: #f0fff4;
  color: #38a169;
}

.selector-icon {
  width: 1rem;
  height: 1rem;
}

.selection-number {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 0.7rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.standard-input-section {
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .mode-options {
    grid-template-columns: 1fr;
  }
  
  .channels-grid {
    grid-template-columns: 1fr;
  }
  
  .schedule-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .schedule-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .multi-input-controls {
    flex-direction: column;
    gap: 1rem;
  }
  
  .multi-selectors {
    flex-direction: column;
  }
}
</style>