import { createSlice } from '@reduxjs/toolkit';

const mainSlice = createSlice({
  name: 'main',
  initialState: { branchName: 'HOLIS', noLokasi: '' },
  reducers: {
    selectBranch: (state, action) => {
      state.branchName = action.payload;
    },
    setNoLokasi: (state, action) => {
      state.noLokasi = action.payload;
    },
  },
});

export const { selectBranch, setNoLokasi } = mainSlice.actions;
export default mainSlice.reducer;
