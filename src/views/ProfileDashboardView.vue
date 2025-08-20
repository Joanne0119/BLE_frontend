<script setup>
import { ref, onMounted } from 'vue';
import { getProfileResults, deleteProfileResultByGroup, deleteAllProfileResultsForDevice } from '@/services/api';

const profileData = ref(null); 
const isLoading = ref(true);
const error = ref(null);
const isDeleting = ref(false);
const expandedRows = ref(new Set());

function getRowKey(deviceId, testGroupId, testMethod) {
  return `${deviceId}-${testGroupId}-${testMethod}`;
}

function toggleDetails(deviceId, testGroupId, testMethod) {
  const key = getRowKey(deviceId, testGroupId, testMethod);
  if (expandedRows.value.has(key)) {
    expandedRows.value.delete(key);
  } else {
    expandedRows.value.add(key);
  }
}

function isExpanded(deviceId, testGroupId, testMethod) {
  return expandedRows.value.has(getRowKey(deviceId, testGroupId, testMethod));
}

async function fetchProfileData() {
  isLoading.value = true;
  error.value = null;
  
  try {
    const data = await getProfileResults();
    profileData.value = data;
  } catch (e) {
    console.error('獲取 Profile 資料時發生錯誤:', e);
    error.value = e;
  } finally {
    isLoading.value = false;
  }
}

async function handleDeleteGroup(deviceId, testGroupId) {
  if (!confirm(`確定要刪除節點 ${deviceId} 的測試組 ${testGroupId} 的所有資料嗎？`)) {
    return;
  }
  isDeleting.value = true;
  error.value = null;
  try {
    await deleteProfileResultByGroup(deviceId, testGroupId);
    await fetchProfileData();
  } catch (e) {
    error.value = e;
  } finally {
    isDeleting.value = false;
  }
}

async function handleDeleteAllForDevice(deviceId) {
  if (!confirm(`確定要刪除節點 ${deviceId} 的所有 Profile 資料嗎？此操作無法復原！`)) {
    return;
  }
  isDeleting.value = true;
  error.value = null;
  try {
    await deleteAllProfileResultsForDevice(deviceId);
    await fetchProfileData();
  } catch (e) {
    error.value = e;
  } finally {
    isDeleting.value = false;
  }
}


function formatTimestamp(timestampStr) {
    if (!timestampStr) return 'N/A';
    const date = new Date(timestampStr);
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function getSortedTestMethods(testMethodsObject) {
  const entries = Object.entries(testMethodsObject);

  entries.sort(([keyA], [keyB]) => {
    const numA = parseInt(keyA.match(/^\d+/)?.[0] || 0, 10);
    const numB = parseInt(keyB.match(/^\d+/)?.[0] || 0, 10);
    return numA - numB;
  });

  return entries;
}

onMounted(() => {
  fetchProfileData();
});
</script>

<template>
  <main>
    <h1>Profile 全部數據</h1>

    <div v-if="isLoading" class="loading-message">
      <p>正在載入資料...</p>
    </div>

    <div v-else-if="error" class="error-message">
      <p>資料載入失敗：{{ error.message }}</p>
    </div>

    <div v-else-if="profileData && Object.keys(profileData).length > 0">
      <div v-for="(testGroups, deviceId) in profileData" :key="deviceId" class="table-container">
        <div class="device-header-container">
          <h2>節點 ID: {{ deviceId }}</h2>
          <button @click="handleDeleteAllForDevice(deviceId)" :disabled="isDeleting" class="delete-button danger">
            刪除此節點所有資料
          </button>
        </div>

        <div v-for="(testMethods, testGroupId) in testGroups" :key="testGroupId" class="test-group-subsection">
          <div class="group-header-container">
            <h3>測試組 ID: {{ testGroupId }}</h3>
            <button @click="handleDeleteGroup(deviceId, testGroupId)" :disabled="isDeleting" class="delete-button">
              刪除此測試組
            </button>
          </div>
          
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;"></th> <th>測試方法</th>
                <th>平均 TX</th>
                <th>平均 RX</th>
                <th>時間戳</th>
              </tr>
            </thead>
            <tbody>
                <template v-for="([testMethod, result]) in getSortedTestMethods(testMethods)" :key="testMethod">
                <tr class="main-row">
                  <td data-label="詳情">
                    <button @click="toggleDetails(deviceId, testGroupId, testMethod)" class="expand-button">
                      {{ isExpanded(deviceId, testGroupId, testMethod) ? '−' : '+' }}
                    </button>
                  </td>
                  <td data-label="測試方法">{{ testMethod }}</td>
                  <td data-label="平均 TX">{{ result.avg_tx.toFixed(2) }} dBm</td>
                  <td data-label="平均 RX">{{ result.avg_rx.toFixed(2) }} dBm</td>
                  <td data-label="時間戳">{{ formatTimestamp(result.timestamp) }}</td>
                </tr>
                <tr v-if="isExpanded(deviceId, testGroupId, testMethod)" class="details-row">
                  <td colspan="5">
                    <div class="details-content">
                      <h4>捕獲的原始數據 (Captured Raw Data)</h4>
                      <div class="raw-data-container">
                        <div class="raw-data-list">
                          <strong>TX RSSI:</strong>
                          <span>{{ result.captured_txs.join(', ') }}</span>
                        </div>
                        <div class="raw-data-list">
                          <strong>RX RSSI:</strong>
                          <span>{{ result.captured_rxs.join(', ') }}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div v-else class="no-data-message">
        <p>目前沒有任何 Profile 測試結果。</p>
    </div>

  </main>
</template>

<style scoped>
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: sans-serif;
  color: #ddd;
}

h1 {
  color: #ffffff;
  margin-bottom: 2rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
}

h2 {
  color: #ddd;
  margin-bottom: 1rem;
}

h3 {
  color: #bbb;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.table-container {
  margin-top: 2.5rem;
}

.test-group-subsection {
    margin-top: 1.5rem;
}

device-header-container, .group-header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
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
  border: 1px solid #828282;
}

.data-table thead tr {
  color: #bbb;
  font-weight: bold;
}

.data-table tbody tr {
  border-bottom: 1px solid #e0e0e0;
}

.data-table tbody tr:last-of-type {
  border-bottom: none;
}

.delete-button {
  background-color: #c0392b;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.8rem;
}

.delete-button.danger {
    background-color: #e74c3c;
}

.delete-button:disabled {
  background-color: #7f8c8d;
  cursor: not-allowed;
}

.delete-button:hover:not(:disabled) {
  background-color: #e74c3c;
}

.delete-button.danger:hover:not(:disabled) {
    background-color: #c0392b;
}

.loading-message,
.no-data-message {
  text-align: center;
  padding: 2rem;
  color: #777;
  border-radius: 8px;
}

.error-message {
  color: #d9534f;
  border: 1px solid #ebccd1;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.expand-button {
  background: #444;
  color: #eee;
  border: 1px solid #666;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
}

.details-row td {
  padding: 0;
  background-color: #2c2c2c;
  border-left: 0;
  border-right: 0;
}

.details-content {
  padding: 1rem 1.5rem;
}

.details-content h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #eee;
}

.raw-data-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.raw-data-list {
  font-size: 0.9rem;
}

.raw-data-list strong {
  color: #aaa;
  margin-right: 8px;
}

.raw-data-list span {
  color: #ddd;
  word-break: break-all;
}

/* Responsive Design for smaller screens */
@media (max-width: 768px) {
  .data-table thead {
    display: none;
  }

  .data-table, .data-table tbody, .data-table tr, .data-table td {
    display: block;
    width: 100%;
  }

  .data-table tr {
    margin-bottom: 15px;
  }
  
  .data-table tbody tr {
     border-bottom: 0;
  }

  .data-table td {
    text-align: right;
    position: relative;
    padding-left: 50%; 
    border: 1px solid #eee;
  }

  .data-table td::before {
    content: attr(data-label); 
    position: absolute;
    left: 15px;
    width: calc(50% - 30px);
    text-align: left;
    font-weight: bold;
    color: #b3b3b3;
  }
}
</style>