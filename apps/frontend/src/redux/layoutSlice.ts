import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isSidebarOpen: false,
  branchName: 'HOLIS',
  lastFetch: {
    last_fetch_repo: '',
    last_fetch_repo_epoch_time: '',
  }, // TODO:hit from api and replace with result date
  location: '',
};
const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    selectBranch: (state, action) => {
      state.branchName = action.payload;
    },
    setNoLokasi: (state, action) => {
      state.location = action.payload;
    },
    setLastFetch: (state, action) => {
      state.lastFetch = action.payload;
    },
  },
});

export const { toggleSidebar, selectBranch, setNoLokasi, setLastFetch } = layoutSlice.actions;
export default layoutSlice.reducer;
