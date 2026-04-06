import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios.js";

export const fetchCategoricalAnalysis = createAsyncThunk(
  "categorical/fetch",
  async (months = 6, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/dashboard/categorical-analysis", { params: { months } });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch categorical analysis");
    }
  }
);

const categoricalSlice = createSlice({
  name: "categorical",
  initialState: {
    overallSummary:    null,
    monthlyBreakdown:  [],
    categoryTrends:    [],
    alerts:            [],
    bucketMap:         {},
    targets:           { needs: 0.5, wants: 0.3, savings: 0.2 },
    periodMonths:      6,
    loading:           false,
    error:             null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategoricalAnalysis.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchCategoricalAnalysis.fulfilled, (s, { payload }) => {
        s.loading          = false;
        s.overallSummary   = payload.overallSummary;
        s.monthlyBreakdown = payload.monthlyBreakdown;
        s.categoryTrends   = payload.categoryTrends;
        s.alerts           = payload.alerts;
        s.bucketMap        = payload.bucketMap;
        s.targets          = payload.targets;
        s.periodMonths     = payload.periodMonths;
      })
      .addCase(fetchCategoricalAnalysis.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; });
  },
});

export default categoricalSlice.reducer;
