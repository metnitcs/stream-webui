<template>
  <div>
    <h2>Scheduler</h2>
    <div class="card">
      <div>Upload file to use for schedule</div>
      <input type="file" @change="onFile" />
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
      <button @click="createSchedule" :disabled="!uploadedName || selected.length===0 || !startAt">Create Schedule</button>
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
import { ref, onMounted } from 'vue'
import { store } from '../main'
const backend = __BACKEND__
const channels = ref([])
const selected = ref([])
const status = ref('')
const file = ref(null)
const uploadedName = ref('')
const mode = ref('per_channel')
const startAt = ref('')
const schedules = ref([])
async function fetchChannels(){
  const res = await fetch(`${backend}/channels`, { headers:{ Authorization:`Bearer ${store.token}` } })
  channels.value = await res.json()
}
async function fetchSchedules(){
  const res = await fetch(`${backend}/schedules`, { headers:{ Authorization:`Bearer ${store.token}` } })
  schedules.value = await res.json()
}
function onFile(e){ file.value = e.target.files[0] }
async function uploadFile(){
  if (!file.value) return
  const fd = new FormData(); fd.append('video', file.value)
  const up = await fetch(`${backend}/upload`, { method:'POST', headers:{ Authorization:`Bearer ${store.token}` }, body: fd })
  if (!up.ok){ status.value = await up.text(); return }
  const { filename } = await up.json(); uploadedName.value = filename
}
async function createSchedule(){
  status.value=''
  if (!uploadedName.value) await uploadFile()
  const res = await fetch(`${backend}/schedules`, {
    method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${store.token}`},
    body: JSON.stringify({ file: uploadedName.value, channelIds: selected.value, mode: mode.value, startAt: startAt.value })
  })
  if (!res.ok){ status.value = await res.text(); return }
  status.value = 'Schedule created.'
  await fetchSchedules()
}
onMounted(()=>{ fetchChannels(); fetchSchedules(); })
</script>
<style>
.card { padding:1rem; border:1px solid #ddd; margin:1rem 0; }
.channels { display:grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap:.5rem; margin:.5rem 0; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: .5rem; text-align: left; }
</style>
