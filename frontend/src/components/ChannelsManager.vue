<template>
  <div>
    <h2>Channels</h2>
    <form @submit.prevent="createChannel" class="card">
      <input v-model="name" placeholder="Name (e.g., Main Channel)" />
      <input v-model="rtmpUrl" placeholder="RTMP URL (default YouTube)" />
      <input v-model="streamKey" placeholder="Stream Key" />
      <button>Add Channel</button>
      <span v-if="error" class="error">{{ error }}</span>
    </form>
    <h3>Your Channels</h3>
    <ul>
      <li v-for="c in channels" :key="c.id" class="row">
        <b>{{ c.name }}</b>
        <span> · {{ c.platform }} · {{ c.rtmp_url }}</span>
        <button @click="edit(c)">Edit</button>
      </li>
    </ul>
    <div v-if="editing" class="card">
      <h4>Edit: {{ editing.name }}</h4>
      <input v-model="editingName" />
      <input v-model="editingUrl" />
      <input v-model="editingKey" placeholder="New Stream Key (optional)" />
      <button @click="saveEdit">Save</button>
      <button @click="cancelEdit">Cancel</button>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { store } from '../main'
const backend = __BACKEND__
const name = ref('')
const rtmpUrl = ref('')
const streamKey = ref('')
const channels = ref([])
const error = ref('')
const editing = ref(null)
const editingName = ref('')
const editingUrl = ref('')
const editingKey = ref('')
async function fetchChannels(){
  const res = await fetch(`${backend}/channels`, { headers: { Authorization: `Bearer ${store.token}` } })
  channels.value = await res.json()
}
async function createChannel(){
  error.value=''
  const body = { name: name.value, streamKey: streamKey.value }
  if (rtmpUrl.value) body.rtmpUrl = rtmpUrl.value
  const res = await fetch(`${backend}/channels`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${store.token}`}, body: JSON.stringify(body) })
  if (!res.ok){ error.value = await res.text(); return }
  name.value = streamKey.value = rtmpUrl.value = ''
  await fetchChannels()
}
function edit(c){ editing.value=c; editingName.value=c.name; editingUrl.value=c.rtmp_url; editingKey.value='' }
function cancelEdit(){ editing.value=null }
async function saveEdit(){
  const body = {}
  if (editingName.value && editingName.value!==editing.value.name) body.name = editingName.value
  if (editingUrl.value && editingUrl.value!==editing.value.rtmp_url) body.rtmpUrl = editingUrl.value
  if (editingKey.value) body.streamKey = editingKey.value
  if (!Object.keys(body).length){ editing.value=null; return }
  const res = await fetch(`${backend}/channels/${editing.value.id}`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${store.token}`}, body: JSON.stringify(body) })
  if (!res.ok){ alert(await res.text()); return }
  editing.value=null
  await fetchChannels()
}
onMounted(fetchChannels)
</script>
<style>
.card { padding:1rem; border:1px solid #ddd; margin-bottom:1rem; }
.row { display:flex; align-items:center; gap:.5rem; margin:.5rem 0; }
.error { color:#c00; margin-left:1rem; }
input { display:block; margin:.25rem 0; padding:.5rem; width:100%; max-width:480px; }
</style>
