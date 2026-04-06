import { configureStore } from "@reduxjs/toolkit";
import authReducer        from "./authSlice.js";
import recordsReducer     from "./recordsSlice.js";
import dashboardReducer   from "./dashboardSlice.js";
import usersReducer       from "./usersSlice.js";
import categoricalReducer from "./categoricalSlice.js";

export const store = configureStore({
  reducer: {
    auth:        authReducer,
    records:     recordsReducer,
    dashboard:   dashboardReducer,
    users:       usersReducer,
    categorical: categoricalReducer,
  },
});
