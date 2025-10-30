<template>
  <div class="wrap">
    <h1>🎥 Multi-Channel Stream (JWT + WS + Scheduler)</h1>
    <div class="tabs">
      <button :class="{active: tab==='auth'}" @click="tab='auth'">Auth</button>
      <button :class="{active: tab==='channels'}" @click="tab='channels'" :disabled="!token">Channels</button>
      <button :class="{active: tab==='stream'}" @click="tab='stream'" :disabled="!token">Stream</button>
      <button :class="{active: tab==='scheduler'}" @click="tab='scheduler'" :disabled="!token">Scheduler</button>
    </div>
    <AuthPanel v-if="tab==='auth'" @authed="onAuthed"/>
    <Channels v-else-if="tab==='channels'"/>
    <Stream v-else-if="tab==='stream'"/>
    <Scheduler v-else />
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { store } from './main'
import AuthPanel from './components/AuthPanel.vue'
import Channels from './components/ChannelsManager.vue'
import Stream from './components/StreamController.vue'
import Scheduler from './components/Scheduler.vue'
const tab = ref('auth')
const token = computed(()=>store.token)
function onAuthed(){ tab.value='channels' }
</script>
<style>
.wrap { max-width: 980px; margin: 2rem auto; font-family: system-ui, sans-serif; }
.tabs { margin: 1rem 0; }
.tabs button { margin-right: .5rem; padding: .5rem 1rem; }
.tabs .active { background: #111; color: #fff; }
</style>
