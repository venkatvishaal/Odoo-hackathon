import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    activeTab: 'dashboard',
    modals: {
      addVehicle: false,
      addDriver: false,
      createTrip: false,
      completeTrip: null, // tripId to complete
      openMaintenance: false
    }
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTab: (state, action) => {
      state.activeTab = action.payload;
    },
    openModal: (state, action) => {
      state.modals[action.payload.name] = action.payload.value;
    },
    closeAllModals: (state) => {
      state.modals = {
        addVehicle: false,
        addDriver: false,
        createTrip: false,
        completeTrip: null,
        openMaintenance: false
      };
    }
  }
});

export const { toggleSidebar, setTab, openModal, closeAllModals } = uiSlice.actions;
export default uiSlice.reducer;
