<template>
  <div>
    <h2>Stream</h2>
    <div class="card">
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
      <button @click="start" :disabled="!file || selected.length===0">Start Stream</button>
      <button @click="stop" :disabled="!activeStreamId">Stop Stream</button>
      <p>Status: {{ status }}</p>
      <h3>FFmpeg Log</h3>
      <pre class="log">{{ log }}</pre>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { io } from 'socket.io-client'
import { store } from '../main'
const backend = __BACKEND__
const channels = ref([])
const selected = ref([])
const status = ref('')
const file = ref(null)
const activeStreamId = ref(null)
const mode = ref('per_channel')
const log = ref('')
let socket
async function fetchChannels(){
  const res = await fetch(`${backend}/channels`, { headers: { Authorization:`Bearer ${store.token}` } })
  channels.value = await res.json()
}
function onFile(e){ file.value = e.target.files[0] }
async function start(){
  status.value=''
  if (!file.value) return
  const fd = new FormData(); fd.append('video', file.value)
  const up = await fetch(`${backend}/upload`, { method:'POST', headers:{ Authorization:`Bearer ${store.token}` }, body: fd })
  if (!up.ok){ status.value = await up.text(); return }
  const { filename } = await up.json()
  const res = await fetch(`${backend}/stream/start`, {
    method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${store.token}` },
    body: JSON.stringify({ file: filename, channelIds: selected.value, mode: mode.value })
  })
  if (!res.ok){ status.value = await res.text(); return }
  const data = await res.json()
  activeStreamId.value = data.activeStreamId
  status.value = `Streaming started (job ${data.activeStreamId})`
  connectSocket()
}
async function stop(){
  if (!activeStreamId.value) return
  const res = await fetch(`${backend}/stream/stop`, {
    method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${store.token}` },
    body: JSON.stringify({ activeStreamId: activeStreamId.value })
  })
  if (!res.ok){ status.value = await res.text(); return }
  activeStreamId.value = null
  status.value = 'Stopped.'
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
    if (activeStreamId.value && m.jobId === activeStreamId.value){
      log.value += m.line
      if (log.value.length > 20000) log.value = log.value.slice(-20000)
    }
  })
}
onMounted(()=>{ fetchChannels(); if (store.token) connectSocket() })
</script>
<style>
.card { padding:1rem; border:1px solid #ddd; margin-bottom:1rem; }
.channels { display:grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap:.5rem; margin:.5rem 0; }
.log { height: 240px; overflow: auto; background: #111; color: #0f0; padding: .5rem; }
</style>
