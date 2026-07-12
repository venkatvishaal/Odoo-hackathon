import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import tripService from '../../services/tripService';

export const fetchTrips = createAsyncThunk(
  'trips/fetchAll',
  async (filters, { rejectWithValue }) => {
    try {
      const res = await tripService.getAll(filters);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch trips');
    }
  }
);

export const createTrip = createAsyncThunk(
  'trips/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await tripService.create(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: 'Failed to create trip' });
    }
  }
);

export const dispatchTrip = createAsyncThunk(
  'trips/dispatch',
  async (id, { rejectWithValue }) => {
    try {
      const res = await tripService.dispatch(id);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to dispatch trip');
    }
  }
);

export const completeTrip = createAsyncThunk(
  'trips/complete',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await tripService.complete(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: 'Failed to complete trip' });
    }
  }
);

export const cancelTrip = createAsyncThunk(
  'trips/cancel',
  async (id, { rejectWithValue }) => {
    try {
      const res = await tripService.cancel(id);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to cancel trip');
    }
  }
);

const tripSlice = createSlice({
  name: 'trips',
  initialState: {
    list: [],
    loading: false,
    error: null,
    validationErrors: null
  },
  reducers: {
    clearValidationErrors: (state) => {
      state.validationErrors = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchTrips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchTrips.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createTrip.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(createTrip.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
      })
      .addCase(createTrip.rejected, (state, action) => {
        state.loading = false;
        if (action.payload?.errors) {
          state.validationErrors = action.payload.errors;
        } else {
          state.error = action.payload?.message || 'Failed to create trip';
        }
      })
      // Dispatch, Complete, Cancel (updates state in list)
      .addMatcher(
        (action) => [dispatchTrip.fulfilled.type, completeTrip.fulfilled.type, cancelTrip.fulfilled.type].includes(action.type),
        (state, action) => {
          const index = state.list.findIndex(t => t.id === action.payload.id);
          if (index !== -1) {
            state.list[index] = { ...state.list[index], ...action.payload };
          }
          state.loading = false;
          state.validationErrors = null;
        }
      )
      .addMatcher(
        (action) => [completeTrip.rejected.type].includes(action.type),
        (state, action) => {
          state.loading = false;
          if (action.payload?.errors) {
            state.validationErrors = action.payload.errors;
          } else {
            state.error = action.payload?.message || 'Failed to complete trip';
          }
        }
      );
  }
});

export const { clearValidationErrors } = tripSlice.actions;
export default tripSlice.reducer;
