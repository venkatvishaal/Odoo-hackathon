import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import vehicleService from '../../services/vehicleService';

export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchAll',
  async (filters, { rejectWithValue }) => {
    try {
      const res = await vehicleService.getAll(filters);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch vehicles');
    }
  }
);

export const addVehicle = createAsyncThunk(
  'vehicles/add',
  async (data, { rejectWithValue }) => {
    try {
      const res = await vehicleService.create(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to add vehicle');
    }
  }
);

export const removeVehicle = createAsyncThunk(
  'vehicles/remove',
  async (id, { rejectWithValue }) => {
    try {
      await vehicleService.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to remove vehicle');
    }
  }
);

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState: {
    list: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchVehicles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add
      .addCase(addVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addVehicle.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
      })
      .addCase(addVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Remove
      .addCase(removeVehicle.fulfilled, (state, action) => {
        state.list = state.list.filter(v => v.id !== action.payload);
      });
  }
});

export default vehicleSlice.reducer;
