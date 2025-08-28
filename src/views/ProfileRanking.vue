<script setup>
import { ref, onMounted } from 'vue';
import { getRankings } from '@/services/api';

const rankedNodes = ref([]);
const isLoading = ref(true);
const error = ref(null);

async function fetchData() {
  isLoading.value = true;
  error.value = null;
  try {
    rankedNodes.value = await getRankings();
  } catch (e) {
    error.value = e;
  } finally {
    isLoading.value = false;
  }
}

console.log(rankedNodes.value);

onMounted(() => {
  fetchData();
});
</script>

<template>
  <main>
    <h1>Profile  評分排名</h1>
    <div v-if="isLoading" class="loading-message">正在計算排名...</div>
    <div v-else-if="error" class="error-message">分析失敗：{{ error.message }}</div>
    <div v-else-if="rankedNodes.length > 0">
      
      <div class="table-wrapper">
        <table class="data-table">
        <thead>
          <tr>
            <th>綜合排名</th>
            <th>節點 ID</th>
            <th>TX 效能分數</th>
            <th>RX 效能分數</th>
            <th>綜合效能總分</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="device in rankedNodes" :key="device.device_id">
            <td data-label="綜合排名">{{ device.rank }}</td>
            <td data-label="節點 ID">{{ device.device_id }}</td>
            <td data-label="TX 效能分數">{{ device.tx_performance_score.toFixed(2) }}</td>
            <td data-label="RX 效能分數">{{ device.rx_performance_score.toFixed(2) }}</td>
            <td data-label="綜合效能總分"><strong>{{ device.comprehensive_score.toFixed(2) }}</strong></td>
          </tr>
        </tbody>
      </table>
      </div>

      <div class="description">
        <h4>計分方法說明：</h4>
        <ol>
          <li>
            <strong>分組評分：</strong>
            系統將所有數據按「測試方法」（如 5m_Horizontal）分組。在每個組內，獨立評估所有節點的「訊號強度」與「訊號穩定性」。
          </li>
          <li>
            <strong>百分比排名 (0-100分)：</strong>
            在組內，系統會計算每個節點的表現超過了百分之多少的對手，並將其轉換為 0-100 的分數。例如，強度第一名的節點，其強度分數即為 100。
          </li>
          <li>
            <strong>加權計算：</strong>
            根據「強度分數」(權重50%)和「穩定性分數」(權重50%)，計算出該節點在該項測試中的 TX 和 RX 效能分數。
          </li>
          <li>
            <strong>綜合排名：</strong>
            最終的綜合分數是該節點在所有參與測試中得分的平均值，並以此進行排名。
          </li>
        </ol>
      </div>
    </div>
    <div v-else class="no-data-message">沒有可供分析的資料。</div>
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
.description { 
    margin-top: 2.5rem; 
    padding: 1rem 1.5rem;
    color: #444; 
    font-style: normal;
}
.description h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #333;
}
.description ol {
  padding-left: 20px;
  margin: 0;
}
.description li {
  margin-bottom: 0.5rem;
}
.description code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
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
</style>