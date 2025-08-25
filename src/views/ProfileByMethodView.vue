<script setup>
import { ref, onMounted, computed } from 'vue';
import { getProfileResults } from '@/services/api';
import { Chart as ChartJS, Title, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';
import { BoxPlotController, BoxAndWiskers } from '@sgratzl/chartjs-chart-boxplot';
import { Chart } from 'vue-chartjs';

ChartJS.register(Title, Tooltip, Legend, CategoryScale, LinearScale, BoxPlotController, BoxAndWiskers);

const profileData = ref(null);
const isLoading = ref(true);
const error = ref(null);

const selectedMethods = ref([]);
const showAllMethods = ref(true);
const selectedDevices = ref([]);
const showAllDevices = ref(true);

const selectedSignalTypes = ref(['Tx', 'Rx']);

const viewMode = ref('boxplot'); // 'boxplot' or 'heatmap'

const availableMethods = computed(() => {
  if (!profileData.value) return [];
  const methods = new Set();
  for (const deviceId in profileData.value) {
    for (const testGroupId in profileData.value[deviceId]) {
      Object.keys(profileData.value[deviceId][testGroupId]).forEach(method => methods.add(method));
    }
  }
  const methodsArray = Array.from(methods);
  methodsArray.sort((a, b) => {
    const numA = parseInt(a.match(/^\d+/)?.[0] || 0, 10);
    const numB = parseInt(b.match(/^\d+/)?.[0] || 0, 10);
    return numA - numB;
  });
  return methodsArray;
});

const availableDevices = computed(() => {
  if (!profileData.value) return [];
  return Object.keys(profileData.value).sort();
});

const filteredMethods = computed(() => {
  if (showAllMethods.value) return availableMethods.value;
  return availableMethods.value.filter(m => selectedMethods.value.includes(m));
});

const filteredDevices = computed(() => {
  if (showAllDevices.value) return availableDevices.value;
  return availableDevices.value.filter(d => selectedDevices.value.includes(d));
});

// const chartLabels = computed(() => availableDevices.value);

const dynamicChartData = computed(() => {
  if (!profileData.value || filteredMethods.value.length === 0 || filteredDevices.value.length === 0) {
    return { labels: [], datasets: [] };
  }

  const datasets = [];
  const colors = generateColors(filteredMethods.value);
  // const txColor = 'rgba(231, 76, 60, 0.5)'; 
  // const txBorderColor = '#e74c3c';
  // const rxColor = 'rgba(52, 152, 219, 0.5)'; 
  // const rxBorderColor = '#3498db';

  for (const method of filteredMethods.value) {
    const txDataForThisMethod = [];
    const rxDataForThisMethod = [];
    
    for (const deviceId of filteredDevices.value) {
      let combinedTxs = [];
      let combinedRxs = [];

      if (profileData.value[deviceId]) {
        for (const testGroupId in profileData.value[deviceId]) {
          if (profileData.value[deviceId][testGroupId][method]) {
            const resultData = profileData.value[deviceId][testGroupId][method];
            if (resultData.captured_txs) {
              combinedTxs.push(...resultData.captured_txs.filter(v => typeof v === 'number'));
            }
            if (resultData.captured_rxs) {
              combinedRxs.push(...resultData.captured_rxs.filter(v => typeof v === 'number'));
            }
          }
        }
      }

      txDataForThisMethod.push(combinedTxs.length > 0 ? combinedTxs : null);
      rxDataForThisMethod.push(combinedRxs.length > 0 ? combinedRxs : null);
    }

    const baseColor = colors[method]; // 取得該方法的基礎顏色
    const colorRgb = hexToRgb(baseColor); // 轉換為 RGB 格式

    if(selectedSignalTypes.value.includes('Tx')) {
      datasets.push({
        label: `${method} - Tx`, 
        data: txDataForThisMethod,
        backgroundColor: `rgba(${colorRgb}, 0.3)`,
        borderColor: baseColor,
        borderWidth: 1.5,
      });
    }

    if(selectedSignalTypes.value.includes('Rx')) {
      datasets.push({
        label: `${method} - Rx`,
        data: rxDataForThisMethod,
        backgroundColor: `rgba(${colorRgb}, 0.8)`,
        borderColor: baseColor,
        borderWidth: 1.5,
      });
    }
  }

  return {
    labels: filteredDevices.value,
    datasets: datasets
  };
});

const heatmapData = computed(() => {
  if (!profileData.value || filteredDevices.value.length === 0 || filteredMethods.value.length === 0) {
    return { headers: [], rows: [], minRssi: -100, maxRssi: -30 }; // 初始值
  }

  let allRssiValues = [];

  const headers = [];
  for (const method of filteredMethods.value) {
    if (selectedSignalTypes.value.includes('Tx')) headers.push(`${method} - Tx`);
    if (selectedSignalTypes.value.includes('Rx')) headers.push(`${method} - Rx`);
  }

  const rows = filteredDevices.value.map(deviceId => {
    const deviceData = { deviceId, values: {} };
    for (const method of filteredMethods.value) {
      let allTxValues = [];
      let allRxValues = [];
      for (const testGroupId in profileData.value?.[deviceId] || {}) {
        const methodData = profileData.value?.[deviceId]?.[testGroupId]?.[method];
        if (methodData?.captured_txs) {
          allTxValues.push(...methodData.captured_txs.filter(v => typeof v === 'number'));
        }
        if (methodData?.captured_rxs) {
          allRxValues.push(...methodData.captured_rxs.filter(v => typeof v === 'number'));
        }
      }
      const medianTx = calculateMedian(allTxValues);
      const medianRx = calculateMedian(allRxValues);
      if(selectedSignalTypes.value.includes('Tx')) {
        deviceData.values[`${method} - Tx`] = medianTx;
        if (medianTx !== null) allRssiValues.push(medianTx);
      }
      if(selectedSignalTypes.value.includes('Rx')) {
        deviceData.values[`${method} - Rx`] = medianRx;
        if (medianRx !== null) allRssiValues.push(medianRx);
      }
    }
    return deviceData;
  });

  const minRssi = Math.min(...allRssiValues, -100); 
  const maxRssi = Math.max(...allRssiValues, -30);  

  return { headers, rows, minRssi, maxRssi };
});



const generateColors = (keys) => {
  const baseColors = ['#e65568', '#f274ca', '#3b73db', '#3d93d4', '#29a638', '#b4c97b', '#edb54c', '#ccb78f'];
  const colors = {};
  keys.forEach((key, index) => {
    colors[key] = baseColors[index % baseColors.length];
  });
  return colors;
};

function calculateMedian(arr) {
  if (!arr || arr.length === 0) return null;
  
  const sorted = [...arr].sort((a, b) => a - b);
  
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  } else {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
}

function getHeatmapColor(rssi, min, max) {
  if (rssi === null || rssi === undefined) return '#34495e';

  const percentage = (rssi - min) / (max - min);
  const hue = percentage * 190;

  return `hsl(${hue}, 70%, 60%)`;
}

const hexToRgb = (hex) => {
    if (!hex) return '0,0,0';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  elements: {
    boxandwhiskers: {
      itemRadius: 2,
      
      itemStyle: 'circle',
      itemBackgroundColor: 'rgba(0, 0, 0, 0.3)',
      itemBorderColor: 'transparent',

      outlierRadius: 4,
      outlierBackgroundColor: 'rgba(0, 0, 0, 0.1)',
      medianColor: '#333'
    }
  },
  plugins: {
    legend: { position: 'top', labels: { color: '#333' } },
    title: {
        display: true,
        text: 'Profile Results',
        color: '#333',
        font: { size: 18 }
    },
    datalabels: {
        display: false
    },
  },
  scales: {
    y: {
        max: -50,
        grid: {
            color: 'rgba(0, 0, 0, 0.1)'
        },
        title: {
            display: true,
            text: 'RSSI (dBm)',
            color: '#333'
        },
        ticks: {
          color: '#333'
        }
    },
    x: {
        title: {
            display: true,
            text: '節點 ID',
            color: '#333'
        },
        ticks: { color: '#333' }
        }
  }
};

async function fetchProfileData() {
  isLoading.value = true;
  try {
    profileData.value = await getProfileResults();
  } catch (e) {
    error.value = e;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => fetchProfileData());
</script>

<template>
  <main>
    <h1>Profile 圖表</h1>
    <div v-if="isLoading">正在載入資料...</div>
    <div v-else-if="error">資料載入失敗: {{ error.message }}</div>
    <div v-else>
      <div class="filter-section">
        <div class="filter-group">
          <label class="filter-label">測試方法篩選：</label>
          <label class="checkbox-item">
            <input type="checkbox" v-model="showAllMethods" @change="selectedMethods = []"/>
            顯示全部
          </label>
          <template v-for="method in availableMethods" :key="method">
            <label class="checkbox-item">
              <input type="checkbox" :value="method" v-model="selectedMethods" @change="showAllMethods = false"/>
              {{ method }}
            </label>
          </template>
        </div>
        <div class="filter-group">
          <label class="filter-label">節點 ID 篩選：</label>
          <label class="checkbox-item">
            <input type="checkbox" v-model="showAllDevices" @change="selectedDevices = []"/>
            顯示全部
          </label>
          <template v-for="device in availableDevices" :key="device">
            <label class="checkbox-item">
              <input type="checkbox" :value="device" v-model="selectedDevices" @change="showAllDevices = false"/>
              {{ device }}
            </label>
          </template>
        </div>

        <div class="filter-group">
          <label class="filter-label">訊號類型篩選：</label>
          <label class="checkbox-item">
            <input type="checkbox" value="Tx" v-model="selectedSignalTypes"/>
            Tx (發射)
          </label>
          <label class="checkbox-item">
            <input type="checkbox" value="Rx" v-model="selectedSignalTypes"/>
            Rx (接收)
          </label>
        </div>
      </div>

      <div class="view-mode-toggle">
        <button :class="{ active: viewMode === 'boxplot' }" @click="viewMode = 'boxplot'">盒鬚圖</button>
        <button :class="{ active: viewMode === 'heatmap' }" @click="viewMode = 'heatmap'">熱力圖</button>
      </div>

      <div class="chart-container">
        <template v-if="viewMode === 'boxplot'">
          <Chart 
            v-if="dynamicChartData.datasets.length > 0"
            type="boxplot" 
            :data="dynamicChartData" 
            :options="chartOptions" 
          />
         <div v-else class="no-data-message">請至少選擇一個測試方法、節點 ID 、訊號類型以顯示圖表。</div>
        </template>
        <template v-if="viewMode === 'heatmap'">
          <div class="heatmap-container" v-if="heatmapData.rows.length > 0">
            <table class="heatmap-table">
              <thead>
                <tr>
                  <th>節點 ID</th>
                  <th v-for="header in heatmapData.headers" :key="header">{{ header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in heatmapData.rows" :key="row.deviceId">
                  <td>{{ row.deviceId }}</td>
                  <td
                    v-for="header in heatmapData.headers"
                    :key="header"
                    :style="{ backgroundColor: getHeatmapColor(row.values?.[header], heatmapData.minRssi, heatmapData.maxRssi) }"
                  >
                    {{ row.values?.[header] != null ? row.values?.[header].toFixed(1) : 'N/A' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="no-data-message">沒有可顯示的熱力圖數據。</div>
        </template>
      </div>
    </div>
  </main>
</template>

<style scoped>
h1 {
  color: #333;
  margin-bottom: 2rem;
  border-bottom: 2px solid #ddd;
  padding-bottom: 1rem;
}
main {
    max-width: 1600px;
    margin: 0 auto;
    padding: 0.5rem;
    color: #333;
    background-color: #fff;
}
.filter-section {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 2rem;
    background-color: #f9f9f9;
}
.filter-group:not(:last-child) {
  margin-bottom: 1rem;
}
.filter-group {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
}
.filter-label {
    font-weight: bold;
}
.checkbox-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
}
.chart-container {
    position: relative;
    height: 600px;
    width: 100%;
}
.no-data-message {
    text-align: center;
    padding: 2rem;
    font-size: 1.2rem;
    color: #888;
}
.view-mode-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  gap: 1rem;
}
.view-mode-toggle button {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  background-color: #fff;
  color: #333;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}
.view-mode-toggle button:hover {
  background-color: #f0f0f0;
}
.view-mode-toggle button.active {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
  font-weight: bold;
}
.heatmap-container {
  width: 100%;
  overflow-x: auto; 
}

.heatmap-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
  font-size: 0.85rem; 
}
.heatmap-table th, .heatmap-table td {
  border: 1px solid #ccc;
  padding: 0.5rem 0.4rem; 
  text-shadow: none;
  min-width: 80px; 
  white-space: nowrap;
}
.heatmap-table th {
  background-color: #f2f2f2;
}
.heatmap-table td {
  font-weight: bold;
  color: #333;
  transition: transform 0.2s;
}

@media (max-width: 768px) {
    .heatmap-table {
        font-size: 0.75rem; 
    }
    .heatmap-table th, .heatmap-table td {
        padding: 0.4rem 0.2rem; 
        min-width: 70px;
    }
}
</style>