<template>
  <div class="card">
    <h2>Auth</h2>
    <div class="row">
      <input v-model="email" placeholder="email" />
      <input v-model="password" type="password" placeholder="password" />
    </div>
    <div class="row">
      <button @click="register">Register</button>
      <button @click="login">Login</button>
      <span class="error" v-if="err">{{ err }}</span>
    </div>
    <div v-if="token">Logged in. Token stored.</div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { store } from '../main'
const backend = __BACKEND__
const email = ref('')
const password = ref('')
const err = ref('')
const token = ref(store.token)
async function register(){
  err.value=''
  const res = await fetch(`${backend}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email.value, password: password.value }) })
  if (!res.ok){ err.value = await res.text(); return }
  const { token:t } = await res.json(); store.token = t; localStorage.setItem('token', t); token.value = t; emit('authed')
}
async function login(){
  err.value=''
  const res = await fetch(`${backend}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email.value, password: password.value }) })
  if (!res.ok){ err.value = await res.text(); return }
  const { token:t } = await res.json(); store.token = t; localStorage.setItem('token', t); token.value = t; emit('authed')
}
const emit = defineEmits(['authed'])
</script>
<style>
.card { padding:1rem; border:1px solid #ddd; }
.row { display:flex; gap:.5rem; margin:.5rem 0; }
.error { color:#c00; }
input { padding:.5rem; }
</style>
