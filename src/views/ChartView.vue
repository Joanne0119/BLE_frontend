<script setup>
import { ref, onMounted, computed } from 'vue';
import { getChartData } from '@/services/api';
import BarChart from '@/components/BarChart.vue';

const chartAPIData = ref(null);
const isLoading = ref(true);
const error = ref(null);

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: {
      display: true,
      text: '節點接收率比較',
    },
    tooltip: {
      mode: 'index',
      callbacks: {
        title: function (tooltipItems) {
            const firstItem = tooltipItems[0];
            return `節點 ID: ${firstItem.label}`;
        },
        label: function (context) {
            const label = context.dataset.label || '';
            const value = context.raw;
            return `${label}: ${value.toFixed(2)} 次/秒`;
        }
      }
    },
    legend: {
        display: false,
    }
  },
  scales: {
    x: {
      stacked: true, 
      title: {
        display: true,
        text: '節點 ID',
      },
    },
    y: {
      stacked: true, 
      title: {
        display: true,
        text: '平均接收率 (次/秒)',
      },
    },
  },
});

const chartDataForVueChart = computed(() => {
  if (!chartAPIData.value || !chartAPIData.value.data_points) {
    return { labels: [], datasets: [] }; // if no data, return an empty object
  }

  const { nodes, data_points } = chartAPIData.value;
  const datasetsMap = new Map(); // 用 Map 來暫存和組織 datasets

  const colorPalette = ['#D4A574', '#9FD4E8', '#E8A5A5', '#A5E8A5', '#E8C5E8', '#E8E8A5'];
  const testGroups = [...new Set(data_points.map(p => p.test_group))].sort();
  const groupColors = {};
  testGroups.forEach((group, index) => {
    groupColors[group] = colorPalette[index % colorPalette.length];
  });
  
  data_points.forEach(point => {
    // 建立一個獨一無二的 key 來識別每一個 dataset (例如: 'Test #1-Neighbor 6')
    const datasetKey = `${point.test_group}-Neighbor ${point.neighbor_id}`;
    
    // 如果還沒見過這個 dataset，就初始化它
    if (!datasetsMap.has(datasetKey)) {
      datasetsMap.set(datasetKey, {
        label: `Neighbor ${point.neighbor_id} (${point.test_group})`,
        stack: point.test_group, // 讓同一個 Test Group 的 Bar 堆疊在一起
        backgroundColor: (point.floor_type === 'same-floor') 
            ? groupColors[point.test_group] 
            : `rgba(${hexToRgb(groupColors[point.test_group])}, 0.4)`, // 跨樓層用半透明
        // 建立一個長度與 X 軸標籤 (nodes) 相同的陣列，並填滿 0
        data: new Array(nodes.length).fill(0),
      });
    }

    // 找到這個 data 點對應到 X 軸的位置 (index)
    const nodeIndex = nodes.indexOf(point.node_id);
    if (nodeIndex !== -1) {
      // 在正確的位置填上 reception_rate
      datasetsMap.get(datasetKey).data[nodeIndex] = point.reception_rate;
    }
  });

  return {
    labels: nodes.map(String), // X 軸標籤
    datasets: Array.from(datasetsMap.values()), // 最終給圖表的 datasets
  };
});

// 將 HEX 顏色轉為 RGB 字串
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

async function fetchChartData() {
  try {
    isLoading.value = true;
    error.value = null;
    chartAPIData.value = await getChartData();
  } catch (e) {
    error.value = e.message;
  } finally {
    isLoading.value = false;
  }
}


onMounted(() => {
  fetchChartData();
});
</script>

<template>
  <div class="chart">
    <h1>Chart View</h1>

    <div v-if="isLoading">
      正在載入圖表數據...
    </div>

    <div v-else-if="error" class="error-message">
      載入失敗：{{ error }}
    </div>

    <div v-else>
      <BarChart :chart-data="chartDataForVueChart" :chart-options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.chart-view {
  padding: 2rem;
}
.loading-message, .error-message {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
}
.error-message {
  color: #ef4444;
}
.chart-container {
  position: relative;
  height: 70vh; /* 佔用 70% 的視窗高度 */
  width: 100%;
}
</style>
