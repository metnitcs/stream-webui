<template>
  <div>
    <h2>Scheduler</h2>
    <div class="card">
      <!-- Input Type Selection -->
      <div class="input-type-section">
        <label>Input Type:</label>
        <div class="input-type-options">
          <label><input type="radio" value="standard" v-model="inputType" /> Standard</label>
          <label><input type="radio" value="multi" v-model="inputType" /> Multi-Input</label>
        </div>
      </div>
      
      <!-- File Selection -->
      <div v-if="inputType === 'standard'" class="file-section">
        <div>Upload file(s) to use for schedule</div>
        <input type="file" @change="onFile" multiple />
        <div v-if="uploadedFiles.length > 0" class="uploaded-files">
          <p>Uploaded files: {{ uploadedFiles.join(', ') }}</p>
        </div>
      </div>
      
      <div v-else class="multi-file-section">
        <div class="multi-selection">
          <div class="selection-summary">
            <div class="summary-item">
              <span class="summary-label">Video Files:</span>
              <span class="summary-count">{{ selectedVideoFiles.length }} selected</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Audio Files:</span>
              <span class="summary-count">{{ selectedAudioFiles.length }} selected</span>
            </div>
          </div>
          <div class="multi-upload">
            <div>
              <label>Upload Video Files:</label>
              <input type="file" @change="onVideoFiles" accept="video/*" multiple />
            </div>
            <div>
              <label>Upload Audio Files:</label>
              <input type="file" @change="onAudioFiles" accept="audio/*" multiple />
            </div>
          </div>
        </div>
      </div>
      
      <div class="channels">
        <div v-for="c in channels" :key="c.id">
          <label><input type="checkbox" :value="c.id" v-model="selected" /> {{ c.name }}</label>
        </div>
      </div>
      <div>
        <label>Mode:
          <select v-model="mode">
            <option value="per_channel">per_channel</option>
            <option value="tee">tee</option>
          </select>
        </label>
      </div>
      <div>
        <label>Start at (ISO): <input v-model="startAt" placeholder="2025-10-30T15:30:00+07:00" /></label>
      </div>
      <button @click="createSchedule" :disabled="!canCreateSchedule">Create Schedule</button>
      <p>{{ status }}</p>
    </div>
    <div class="card">
      <h3>Your Schedules</h3>
      <table>
        <thead><tr><th>ID</th><th>Mode</th><th>Start</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="s in schedules" :key="s.id"><td>{{ s.id }}</td><td>{{ s.mode }}</td><td>{{ s.start_at }}</td><td>{{ s.status }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../main'
const backend = __BACKEND__
const channels = ref([])
const selected = ref([])
const status = ref('')
const file = ref(null)
const uploadedFiles = ref([])
const selectedVideoFiles = ref([])
const selectedAudioFiles = ref([])
const inputType = ref('standard')
const mode = ref('per_channel')
const startAt = ref('')
const schedules = ref([])

const canCreateSchedule = computed(() => {
  if (selected.value.length === 0 || !startAt.value) return false
  
  if (inputType.value === 'multi') {
    return selectedVideoFiles.value.length > 0 && selectedAudioFiles.value.length > 0
  } else {
    return uploadedFiles.value.length > 0
  }
})
async function fetchChannels(){
  const res = await fetch(`${backend}/channels`, { headers:{ Authorization:`Bearer ${store.token}` } })
  channels.value = await res.json()
}
async function fetchSchedules(){
  const res = await fetch(`${backend}/schedules`, { headers:{ Authorization:`Bearer ${store.token}` } })
  schedules.value = await res.json()
}
function onFile(e){ 
  file.value = Array.from(e.target.files)
}

function onVideoFiles(e) {
  if (e.target.files.length > 0) {
    const videoFiles = Array.from(e.target.files)
    if (!file.value) file.value = []
    file.value.push(...videoFiles)
    selectedVideoFiles.value = videoFiles.map(f => f.name)
  }
}

function onAudioFiles(e) {
  if (e.target.files.length > 0) {
    const audioFiles = Array.from(e.target.files)
    if (!file.value) file.value = []
    file.value.push(...audioFiles)
    selectedAudioFiles.value = audioFiles.map(f => f.name)
  }
}
async function uploadFiles(){
  if (!file.value || file.value.length === 0) return []
  
  const uploadedNames = []
  
  for (const f of file.value) {
    const fd = new FormData()
    fd.append('video', f)
    const up = await fetch(`${backend}/upload`, { 
      method:'POST', 
      headers:{ Authorization:`Bearer ${store.token}` }, 
      body: fd 
    })
    if (!up.ok){ 
      status.value = await up.text()
      return []
    }
    const { filename } = await up.json()
    uploadedNames.push(filename)
  }
  
  return uploadedNames
}
async function createSchedule(){
  status.value=''
  
  if (uploadedFiles.value.length === 0) {
    const names = await uploadFiles()
    if (names.length === 0) return
    uploadedFiles.value = names
  }
  
  let requestBody = {
    channelIds: selected.value,
    mode: mode.value,
    startAt: startAt.value
  }
  
  if (inputType.value === 'multi') {
    const videoCount = selectedVideoFiles.value.length
    requestBody.videoFiles = uploadedFiles.value.slice(0, videoCount)
    requestBody.audioFiles = uploadedFiles.value.slice(videoCount)
    requestBody.inputType = 'multi'
  } else {
    requestBody.files = uploadedFiles.value
    requestBody.inputType = 'standard'
  }
  
  const res = await fetch(`${backend}/schedules`, {
    method:'POST', 
    headers:{'Content-Type':'application/json', Authorization:`Bearer ${store.token}`},
    body: JSON.stringify(requestBody)
  })
  
  if (!res.ok){ 
    status.value = await res.text()
    return 
  }
  
  status.value = 'Schedule created.'
  await fetchSchedules()
  
  // Reset form
  uploadedFiles.value = []
  selectedVideoFiles.value = []
  selectedAudioFiles.value = []
  file.value = null
}
onMounted(()=>{ fetchChannels(); fetchSchedules(); })
</script>
<style>
.card { padding:1rem; border:1px solid #ddd; margin:1rem 0; }
.channels { display:grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap:.5rem; margin:.5rem 0; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: .5rem; text-align: left; }

.input-type-section {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.input-type-options {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.input-type-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.file-section, .multi-file-section {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.multi-upload {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.multi-upload > div {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.multi-upload label {
  font-weight: 600;
  color: #4a5568;
}

.multi-upload input[type="file"] {
  padding: 0.5rem;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
}

.multi-upload span {
  font-size: 0.9rem;
  color: #38a169;
  font-weight: 500;
}

.uploaded-files {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f0fff4;
  border-radius: 4px;
  border-left: 4px solid #38a169;
}

.uploaded-files p {
  margin: 0;
  color: #2f855a;
  font-weight: 500;
}

.multi-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.selection-summary {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: #f0f4ff;
  border-radius: 8px;
  border: 2px solid #667eea;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-weight: 600;
  color: #667eea;
  font-size: 0.9rem;
}

.summary-count {
  font-weight: 500;
  color: #4a5568;
}
</style>
