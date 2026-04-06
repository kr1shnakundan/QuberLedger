import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios.js";

export const fetchRecords = createAsyncThunk("records/fetchAll", async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/records", { params });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch records");
  }
});

export const createRecord = createAsyncThunk("records/create", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/records", payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create record");
  }
});

export const updateRecord = createAsyncThunk("records/update", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/records/${id}`, payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update record");
  }
});

export const deleteRecord = createAsyncThunk("records/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/records/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete record");
  }
});

const recordsSlice = createSlice({
  name: "records",
  initialState: {
    items:      [],
    pagination: { page: 1, limit: 10, total: 0, pages: 1 },
    loading:    false,
    error:      null,
  },
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecords.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRecords.fulfilled, (state, { payload }) => {
        state.loading    = false;
        state.items      = payload.data;
        state.pagination = payload.pagination;
      })
      .addCase(fetchRecords.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; });

    builder
      .addCase(createRecord.fulfilled, (state, { payload }) => {
        state.items.unshift(payload);
        state.pagination.total += 1;
      })
      .addCase(createRecord.rejected, (state, { payload }) => { state.error = payload; });

    builder
      .addCase(updateRecord.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((r) => r._id === payload._id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(updateRecord.rejected, (state, { payload }) => { state.error = payload; });

    builder
      .addCase(deleteRecord.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((r) => r._id !== payload);
        state.pagination.total -= 1;
      })
      .addCase(deleteRecord.rejected, (state, { payload }) => { state.error = payload; });
  },
});

export const { clearError } = recordsSlice.actions;
export default recordsSlice.reducer;
