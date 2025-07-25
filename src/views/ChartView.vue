<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getChartData } from '@/services/api';
import BarChart from '@/components/BarChart.vue';
import { floorsConfig } from '@/config/cofig.js';

Chart.register(ChartDataLabels);

const chartAPIData = ref(null);
const isLoading = ref(true);
const error = ref(null);

let intervalId = null;
let lastUpdatedTime = ref(null);

const formattedLastUpdatedTime = computed(() => {
  if (!lastUpdatedTime.value) {
    return '正在獲取初始資料...';
  }
  return `${lastUpdatedTime.value.toLocaleString('zh-TW')}`;
});

// 篩選器狀態
const selectedTestGroups = ref([]);
const showAllTests = ref(true);

// 動態顏色生成器
const generateColors = (testGroups) => {
  const baseColors = [
    '#D4A574', // 棕色
    '#9FD4E8', // 藍色  
    '#E8A5A5', // 粉紅色
    '#A5E8A5', // 綠色
    '#E8C5E8', // 紫色
    '#E8E8A5', // 黃色
    '#C5E8E8', // 青色
    '#FFB366', // 橙色
    '#B366FF', // 藍紫色
    '#66FFB3'  // 青綠色
  ];
  
  const colors = {};
  testGroups.forEach((group, index) => {
    const baseColor = baseColors[index % baseColors.length];
    colors[group] = {
      same: baseColor,
      cross: lightenColor(baseColor, 0.3) // 跨樓層使用較淺的顏色
    };
  });
  
  return colors;
};

// 顏色變淺函數
const lightenColor = (hex, percent) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent * 100);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

// 獲取節點所在樓層
function getNodeFloor(nodeId) {
  const nodeInt = parseInt(nodeId);
  for (const [floorName, nodes] of Object.entries(floorsConfig)) {
    if (nodes.includes(nodeInt)) {
      return floorName;
    }
  }
  return null;
}

// 從數據中動態獲取測試組
const availableTestGroups = computed(() => {
  if (!chartAPIData.value || !chartAPIData.value.data_points) {
    return [];
  }
  
  const groups = [...new Set(chartAPIData.value.data_points.map(point => point.test_group))];
  return groups.sort();
});

// 篩選後的測試組
const filteredTestGroups = computed(() => {
  if (showAllTests.value) {
    return availableTestGroups.value;
  }
  return selectedTestGroups.value.filter(group => availableTestGroups.value.includes(group));
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: {
      display: true,
      text: 'Node Reception Rate Comparison by Test Group',
      color: 'white',
      font: {
        size: 16
      },
      padding: {
        bottom: 20
      }
    },
    tooltip: {
      mode: 'point',
      intersect: true,
      callbacks: {
        title: function (tooltipItems) {
          const item = tooltipItems[0];
          return `Node ${item.label}`;
        },
        label: function (context) {
          const neighborId = context.dataset.neighborId;
          const testGroup = context.dataset.testGroup;
          const value = context.raw;
          return `${testGroup} - Neighbor ${neighborId}: ${value.toFixed(1)} pkts/sec`;
        }
      }
    },
    legend: {
      display: true,
      position: 'top',
      align: 'center',
      labels: {
        usePointStyle: true,
        padding: 15,
        boxWidth: 12,
        font: {
          size: 12
        },
        color: 'white',
        generateLabels: function(chart) {
          const colors = generateColors(filteredTestGroups.value);
          const labels = [];
          
          filteredTestGroups.value.forEach(group => {
            labels.push({
              text: `${group} (Same Floor)`,
              fillStyle: colors[group].same,
              strokeStyle: colors[group].same,
              pointStyle: 'rect',
              fontColor: 'white'
            });
            labels.push({
              text: `${group} (Cross-Floor)`,
              fillStyle: colors[group].cross,
              strokeStyle: colors[group].cross,
              pointStyle: 'rect',
              fontColor: 'white'
            });
          });
          
          return labels;
        }
      }
    },
    datalabels: {
      display: function(context) {
        const value = context.dataset.data[context.dataIndex];
        return value > 0 ? 'auto' : false;
      },
      color: '#343434',
      font: {
        size: 8,
        weight: 'meium'
      },
      formatter: function(value) {
        return value.toFixed(1);
      },
      anchor: 'center',
      align: 'center',
      offset: 2
    }
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Node ID',
        color: 'white',
        font: {
          size: 14
        }
      },
      ticks: {
        color: 'white',
        callback: function(value, index) {
          const label = this.getLabelForValue(value);
          return label.padStart(2, '0');
        }
      }
    },
    y: {
      title: {
        display: true,
        text: 'Average Reception Rate (packets/sec)',
        color: 'white',
        font: {
          size: 14
        }
      },
      ticks: {
        color: 'white'
      },
      beginAtZero: true,
      grid: {
        display: true,
        drawOnChartArea: true,
        color: 'rgba(255,255,255,0.2)'
      }
    },
  },
  interaction: {
    mode: 'point'
  },
  layout: {
    padding: {
      top: 30,
      bottom: 10,
      left: 10,
      right: 10
    }
  }
}));

const chartDataForVueChart = computed(() => {
  console.log('Computing chart data...');
  console.log('chartAPIData.value:', chartAPIData.value);
  console.log('filteredTestGroups.value:', filteredTestGroups.value);
  
  if (!chartAPIData.value || !chartAPIData.value.data_points) {
    console.log('No chart data or data points');
    return { labels: [], datasets: [] };
  }

  const { nodes, data_points } = chartAPIData.value;
  const testGroups = filteredTestGroups.value;
  
  if (testGroups.length === 0) {
    console.log('No test groups');
    return { labels: nodes || [], datasets: [] };
  }
  
  // 動態生成顏色
  const colors = generateColors(testGroups);

  // 按節點和測試組組織數據
  const nodeData = {};
  (nodes || []).forEach(nodeId => {
    nodeData[nodeId] = {};
    testGroups.forEach(group => {
      nodeData[nodeId][group] = [];
    });
  });

  // 只使用篩選後的數據
  const filteredDataPoints = data_points.filter(point => 
    testGroups.includes(point.test_group)
  );

  console.log('filteredDataPoints:', filteredDataPoints);

  // 填充數據
  filteredDataPoints.forEach(point => {
    if (nodeData[point.node_id] && nodeData[point.node_id][point.test_group]) {
      nodeData[point.node_id][point.test_group].push({
        neighborId: point.neighbor_id,
        receptionRate: point.reception_rate,
        floorType: point.floor_type
      });
    }
  });
  console.log('nodeData:', nodeData);
  const datasets = [];
  
  // 為每個測試組創建數據集
  testGroups.forEach((testGroup, groupIndex) => {
    // 收集該測試組中所有可能的鄰居
    const allNeighbors = new Set();
    Object.values(nodeData).forEach(nodeTests => {
      if (nodeTests[testGroup]) {
        nodeTests[testGroup].forEach(neighbor => {
          allNeighbors.add(neighbor.neighborId);
        });
      }
    });
    
    // 為該測試組中的每個鄰居創建一個數據集
    Array.from(allNeighbors).forEach((neighborId) => {
      const data = (nodes || []).map(nodeId => {
        const nodeNeighbors = nodeData[nodeId][testGroup] || [];
        const neighbor = nodeNeighbors.find(n => n.neighborId === neighborId);
        return neighbor ? neighbor.receptionRate : 0;
      });
      
      // 計算顏色 (同樓層 vs 跨樓層)
      let color = colors[testGroup].same;
      const sampleNodeId = (nodes || []).find(nodeId => {
        const neighbors = nodeData[nodeId][testGroup] || [];
        const neighbor = neighbors.find(n => n.neighborId === neighborId);
        return neighbor;
      });
      
      if (sampleNodeId) {
        const neighbors = nodeData[sampleNodeId][testGroup] || [];
        const neighbor = neighbors.find(n => n.neighborId === neighborId);
        if (neighbor && neighbor.floorType === 'cross-floor') {
          color = colors[testGroup].cross;
        }
      }
      
      // 只添加有數據的數據集
      if (data.some(value => value > 0)) {
        datasets.push({
          label: `${testGroup}-${neighborId}`,
          data: data,
          backgroundColor: color,
          borderColor: '#343434',
          borderWidth: 1.2,
          stack: testGroup,
          neighborId: neighborId,
          testGroup: testGroup,
          barPercentage: 1.0,
          categoryPercentage: 0.88
        });
      }
    });
  });

  console.log('Final datasets:', datasets);

  return {
    labels: nodes || [],
    datasets: datasets
  };
});

// 統計信息（只顯示篩選後的測試組）
const filteredStatistics = computed(() => {
  if (!chartAPIData.value || !chartAPIData.value.statistics) {
    return {};
  }
  
  const filtered = {};
  filteredTestGroups.value.forEach(group => {
    if (chartAPIData.value.statistics[group]) {
      filtered[group] = chartAPIData.value.statistics[group];
    }
  });
  
  // 改善數據也要篩選
  if (chartAPIData.value.statistics.improvements) {
    filtered.improvements = {};
    Object.keys(chartAPIData.value.statistics.improvements).forEach(group => {
      if (filteredTestGroups.value.includes(group)) {
        filtered.improvements[group] = chartAPIData.value.statistics.improvements[group];
      }
    });
  }

  return filtered;
});

// 修正後的篩選器變更處理
const handleTestGroupChange = () => {
  // 當有選中項目時，自動關閉"顯示全部"
  if (selectedTestGroups.value.length > 0) {
    showAllTests.value = false;
  }
  // 當沒有選中任何項目且"顯示全部"也是false時，自動開啟"顯示全部"
  else if (selectedTestGroups.value.length === 0 && !showAllTests.value) {
    showAllTests.value = true;
  }
};

const toggleShowAll = () => {
  if (showAllTests.value) {
    // 如果要開啟"顯示全部"，清空個別選擇
    selectedTestGroups.value = [];
  } else {
    // 如果要關閉"顯示全部"，確保至少有一個項目被選中
    if (selectedTestGroups.value.length === 0 && availableTestGroups.value.length > 0) {
      selectedTestGroups.value = [availableTestGroups.value[0]];
    }
  }
};

async function fetchChartData() {
  try {
    console.log('Fetching chart data...');
    const data = await getChartData();
    console.log('Received chart data:', data);
    chartAPIData.value = data
    showAllTests.value = true;
    selectedTestGroups.value = [];
    lastUpdatedTime.value = new Date();
    error.value = null;
  } catch (e) {
    console.error('Failed to fetch chart data:', e);
    error.value = e.message;
  } finally {
    if (isLoading.value) {
      isLoading.value = false;
    }
  }
}

onMounted(() => {
  console.log('Component mounted, fetching data...');
  fetchChartData();

  intervalId = setInterval(fetchChartData, 30000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

// 添加 watch 來監聽數據變化
import { watch } from 'vue';

watch(availableTestGroups, (newGroups) => {
  console.log('Available test groups changed:', newGroups);
}, { immediate: true });

watch(filteredTestGroups, (newGroups) => {
  console.log('Filtered test groups changed:', newGroups);
}, { immediate: true });

watch(chartAPIData, (newData) => {
  console.log('Chart API data changed:', newData);
}, { immediate: true, deep: true });
</script>

<template>
  <main class="chart">
    <h1>圖表與比較</h1>
    <div class="last-updated-time">最後更新時間：{{ formattedLastUpdatedTime }}</div>
    <div v-if="isLoading" class="loading-message">
      正在載入圖表數據...
    </div>

    <div v-else-if="error" class="error-message">
      載入失敗：{{ error }}
      <button @click="fetchChartData" class="retry-button">重試</button>
    </div>

    <div v-else class="chart-wrapper">
      <!-- Debug 信息 -->
      <!-- <div class="debug-info" style="background: rgba(255,255,255,0.1); padding: 10px; margin-bottom: 10px; font-size: 12px; color: #ccc;">
        <div>API Data: {{ chartAPIData ? 'Loaded' : 'Not loaded' }}</div>
        <div>Available Groups: {{ availableTestGroups.length }}</div>
        <div>Filtered Groups: {{ filteredTestGroups.length }}</div>
        <div>Chart Data Labels: {{ chartDataForVueChart.labels?.length || 0 }}</div>
        <div>Chart Data Datasets: {{ chartDataForVueChart.datasets?.length || 0 }}</div>
      </div> -->

      <!-- 篩選器 -->
      <div class="filter-section">
        <div class="filter-group">
          <label class="filter-label">測試組篩選：</label>
          
          <label class="checkbox-item">
            <input 
              type="checkbox" 
              v-model="showAllTests" 
              @change="toggleShowAll"
            />
            顯示全部
          </label>
          
          <template v-for="group in availableTestGroups" :key="group">
            <label class="checkbox-item">
              <input 
                type="checkbox" 
                :value="group" 
                v-model="selectedTestGroups"
                @change="handleTestGroupChange"
              />
              {{ group }}
            </label>
          </template>
        </div>
        
        <div class="filter-info">
          顯示 {{ filteredTestGroups.length }} / {{ availableTestGroups.length }} 個測試組
        </div>
      </div>

      <!-- 統計信息框 -->
      <div class="statistics-boxes" v-if="Object.keys(filteredStatistics).length > 0">
        
        <div v-for="(stats, testGroup) in filteredStatistics" :key="testGroup">
          <template v-if="testGroup !== 'improvements'">
            <div class="stat-box" >
              <div class="stat-title">{{ testGroup }} Statistics</div>
              <div class="stat-content">
                <div>Same-Floor Avg: {{ stats.same_floor_avg?.toFixed(2) || 'N/A' }} pkts/sec</div>
                <div>Cross-Floor Avg: {{ stats.cross_floor_avg?.toFixed(2) || 'N/A' }} pkts/sec</div>
                <div>Overall Avg: {{ stats.overall_avg?.toFixed(2) || 'N/A' }} pkts/sec</div>
              </div>
            </div>
          </template>
        </div>
        
        <div class="stat-box" v-if="filteredStatistics.improvements && Object.keys(filteredStatistics.improvements).length > 0">
          <div class="stat-title">Improvements vs Base:</div>
          <div class="stat-content">
            <div v-for="(improvement, group) in filteredStatistics.improvements" :key="group">
              {{ group }}: {{ improvement.diff }} pkts/sec ({{ improvement.percent }})
            </div>
          </div>
        </div>
      </div>
      
      <!-- 圖表容器 -->
      <div class="chart-container" v-if="chartDataForVueChart.datasets.length > 0">
        <BarChart :chart-data="chartDataForVueChart" :chart-options="chartOptions" />
      </div>
      
      <div v-else class="no-data-message">
        沒有可顯示的圖表數據
      </div>
    </div>
  </main>
</template>

<style scoped>
.chart {
  padding: 1rem;
}

h1 {
  color: #ffffff;
  margin-bottom: 2rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
}

.last-updated-time {
  margin-bottom: 1rem;
  color: #8c8c8c;
}

.loading-message, .error-message, .no-data-message {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: white;
}

.error-message {
  color: #ef4444;
}

.retry-button {
  margin-left: 1rem;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-button:hover {
  background-color: #2563eb;
}

.chart-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-section {
  border: 1px solid #555;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: rgba(255, 255, 255, 0.05);
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.filter-label {
  font-weight: bold;
  margin-right: 0.5rem;
  color: white;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: white;
}

.checkbox-item input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.filter-info {
  font-size: 0.85rem;
  color: #ccc;
  font-style: italic;
}

.statistics-boxes {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.stat-box {
  border: 1px solid #555;
  border-radius: 4px;
  padding: 0.75rem;
  min-width: 200px;
  font-size: 0.9rem;
  background-color: rgba(255, 255, 255, 0.05);
}

.stat-title {
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: white;
}

.stat-content div {
  margin-bottom: 0.25rem;
  color: #ddd;
}

.chart-container {
  position: relative;
  height: 700px;
  width: 100%;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.1);
}
</style>