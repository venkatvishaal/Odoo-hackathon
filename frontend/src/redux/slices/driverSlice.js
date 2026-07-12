import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import driverService from '../../services/driverService';

export const fetchDrivers = createAsyncThunk(
  'drivers/fetchAll',
  async (filters, { rejectWithValue }) => {
    try {
      const res = await driverService.getAll(filters);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch drivers');
    }
  }
);

export const addDriver = createAsyncThunk(
  'drivers/add',
  async (data, { rejectWithValue }) => {
    try {
      const res = await driverService.create(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to add driver');
    }
  }
);

export const removeDriver = createAsyncThunk(
  'drivers/remove',
  async (id, { rejectWithValue }) => {
    try {
      await driverService.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to remove driver');
    }
  }
);

const driverSlice = createSlice({
  name: 'drivers',
  initialState: {
    list: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchDrivers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDrivers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchDrivers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add
      .addCase(addDriver.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addDriver.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
      })
      .addCase(addDriver.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Remove
      .addCase(removeDriver.fulfilled, (state, action) => {
        state.list = state.list.filter(d => d.id !== action.payload);
      });
  }
});

export default driverSlice.reducer;
