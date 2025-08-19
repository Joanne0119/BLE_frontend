<script setup>
import { ref, onMounted, computed } from 'vue';
import { getProfileResults, deleteProfileResultByGroup, deleteAllProfileResultsForDevice } from '@/services/api';
import ProfileDataView from '@/components/ProfileDataView.vue';
import ProfileChartView from '@/components/ProfileChartView.vue';

const profileData = ref(null);
const isLoading = ref(true);
const error = ref(null);
const isDeleting = ref(false);

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

async function handleDeleteGroup(event) {
  const { deviceId, testGroupId } = event;
  if (!confirm(`確定要刪除節點 ${deviceId} 的測試組 ${testGroupId} 的所有資料嗎？`)) {
    return;
  }
  // 這裡可以加入 isDeleting 的狀態管理
  try {
    await deleteProfileResultByGroup(deviceId, testGroupId);
    await fetchProfileData(); // 重新獲取最新資料
  } catch (e) {
    error.value = e;
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
    await fetchProfileData(); // 重新獲取最新資料
  } catch (e) {
    error.value = e;
  } finally {
    isDeleting.value = false;
  }
}

const sortedProfileData = computed(() => {
  if (!profileData.value) {
    return null;
  }

  const deviceKeys = Object.keys(profileData.value);

  const sortedArray = deviceKeys.map(deviceId => {
    const testGroupsObject = profileData.value[deviceId];
    
    const groupKeys = Object.keys(testGroupsObject);

    groupKeys.sort((a, b) => {
      const numA = parseInt(a.match(/^\d+/)?.[0] || 0, 10);
      const numB = parseInt(b.match(/^\d+/)?.[0] || 0, 10);
      return numA - numB;
    });

    const sortedGroupsArray = groupKeys.map(key => {
      return {
        id: key, 
        data: testGroupsObject[key]
      };
    });
    return {
      deviceId: deviceId,
      groups: sortedGroupsArray
    };
  });

  console.log('最終排序後的陣列資料:', sortedArray);
  return sortedArray;
});

onMounted(() => {
  fetchProfileData();
});
</script>

<template>
  <main>
    <h1>Profile 測試儀表板</h1>

    <div v-if="isLoading" class="loading-message">
      <p>正在載入資料...</p>
    </div>

    <div v-else-if="error" class="error-message">
      <p>資料載入失敗：{{ error.message }}</p>
    </div>

    <div v-else-if="sortedProfileData && Object.keys(sortedProfileData).length > 0">
      <ProfileChartView :profile-data="sortedProfileData" />

      <hr class="section-divider">

      <ProfileDataView
        :profile-data="sortedProfileData"
        @delete-group="handleDeleteGroup"
        @delete-all-for-device="handleDeleteAllForDevice"
      />
    </div>

    <div v-else class="no-data-message">
      <p>目前沒有任何 Profile 測試結果。</p>
    </div>
  </main>
</template>

<style scoped>
/* 可以在這裡放一些儀表板的通用樣式 */
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: sans-serif;
  color: #ddd;
}
.section-divider {
  border: 0;
  height: 1px;
  background: #444;
  margin: 3rem 0;
}
/* ... 其他你需要的樣式 ... */
</style>