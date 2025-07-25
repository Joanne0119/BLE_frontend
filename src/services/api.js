const API_BASE_URL = 'http://152.42.241.75:5000/api'; 

const handleApiError = async (response) => {
  if (!response.ok) {
    let errorMessage = `HTTP Error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      errorMessage = `無法連接到服務器 (${response.status})`;
    }
    throw new Error(errorMessage);
  }
  return response;
};

const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('請求超時')), timeout)
    )
  ]);
};

export async function getTestGroups() {
  try {
    console.log('Fetching test groups from:', `${API_BASE_URL}/test_groups`);
    const response = await fetchWithTimeout(`${API_BASE_URL}/test_groups`);
    await handleApiError(response);
    const data = await response.json();
    console.log('Test groups response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching test groups:', error);
    if (error.message === '請求超時') {
      throw new Error('獲取測試群組超時，請檢查網路連接');
    }
    throw new Error(`無法獲取測試群組: ${error.message}`);
  }
}

export async function deleteTestGroup(displayName) {
  try {
    console.log('Deleting test group:', displayName);
    const response = await fetchWithTimeout(`${API_BASE_URL}/delete_test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ display_name: displayName }),
    });
    await handleApiError(response);
    const data = await response.json();
    console.log('Delete response:', data);
    return data;
  } catch (error) {
    console.error('Error deleting test group:', error);
    if (error.message === '請求超時') {
      throw new Error('刪除測試群組超時，請檢查網路連接');
    }
    throw new Error(`刪除測試群組失敗: ${error.message}`);
  }
}

export async function getAllData() {
  try {
    console.log('Fetching all data from:', `${API_BASE_URL}/get_all_average_rates_data`);
    const response = await fetchWithTimeout(`${API_BASE_URL}/get_all_average_rates_data`, {}, 15000);
    await handleApiError(response);
    const data = await response.json();
    console.log('All data response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching all data:', error);
    if (error.message === '請求超時') {
      throw new Error('獲取所有數據超時，請檢查網路連接');
    }
    throw new Error(`無法獲取所有數據: ${error.message}`);
  }
}

export async function getChartData() {
  try {
    console.log('Fetching chart data from:', `${API_BASE_URL}/chart-data`);
    const response = await fetchWithTimeout(`${API_BASE_URL}/chart-data`, {}, 15000);
    await handleApiError(response);
    const data = await response.json();
    console.log('Chart data response:', data);
    
    if (!data) {
      throw new Error('API 返回空數據');
    }
    
    if (!data.data_points) {
      console.warn('No data_points in response:', data);
      return {
        nodes: [],
        data_points: [],
        statistics: {},
        ...data
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching chart data:', error);
    if (error.message === '請求超時') {
      throw new Error('獲取圖表數據超時，請檢查網路連接');
    }
    throw new Error(`無法獲取圖表數據: ${error.message}`);
  }
}

export async function testConnection() {
  try {
    console.log('Testing connection to:', API_BASE_URL);
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5000);
    return response.ok;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}