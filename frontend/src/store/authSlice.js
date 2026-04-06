import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios.js";

const generateToken = (id) =>
  `Bearer ${id}`; // placeholder — actual token comes from backend

export const loginUser = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/login", credentials);
    localStorage.setItem("token", data.token);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Login failed");
  }
});

export const fetchMe = createAsyncThunk("auth/fetchMe", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/auth/me");
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch user");
  }
});

export const registerUser = createAsyncThunk("auth/register", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("token", data.token);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Registration failed");
  }
});

// Update name and/or profile image
export const updateProfile = createAsyncThunk("auth/updateProfile", async (formData, { rejectWithValue }) => {
  try {
    const { data } = await api.put("/auth/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.user;
  } catch (err) {
    console.log("Error in authSlice while uploading profile...",err)
    return rejectWithValue(err.response?.data?.message || "Profile update failed");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user:        null,
    token:       localStorage.getItem("token"),
    loading:     false,
    initialized: false,
    error:       null,
    profileLoading: false,
    profileError:   null,
    profileSuccess: false,
  },
  reducers: {
    logout(state) {
      state.user  = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem("token");
    },
    clearError(state) {
      state.error = null;
    },
    clearProfileStatus(state) {
      state.profileError   = null;
      state.profileSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(loginUser.fulfilled, (s, { payload }) => {
        s.loading = false; s.user = payload.user; s.token = payload.token;
      })
      .addCase(loginUser.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; });

    builder
      .addCase(fetchMe.pending,   (s) => { s.loading = true; })
      .addCase(fetchMe.fulfilled, (s, { payload }) => {
        s.loading = false; s.user = payload; s.initialized = true;
      })
      .addCase(fetchMe.rejected,  (s) => {
        s.loading = false; s.user = null; s.token = null; s.initialized = true;
        localStorage.removeItem("token");
      });

    builder
      .addCase(registerUser.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(registerUser.fulfilled, (s, { payload }) => {
        s.loading = false; s.user = payload.user; s.token = payload.token;
      })
      .addCase(registerUser.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; });

    builder
      .addCase(updateProfile.pending,   (s) => { s.profileLoading = true; s.profileError = null; s.profileSuccess = false; })
      .addCase(updateProfile.fulfilled, (s, { payload }) => {
        s.profileLoading = false;
        s.profileSuccess = true;
        s.user = payload; // Updated user with new name + image URL
      })
      .addCase(updateProfile.rejected,  (s, { payload }) => {
        s.profileLoading = false; s.profileError = payload;
      });
  },
});

export const { logout, clearError, clearProfileStatus } = authSlice.actions;
export default authSlice.reducer;
