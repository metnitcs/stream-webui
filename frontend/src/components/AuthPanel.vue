<template>
  <div class="auth-panel">
    <div class="auth-header">
      <h2 class="auth-title">
        <LockIcon class="title-icon" />
        Authentication
      </h2>
      <p class="auth-subtitle">Sign in to access your streaming dashboard</p>
    </div>
    
    <form class="auth-form" @submit.prevent>
      <div class="input-group">
        <div class="input-wrapper">
          <MailIcon class="input-icon" />
          <input 
            v-model="email" 
            type="email" 
            placeholder="Enter your email" 
            class="form-input"
            required
          />
        </div>
        <div class="input-wrapper">
          <LockIcon class="input-icon" />
          <input 
            v-model="password" 
            type="password" 
            placeholder="Enter your password" 
            class="form-input"
            required
          />
        </div>
      </div>
      
      <div class="button-group">
        <button @click="register" class="btn btn-primary" :disabled="loading">
          <UserPlusIcon v-if="!loading" class="btn-icon" />
          <span v-if="!loading">Create Account</span>
          <span v-else>⏳ Creating...</span>
        </button>
        <button @click="login" class="btn btn-secondary" :disabled="loading">
          <LogInIcon v-if="!loading" class="btn-icon" />
          <span v-if="!loading">Sign In</span>
          <span v-else>⏳ Signing in...</span>
        </button>
      </div>
      
      <div v-if="err" class="error-message">
        <AlertCircleIcon class="error-icon" />
        {{ err }}
      </div>
      
      <div v-if="token" class="success-message">
        <CheckCircleIcon class="success-icon" />
        Successfully authenticated! Welcome to Stream Hub.
      </div>
    </form>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { LockIcon, MailIcon, UserPlusIcon, LogInIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-vue-next'
import { store } from '../main'
const backend = __BACKEND__
const email = ref('')
const password = ref('')
const err = ref('')
const loading = ref(false)
const token = ref(store.token)
async function register(){
  err.value=''; loading.value=true
  try {
    const res = await fetch(`${backend}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email.value, password: password.value }) })
    if (!res.ok){ err.value = await res.text(); return }
    const { token:t } = await res.json(); store.token = t; localStorage.setItem('token', t); token.value = t; emit('authed')
  } finally { loading.value=false }
}
async function login(){
  err.value=''; loading.value=true
  try {
    const res = await fetch(`${backend}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email.value, password: password.value }) })
    if (!res.ok){ err.value = await res.text(); return }
    const { token:t } = await res.json(); store.token = t; localStorage.setItem('token', t); token.value = t; emit('authed')
  } finally { loading.value=false }
}
const emit = defineEmits(['authed'])
</script>
<style scoped>
.auth-panel {
  max-width: 500px;
  margin: 0 auto;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-title {
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

.auth-subtitle {
  color: #718096;
  font-size: 1rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  width: 1.2rem;
  height: 1.2rem;
  z-index: 1;
  color: #9ca3af;
}

.form-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
}

.button-group {
  display: flex;
  gap: 1rem;
  flex-direction: column;
}

.btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.error-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.success-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover:not(:disabled) {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fed7d7;
  color: #c53030;
  border-radius: 12px;
  border-left: 4px solid #e53e3e;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #c6f6d5;
  color: #2f855a;
  border-radius: 12px;
  border-left: 4px solid #38a169;
}

@media (max-width: 768px) {
  .button-group {
    flex-direction: column;
  }
}
</style>
