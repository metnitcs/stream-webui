<template>
  <div class="app">
    <div class="background"></div>
    <div class="container">
      <header class="header">
        <h1 class="title">
          <VideoIcon class="icon" />
          <span class="text">Stream Hub</span>
        </h1>
        <p class="subtitle">Multi-Channel Video Streaming Platform</p>
      </header>
      
      <div class="nav-container">
        <nav class="tabs">
          <button v-if="!token" :class="{active: tab==='auth'}" @click="tab='auth'" class="tab-btn">
            <LockIcon class="tab-icon" />
            <span>Authentication</span>
          </button>
          <template v-else>
            <button :class="{active: tab==='channels'}" @click="tab='channels'" class="tab-btn">
              <TvIcon class="tab-icon" />
              <span>Channels</span>
            </button>
            <button :class="{active: tab==='stream'}" @click="tab='stream'" class="tab-btn">
              <PlayIcon class="tab-icon" />
              <span>Stream</span>
            </button>
            <button :class="{active: tab==='scheduler'}" @click="tab='scheduler'" class="tab-btn">
              <ClockIcon class="tab-icon" />
              <span>Scheduler</span>
            </button>
          </template>
        </nav>
        
        <div v-if="token" class="user-menu">
          <button @click="toggleUserMenu($event)" class="user-menu-btn">
            <UserIcon class="user-icon" />
            <ChevronDownIcon class="dropdown-arrow" />
          </button>
          <Teleport to="body">
            <div v-if="showUserMenu" class="user-dropdown" :style="dropdownStyle">
              <button @click="openChangePassword" class="dropdown-item">
                <KeyIcon class="item-icon" />
                <span>Change Password</span>
              </button>
              <button @click="logout" class="dropdown-item logout-item">
                <LogOutIcon class="item-icon" />
                <span>Logout</span>
              </button>
            </div>
          </Teleport>
        </div>
      </div>
      
      <main class="content">
        <AuthPanel v-if="!token" @authed="onAuthed"/>
        <Channels v-else-if="tab==='channels'"/>
        <Stream v-else-if="tab==='stream'"/>
        <ScheduleManager v-else />
      </main>
      
    </div>
    
    <!-- Change Password Modal -->
    <Teleport to="body">
      <div v-if="showChangePassword" class="change-password-modal">
        <div class="modal-overlay" @click="closeChangePassword"></div>
        <div class="change-password-content">
          <div class="modal-header">
            <h3 class="modal-title">
            <KeyIcon class="modal-icon" />
            Change Password
          </h3>
            <button @click="closeChangePassword" class="close-btn">
              <XIcon class="close-icon" />
            </button>
          </div>
          <form @submit.prevent="changePassword" class="password-form">
            <div class="input-wrapper">
              <label class="input-label">Current Password</label>
              <input v-model="currentPassword" type="password" class="form-input" required />
            </div>
            <div class="input-wrapper">
              <label class="input-label">New Password</label>
              <input v-model="newPassword" type="password" class="form-input" required />
            </div>
            <div class="input-wrapper">
              <label class="input-label">Confirm New Password</label>
              <input v-model="confirmPassword" type="password" class="form-input" required />
            </div>
            <div v-if="passwordError" class="error-message">
              <span class="error-icon">⚠️</span>
              {{ passwordError }}
            </div>
            <div class="modal-actions">
              <button type="button" @click="closeChangePassword" class="btn btn-secondary">
                <XIcon class="btn-icon" />
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="changingPassword">
                <KeyIcon v-if="!changingPassword" class="btn-icon" />
                <span v-if="!changingPassword">Change Password</span>
                <span v-else>⏳ Changing...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<script setup>
import { ref, computed, watch, Teleport } from 'vue'
import { VideoIcon, TvIcon, PlayIcon, ClockIcon, LockIcon, UserIcon, ChevronDownIcon, KeyIcon, LogOutIcon, XIcon } from 'lucide-vue-next'
import { store } from './main'
import AuthPanel from './components/AuthPanel.vue'
import Channels from './components/ChannelsManager.vue'
import Stream from './components/StreamController.vue'
import ScheduleManager from './components/ScheduleManager.vue'

const backend = __BACKEND__
const tab = ref(store.token ? 'channels' : 'auth')
const token = computed(()=>store.token)
const showUserMenu = ref(false)
const showChangePassword = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const changingPassword = ref(false)
const dropdownStyle = ref({})

function onAuthed(){ 
  tab.value='channels' 
}

function toggleUserMenu(event){
  showUserMenu.value = !showUserMenu.value
  if (showUserMenu.value) {
    const rect = event.target.getBoundingClientRect()
    dropdownStyle.value = {
      position: 'fixed',
      top: rect.bottom + 8 + 'px',
      right: window.innerWidth - rect.right + 'px',
      zIndex: 99999
    }
  }
}

function openChangePassword(){
  showChangePassword.value = true
  showUserMenu.value = false
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
}

function closeChangePassword(){
  showChangePassword.value = false
}

async function changePassword(){
  passwordError.value = ''
  
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'New passwords do not match'
    return
  }
  
  if (newPassword.value.length < 6) {
    passwordError.value = 'New password must be at least 6 characters'
    return
  }
  
  changingPassword.value = true
  try {
    const res = await fetch(`${backend}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${store.token}`
      },
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      })
    })
    
    if (!res.ok) {
      passwordError.value = await res.text()
      return
    }
    
    closeChangePassword()
    alert('Password changed successfully!')
  } catch (error) {
    passwordError.value = 'Failed to change password'
  } finally {
    changingPassword.value = false
  }
}

function logout(){
  store.token = ''
  localStorage.removeItem('token')
  tab.value = 'auth'
  showUserMenu.value = false
}

// Watch token changes to auto-redirect
watch(token, (newToken) => {
  if (newToken && tab.value === 'auth') {
    tab.value = 'channels'
  } else if (!newToken) {
    tab.value = 'auth'
  }
})

// Close user menu when clicking outside
watch(showUserMenu, (show) => {
  if (show) {
    setTimeout(() => {
      document.addEventListener('click', closeUserMenuOutside)
    }, 0)
  } else {
    document.removeEventListener('click', closeUserMenuOutside)
  }
})

function closeUserMenuOutside(event) {
  if (!event.target.closest('.user-menu')) {
    showUserMenu.value = false
  }
}
</script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

.app {
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
}

.background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: -1;
}

.background::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 3rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 4px 20px rgba(0,0,0,0.3);
  margin-bottom: 0.5rem;
}

.icon {
  width: 3.5rem;
  height: 3.5rem;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
}

.subtitle {
  color: rgba(255,255,255,0.9);
  font-size: 1.2rem;
  font-weight: 300;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  background: transparent;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(255,255,255,0.8);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.tab-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.1);
  color: white;
  transform: translateY(-2px);
}

.tab-btn.active {
  background: rgba(255,255,255,0.2);
  color: white;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}

.tab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 0.5rem;
  border: 1px solid rgba(255,255,255,0.2);
}

.user-menu {
  position: relative;
}

.user-menu-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.user-menu-btn:hover {
  background: rgba(255,255,255,0.2);
  transform: translateY(-2px);
}

.user-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.dropdown-arrow {
  width: 0.8rem;
  height: 0.8rem;
  transition: transform 0.3s ease;
}

.user-dropdown {
  background: white !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
  border: 1px solid rgba(0,0,0,0.1) !important;
  min-width: 200px !important;
  animation: dropdownSlide 0.2s ease-out !important;
}

@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.dropdown-item:first-child {
  border-radius: 12px 12px 0 0;
}

.dropdown-item:last-child {
  border-radius: 0 0 12px 12px;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.logout-item:hover {
  background: #fef2f2;
  color: #dc2626;
}

.item-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.change-password-modal {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 999999 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  pointer-events: auto !important;
}

.modal-overlay {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background: rgba(0, 0, 0, 0.6) !important;
  backdrop-filter: blur(8px) !important;
  z-index: 999998 !important;
}

.change-password-content {
  position: relative !important;
  background: white !important;
  border-radius: 20px !important;
  padding: 0 !important;
  max-width: 450px !important;
  width: 90% !important;
  box-shadow: 0 25px 80px rgba(0,0,0,0.3) !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  animation: modalSlideIn 0.3s ease-out !important;
  overflow: hidden !important;
  z-index: 999999 !important;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-icon {
  width: 1.3rem;
  height: 1.3rem;
}

.close-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255,255,255,0.2);
}

.password-form {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #f9fafb;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 10px;
  border-left: 4px solid #ef4444;
  font-size: 0.9rem;
}

.error-icon {
  font-size: 1.1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
  border: 2px solid #e5e7eb;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
  color: #4b5563;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.content {
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.1);
  border: 1px solid rgba(255,255,255,0.3);
  min-height: 500px;
}

@media (max-width: 768px) {
  .container { padding: 1rem; }
  .title { font-size: 2rem; flex-direction: column; gap: 0.5rem; }
  .nav-container { flex-direction: column; gap: 1rem; }
  .tabs { flex-direction: column; width: 100%; }
  .tab-btn span:not(.tab-icon) { display: none; }
  .content { padding: 1.5rem; }
  .change-password-content { margin: 1rem; }
  .password-form { padding: 1.5rem; }
  .modal-actions { flex-direction: column; }
}
</style>
