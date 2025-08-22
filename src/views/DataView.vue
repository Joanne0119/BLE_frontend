<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { getTestGroups, deleteTestGroup, getAllData } from '@/services/api';
import MySwal from '@/plugins/sweetalert.js';

// ref() = React 的 useState()
const testGroups = ref([]);
const allData = ref([]);
const isLoading = ref(true);
const error = ref(null);
const isDeleting = ref(null); 

let intervalId = null;
let lastUpdatedTime = ref(null);

const formattedLastUpdatedTime = computed(() => {
  if (!lastUpdatedTime.value) {
    return '正在載入資料...';
  }
  return `${lastUpdatedTime.value.toLocaleString('zh-TW')}`;
});

async function fetchAllDataAndTestGroups() {
  try {
    const [groups, data] = await Promise.all([getTestGroups(), getAllData()]);
    testGroups.value = groups;
    allData.value = data;
    lastUpdatedTime.value = new Date(); 
    error.value = null;  
  } catch (e) {
    error.value = e.message; 
  } finally {
    if (isLoading.value) {
      isLoading.value = false; 
    }
  }
}

async function handleDelete(group) {
  const result = await MySwal.fire({
    title: `確定要刪除嗎？`,
    text: `測試群組 "${group}" 將要被刪除，此操作無法復原！`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '是的，刪除它！',
    cancelButtonText: '取消',
    confirmButtonColor: '#d14134',
  });
  if (!result.isConfirmed) {
    return;
  }

  try {
    isDeleting.value = group;
    error.value = null;
    await deleteTestGroup(group); // call API
    
    await fetchAllDataAndTestGroups();

    await MySwal.fire(
      '已刪除！',
      `測試群組 "${group}" 已被成功刪除！`,
      'success'
    );

  } catch (e) {
    error.value = `刪除失敗: ${e.message}`;

    await MySwal.fire(
      '刪除失敗',
      e.message,
      'error'
    );

  } finally {
    isDeleting.value = null;
  }
}

// onMounted() = React 的 useEffect(..., [])
onMounted(() => {
  fetchAllDataAndTestGroups();

  intervalId = setInterval(fetchAllDataAndTestGroups, 30000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<template>
  <main>
    <h1>全部數據</h1>
    <div class="last-updated-time">最後更新時間：{{ formattedLastUpdatedTime }}</div>
    <div class="table-container">
      <h2>測試群組列表</h2>
      <div v-if="isLoading" class="loading-message">正在載入中...</div>
      <div v-else-if="error" class="error-message">載入失敗：{{ error }}</div>
      <table v-else-if="testGroups.length > 0" class="data-table">
        <thead>
          <tr>
            <th>測試群組名稱</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="group in testGroups" :key="group">
            <td data-label="群組名稱">{{ group }}</td>
            <td data-label="操作">
              <button @click="handleDelete(group)" :disabled="isDeleting === group" class="delete-button">
                <span v-if="isDeleting === group">刪除中...</span>
                <span v-else>刪除</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="no-data-message">目前沒有任何測試群組。</div>
    </div>

    <div class="table-container">
      <h2>所有數據</h2>
      <div v-if="isLoading" class="loading-message">正在載入數據...</div>
      <div v-else-if="error" class="error-message">數據載入失敗：{{ error }}</div>
      <table v-else-if="allData.length > 0" class="data-table">
        <thead>
          <tr>
            <th>測試群組</th>
            <th>節點 ID</th>
            <th>鄰居 ID</th>
            <th>平均接收率 (pkts/sec)</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="data in allData" :key="data.id">
            <tr v-if="data.average_reception_rate > 0">
              <td data-label="測試群組">{{ data.test_group }}</td>
              <td data-label="節點 ID">{{ data.node_id }}</td>
              <td data-label="鄰居 ID">{{ data.neighbor_id }}</td>
              <td data-label="平均接收率">{{ data.average_reception_rate.toFixed(2) }}</td>
            </tr>
          </template>
        </tbody>
      </table>
       <div v-else class="no-data-message">沒有可顯示的數據。</div>
    </div>
  </main>
</template>

<style scoped>
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.5rem;
  font-family: sans-serif;
  color: #333;
  background-color: #fff;
}

h1 {
  color: #333;
  margin-bottom: 2rem;
  border-bottom: 2px solid #ddd;
  padding-bottom: 1rem;
}

h2 {
  color: #444;
  margin-bottom: 1rem;
}

.last-updated-time {
  margin-bottom: 1rem;
  color: #888;
}

.table-container {
  margin-top: 2.5rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  text-align: left;
  border: 1px solid #ddd;
}

.data-table thead tr {
  color: #333;
  font-weight: bold;
  background-color: #f2f2f2;
}

.data-table tbody tr {
  border-bottom: 1px solid #ddd;
}

.data-table tbody tr:last-of-type {
  border-bottom: none;
}

.data-table tbody tr:nth-of-type(even) {
    background-color: #f9f9f9;
}


.delete-button {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.delete-button:disabled {
  background-color: #fca5a5;
  cursor: not-allowed;
}

.delete-button:hover:not(:disabled) {
  background-color: #dc2626;
}

.loading-message,
.no-data-message {
  text-align: center;
  padding: 2rem;
  color: #777;
}

.error-message {
  color: #d9534f;
  border: 1px solid #ebccd1;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  background-color: #f2dede;
}

/* 響應式設計：小於 768px 寬度時觸發 */
@media (max-width: 768px) {
  .data-table thead {
    display: none; /* 隱藏桌面版的表頭 */
  }

  .data-table, .data-table tbody, .data-table tr, .data-table td {
    display: block;
    width: 100%;
  }

  .data-table tr {
    margin-bottom: 15px;
    border: 1px solid #ddd;
  }
  
  .data-table tbody tr {
     border-bottom: 0;
  }

  .data-table td {
    text-align: right;
    position: relative;
    padding-left: 50%;
    border: none;
    border-bottom: 1px solid #eee;
  }
  
  .data-table td:last-child {
      border-bottom: 0;
  }

  .data-table td::before {
    content: attr(data-label);
    position: absolute;
    left: 15px;
    width: calc(50% - 30px);
    text-align: left;
    font-weight: bold;
    color: #333;
  }
}
</style>