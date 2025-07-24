const API_BASE_URL = 'http://152.42.241.75:5000/api'; 

export async function getTestGroups() {
  const response = await fetch(`${API_BASE_URL}/test_groups`);
  if (!response.ok) {
    throw new Error('無法獲取測試群組');
  }
  return response.json();
}

/**
 * 刪除指定的測試群組
 * 對應後端 POST /api/delete_test
 * @param {string} displayName 
 */
export async function deleteTestGroup(displayName) {
  const response = await fetch(`${API_BASE_URL}/delete_test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ display_name: displayName }),
  });
  if (!response.ok) {
    throw new Error('刪除測試群組失敗');
  }
  return response.json();
}
