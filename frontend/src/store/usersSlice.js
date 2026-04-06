import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios.js";

export const fetchUsers = createAsyncThunk("users/fetchAll", async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/users", { params });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch users");
  }
});

export const createUser = createAsyncThunk("users/create", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/users", payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create user");
  }
});

export const updateUser = createAsyncThunk("users/update", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/users/${id}`, payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update user");
  }
});

export const deleteUser = createAsyncThunk("users/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/users/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete user");
  }
});

const usersSlice = createSlice({
  name: "users",
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
      .addCase(fetchUsers.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, { payload }) => {
        state.loading    = false;
        state.items      = payload.data;
        state.pagination = payload.pagination;
      })
      .addCase(fetchUsers.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; });

    builder
      .addCase(createUser.fulfilled, (state, { payload }) => { state.items.unshift(payload); })
      .addCase(createUser.rejected,  (state, { payload }) => { state.error = payload; });

    builder
      .addCase(updateUser.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((u) => u._id === payload._id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(updateUser.rejected, (state, { payload }) => { state.error = payload; });

    builder
      .addCase(deleteUser.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((u) => u._id !== payload);
      })
      .addCase(deleteUser.rejected, (state, { payload }) => { state.error = payload; });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;
