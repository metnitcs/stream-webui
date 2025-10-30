<template>
  <div class="channels-manager">
    <div class="section-header">
      <h2 class="section-title">
        <TvIcon class="title-icon" />
        Channel Management
      </h2>
      <p class="section-subtitle">Manage your streaming destinations</p>
    </div>
    
    <div class="add-channel-card">
      <h3 class="card-title">
        <PlusIcon class="card-icon" />
        Add New Channel
      </h3>
      <form @submit.prevent="createChannel" class="channel-form">
        <div class="form-grid">
          <div class="input-wrapper">
            <label class="input-label">
              <TagIcon class="label-icon" />
              Channel Name
            </label>
            <input v-model="name" placeholder="e.g., Main YouTube Channel" class="form-input" required />
          </div>
          <div class="input-wrapper">
            <label class="input-label">
              <LinkIcon class="label-icon" />
              RTMP URL
            </label>
            <input v-model="rtmpUrl" placeholder="Leave empty for YouTube default" class="form-input" />
          </div>
          <div class="input-wrapper full-width">
            <label class="input-label">
              <KeyIcon class="label-icon" />
              Stream Key
            </label>
            <input v-model="streamKey" placeholder="Your stream key" class="form-input" type="password" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          <PlusIcon v-if="!loading" class="btn-icon" />
          <span v-if="!loading">Add Channel</span>
          <span v-else>⏳ Adding...</span>
        </button>
        <div v-if="error" class="error-message">
          <AlertCircleIcon class="error-icon" />
          {{ error }}
        </div>
      </form>
    </div>
    
    <div class="channels-section">
      <h3 class="section-subtitle">
        <TvIcon class="subtitle-icon" />
        Your Channels ({{ channels.length }}/10)
      </h3>
      <div v-if="channels.length === 0" class="empty-state">
        <TvIcon class="empty-icon" />
        <p>No channels added yet</p>
        <p class="empty-subtitle">Add your first streaming channel above</p>
      </div>
      <div v-else class="channels-grid">
        <div v-for="c in channels" :key="c.id" class="channel-card">
          <div class="channel-header">
            <div class="channel-info">
              <h4 class="channel-name">
                <TvIcon class="channel-icon-small" />
                {{ c.name }}
              </h4>
              <div class="channel-meta">
                <span class="platform-badge">
                  <PlayIcon class="platform-icon" />
                  {{ c.platform }}
                </span>
                <span class="url-info">
                  <LinkIcon class="url-icon" />
                  {{ c.rtmp_url.split('/').pop() }}
                </span>
              </div>
            </div>
            <div class="channel-actions">
              <button @click="edit(c)" class="btn btn-edit">
                <EditIcon class="btn-icon" />
                Edit
              </button>
              <button @click="deleteChannel(c)" class="btn btn-delete">
                <TrashIcon class="btn-icon" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="editing" class="edit-modal">
        <div class="modal-overlay" @click="cancelEdit"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">
              <EditIcon class="modal-icon" />
              Edit Channel: {{ editing.name }}
            </h3>
            <button @click="cancelEdit" class="close-btn">
              <XIcon class="close-icon" />
            </button>
          </div>
          <form @submit.prevent="saveEdit" class="edit-form">
            <div class="input-wrapper">
              <label class="input-label">Channel Name</label>
              <input v-model="editingName" class="form-input" required />
            </div>
            <div class="input-wrapper">
              <label class="input-label">RTMP URL</label>
              <input v-model="editingUrl" class="form-input" />
            </div>
            <div class="input-wrapper">
              <label class="input-label">New Stream Key (optional)</label>
              <input v-model="editingKey" placeholder="Leave empty to keep current" class="form-input" type="password" />
            </div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">
                <SaveIcon class="btn-icon" />
                Save Changes
              </button>
              <button type="button" @click="cancelEdit" class="btn btn-secondary">
                <XIcon class="btn-icon" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
    
    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirm" class="delete-modal">
        <div class="modal-overlay" @click="cancelDelete"></div>
        <div class="delete-modal-content">
          <TrashIcon class="delete-icon" />
          <h3 class="delete-title">Delete Channel</h3>
          <p class="delete-message">
            Are you sure you want to delete <strong>"{{ deleteConfirm.name }}"</strong>?
            <br><span class="delete-warning">This action cannot be undone.</span>
          </p>
          <div class="delete-actions">
            <button @click="cancelDelete" class="btn btn-cancel">
              <XIcon class="btn-icon" />
            Cancel
            </button>
            <button @click="confirmDelete" class="btn btn-danger" :disabled="deleting === deleteConfirm.id">
              <TrashIcon v-if="deleting !== deleteConfirm.id" class="btn-icon" />
            <span v-if="deleting !== deleteConfirm.id">Delete</span>
              <span v-else>⏳ Deleting...</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<script setup>
import { ref, onMounted, Teleport } from 'vue'
import { TvIcon, PlusIcon, TagIcon, LinkIcon, KeyIcon, PlayIcon, EditIcon, TrashIcon, SaveIcon, XIcon, AlertCircleIcon } from 'lucide-vue-next'
import { store } from '../main'
const backend = __BACKEND__
const name = ref('')
const rtmpUrl = ref('')
const streamKey = ref('')
const channels = ref([])
const error = ref('')
const loading = ref(false)
const deleting = ref(null)
const deleteConfirm = ref(null)
const editing = ref(null)
const editingName = ref('')
const editingUrl = ref('')
const editingKey = ref('')
async function fetchChannels(){
  const res = await fetch(`${backend}/channels`, { headers: { Authorization: `Bearer ${store.token}` } })
  channels.value = await res.json()
}
async function createChannel(){
  error.value=''; loading.value=true
  try {
    const body = { name: name.value, streamKey: streamKey.value }
    if (rtmpUrl.value) body.rtmpUrl = rtmpUrl.value
    const res = await fetch(`${backend}/channels`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${store.token}`}, body: JSON.stringify(body) })
    if (!res.ok){ error.value = await res.text(); return }
    name.value = streamKey.value = rtmpUrl.value = ''
    await fetchChannels()
    store.channelsUpdated++ // trigger refresh in other components
  } finally { loading.value=false }
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
  store.channelsUpdated++ // trigger refresh in other components
}

function deleteChannel(channel){
  deleteConfirm.value = channel
}

function confirmDelete(){
  if (deleteConfirm.value) {
    performDelete(deleteConfirm.value.id)
    deleteConfirm.value = null
  }
}

function cancelDelete(){
  deleteConfirm.value = null
}

async function performDelete(channelId){
  deleting.value = channelId
  try {
    const res = await fetch(`${backend}/channels/${channelId}`, { 
      method: 'DELETE', 
      headers: { Authorization: `Bearer ${store.token}` } 
    })
    if (!res.ok) {
      const errorText = await res.text()
      alert(`Failed to delete channel: ${errorText}`)
      return
    }
    await fetchChannels()
    store.channelsUpdated++ // trigger refresh in other components
  } catch (error) {
    alert(`Error deleting channel: ${error.message}`)
  } finally {
    deleting.value = null
  }
}
onMounted(fetchChannels)
</script>
<style scoped>
.channels-manager {
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

.add-channel-card {
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
  margin-bottom: 1.5rem;
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

.channel-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.full-width {
  grid-column: 1 / -1;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-label {
  font-weight: 600;
  color: #4a5568;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label-icon {
  width: 1rem;
  height: 1rem;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.modal-icon {
  width: 1.3rem;
  height: 1.3rem;
}

.close-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.error-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.section-subtitle {
  color: #718096;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.subtitle-icon {
  width: 1rem;
  height: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: #f7fafc;
  color: #4a5568;
  border: 2px solid #e2e8f0;
}

.channel-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit {
  background: #4299e1;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.btn-delete {
  background: #e53e3e;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.btn-delete:hover:not(:disabled) {
  background: #c53030;
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.channels-section {
  margin-top: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #718096;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  color: #cbd5e0;
}

.empty-subtitle {
  font-size: 0.9rem;
  opacity: 0.8;
}

.channels-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.channel-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.channel-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.channel-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.channel-icon-small {
  width: 1.2rem;
  height: 1.2rem;
}

.channel-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.platform-badge {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.platform-icon {
  width: 0.8rem;
  height: 0.8rem;
}

.url-info {
  color: #718096;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.url-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.edit-modal {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 999998 !important;
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
  background: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(4px) !important;
}

.modal-content {
  position: relative !important;
  background: white !important;
  border-radius: 16px !important;
  padding: 2rem !important;
  max-width: 500px !important;
  width: 90% !important;
  max-height: 90vh !important;
  overflow-y: auto !important;
  z-index: 999999 !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem 2rem;
  margin: -2rem -2rem 2rem -2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 16px 16px 0 0;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
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

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fed7d7;
  color: #c53030;
  border-radius: 8px;
  border-left: 4px solid #e53e3e;
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
  backdrop-filter: blur(4px) !important;
}

.delete-modal-content {
  position: relative !important;
  background: white !important;
  border-radius: 20px !important;
  padding: 2rem !important;
  max-width: 400px !important;
  width: 90% !important;
  text-align: center !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
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
}

.btn-cancel:hover:not(:disabled) {
  background: #e5e7eb;
  color: #4b5563;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .channel-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .delete-actions {
    flex-direction: column;
  }
  
  .delete-modal-content {
    margin: 1rem;
    padding: 1.5rem;
  }
}
</style>
