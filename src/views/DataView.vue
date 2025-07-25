<script setup>
import { ref, onMounted } from 'vue';
import { getTestGroups, deleteTestGroup } from '@/services/api';

// ref() = React 的 useState()
const testGroups = ref([]);
const isLoading = ref(true);
const error = ref(null);
const isDeleting = ref(null); 

async function fetchTestGroups() {
  try {
    isLoading.value = true; 
    error.value = null;     
    testGroups.value = await getTestGroups(); // call API
  } catch (e) {
    error.value = e.message; 
  } finally {
    isLoading.value = false; 
  }
}

async function handleDelete(group) {
  if (!confirm(`您確定要刪除測試群組 "${group}" 嗎？此操作無法復原！`)) {
    return;
  }

  try {
    isDeleting.value = group;
    error.value = null;
    await deleteTestGroup(group); // call API
    await fetchTestGroups();

  } catch (e) {
    error.value = `刪除失敗: ${e.message}`;

  } finally {
    isDeleting.value = null;
  }
}

// onMounted() = React 的 useEffect(..., [])
onMounted(() => {
  fetchTestGroups();
});
</script>

<template>
  <main>
    <h1>BLE 數據儀表板</h1>

    <div class="test-groups">
      <h2>測試群組列表</h2>

      <div v-if="isLoading">
        正在載入中...
      </div>

      <div v-else-if="error" class="error-message">
        載入失敗：{{ error }}
      </div>

      <ul v-else-if="testGroups.length > 0">
        <li v-for="group in testGroups" :key="group">
          <span>{{ group }}</span>
          <button @click = "handleDelete(group)" :disabled="isDeleting === group">
            <span v-if="isDeleting === group">刪除中...</span>
            <span v-else>刪除</span>
          </button>
        </li>
      </ul>

      <div v-else>
        目前沒有任何測試群組。
      </div>
    </div>
  </main>
</template>

<style scoped>
.test-groups {
  margin-top: 2rem;
}
.error-message {
  color: red;
}
.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
}
.group-item button {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.group-item button:disabled {
  background-color: #fca5a5;
  cursor: not-allowed;
}
.group-item button:hover:not(:disabled) {
  background-color: #dc2626;
}
</style>