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

  for (const method of filteredMethods.value) {
    const dataForThisMethod = [];
    
    for (const deviceId of filteredDevices.value) {
      let allValues = []; 
      
      if (profileData.value[deviceId]) {
        for (const testGroupId in profileData.value[deviceId]) {
          if (profileData.value[deviceId][testGroupId][method]) {
            const resultData = profileData.value[deviceId][testGroupId][method].captured_rxs;
            if (resultData && Array.isArray(resultData)) {
              allValues.push(...resultData);
            }
          }
        }
      }

      dataForThisMethod.push(allValues.length > 0 ? allValues : null);
    }

    datasets.push({
      label: method,
      data: dataForThisMethod,
      backgroundColor: `rgba(${hexToRgb(colors[method])}, 0.5)`,
      borderColor: colors[method],
      borderWidth: 1.5,
    });
  }

  return {
    labels: filteredDevices.value,
    datasets: datasets
  };
});


const generateColors = (keys) => {
  const baseColors = ['#e65568', '#f797a2', '#3b73db', '#3d93d4', '#29a638', '#97cc81', '#edb54c', '#ccb78f'];
  const colors = {};
  keys.forEach((key, index) => {
    colors[key] = baseColors[index % baseColors.length];
  });
  return colors;
};

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
      itemBackgroundColor: 'rgba(255, 255, 255, 0.2)', 
      itemBorderColor: 'transparent', 

      outlierRadius: 4,
      outlierBackgroundColor: 'rgba(255, 255, 255, 0.2)', 
      medianColor: '#888'                   
    }
  },
  plugins: {
    legend: { position: 'top', labels: { color: '#ddd' } },
    title: { 
        display: true, 
        text: 'Profile Results', 
        color: '#ddd', 
        font: { size: 18 } 
    },
    datalabels: {
        display: false
    },
  },
  scales: {
    y: { 
        grid: {
            color: 'rgba(255, 255, 255, 0.3)' 
        },
        title: { 
            display: true, 
            text: 'RSSI (dBm)', 
            color: '#fff'
        }, 
        ticks: { color: '#fff' } 
    },
    x: { 
        title: { 
            display: true, 
            text: '節點 ID', 
            color: '#fff' 
        }, 
        ticks: { color: '#fff' } 
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
      </div>

      

      <div class="chart-container">
        <Chart 
          v-if="dynamicChartData.datasets.length > 0"
          type="boxplot" 
          :data="dynamicChartData" 
          :options="chartOptions" 
        />
        <div v-else class="no-data-message">請至少選擇一個測試方法或節點 ID 以顯示圖表。</div>
      </div>
    </div>
  </main>
</template>

<style scoped>
h1 {
  color: #ffffff;
  margin-bottom: 2rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
}
main { 
    max-width: 1600px; 
    margin: 0 auto; 
    padding: 2rem; 
    color: #ddd; 
}
.filter-section { 
    border: 1px solid #555; 
    border-radius: 4px; 
    padding: 1rem; 
    margin-bottom: 2rem; 
    background-color: rgba(255, 255, 255, 0.05); 
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
}
</style>