<script setup>
import { Chart as ChartJS, Title, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';
import { BoxPlotController, BoxAndWiskers } from '@sgratzl/chartjs-chart-boxplot';
import { Chart } from 'vue-chartjs';

ChartJS.register(Title, Tooltip, Legend, CategoryScale, LinearScale, BoxPlotController, BoxAndWiskers);

const props = defineProps({
  profileData: {
    type: Array,
    required: true
  }
});

console.log('ProfileDataView (表格) 接收到的 props:', props.profileData);

function generateChartData(testMethods) {
  const labels = [];
  const txData = [];
  const rxData = [];

  const colors = {
    tx: 'rgba(255, 99, 132, 0.5)',
    rx: 'rgba(54, 162, 235, 0.5)'
  };

  const sortedKeys = Object.keys(testMethods);

  sortedKeys.sort((a, b) => {
    const numA = parseInt(a.match(/^\d+/)?.[0] || 0, 10);
    const numB = parseInt(b.match(/^\d+/)?.[0] || 0, 10);
    return numA - numB;
  });

  for (const testMethod of sortedKeys) {
    const result = testMethods[testMethod];
    
    labels.push(testMethod);
    
    txData.push(result.captured_txs.filter(v => typeof v === 'number'));
    rxData.push(result.captured_rxs.filter(v => typeof v === 'number'));
  }

  return {
    labels,
    datasets: [
      {
        label: 'TX RSSI (dBm)',
        backgroundColor: colors.tx,
        borderColor: 'red',
        borderWidth: 1,
        data: txData,
      },
      {
        label: 'RX RSSI (dBm)',
        backgroundColor: colors.rx,
        borderColor: 'blue',
        borderWidth: 1,
        data: rxData,
      }
    ]
  };
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: false,
    },
    datalabels: {
        display: false
    },
  },
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
  scales: {
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.3)' 
      },
      ticks: {
        color: '#fff',
        callback: function(value) {
          return value + ' dBm';
        }
      }
    },
    x: {
      grid: {
        display: false, 
      },
      ticks: {
        color: '#fff', 
        font: {
          size: 12
        }
      }
    }
  }
};
</script>

<template>
  <div class="charts-area">
    <h2>圖表分析</h2>
    
    <div v-for="deviceData in profileData" :key="deviceData.deviceId" class="device-chart-group">
      
      <div v-for="group in deviceData.groups" :key="group.id" class="chart-container">
        
        <h3 class="chart-title">節點: {{ deviceData.deviceId }} / 測試組: {{ group.id }}</h3>
        
        <div style="height: 400px">
          <Chart 
            type="boxplot" 
            :data="generateChartData(group.data)" 
            :options="chartOptions" 
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.charts-area {
  margin-bottom: 2rem;
}

.device-chart-group {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #d7d7d7;
}

.chart-container {
  margin-bottom: 3rem; 
}

.chart-title {
  color: #ddd;
  text-align: center;
  margin-bottom: 1rem;
}
</style>