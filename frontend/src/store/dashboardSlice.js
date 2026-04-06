import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios.js";

export const fetchDashboard = createAsyncThunk("dashboard/fetch", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/dashboard");
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch dashboard");
  }
});

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: {
    summary:             { totalIncome: 0, totalExpenses: 0, netBalance: 0 },
    categoryBreakdown:   [],
    trends:              [],
    recentTransactions:  [],
    loading:             false,
    error:               null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDashboard.fulfilled, (state, { payload }) => {
        state.loading            = false;
        state.summary            = payload.summary;
        state.categoryBreakdown  = payload.categoryBreakdown;
        state.trends             = payload.trends;
        state.recentTransactions = payload.recentTransactions;
      })
      .addCase(fetchDashboard.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

export default dashboardSlice.reducer;
