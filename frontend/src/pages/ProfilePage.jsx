import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateProfile, clearProfileStatus } from "../store/authSlice.js";

const PERMISSIONS = {
  viewer:  ["View dashboard summary", "View all financial records", "View recent transactions"],
  analyst: ["View dashboard summary", "View all financial records", "View recent transactions",
            "View monthly trends", "View category breakdown", "Categorical 50/30/20 analysis"],
  admin:   ["All analyst permissions", "Create / edit / delete records",
            "Manage Viewers and Analysts", "View all users"],
};

const SUPER_ADMIN_PERMS = [
  "Everything a regular Admin can do",
  "Edit or demote other Admins",
  "Create users with Admin role",
  "Delete other Admin accounts",
  "Transfer Super Admin role to another Admin",
];

// ─── Avatar component ─────────────────────────────────────────────────────────
function Avatar({ user, size = "lg", preview = null }) {
  const sizeClasses = {
    sm: "w-9 h-9 text-sm",
    lg: "w-20 h-20 text-2xl",
  };
  const src = preview || user?.profileImage?.url;

  if (src) {
    return (
      <img
        src={src}
        alt={user?.name}
        className={`${sizeClasses[size]} rounded-full object-cover border-2
          ${user?.isSuperAdmin ? "border-amber-500/50" : "border-blue-500/30"}`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold
      ${user?.isSuperAdmin
        ? "bg-amber-500/20 border-2 border-amber-500/30 text-amber-400"
        : "bg-blue-600/20 border-2 border-blue-500/30 text-blue-400"}`}>
      {user?.isSuperAdmin ? "👑" : user?.name?.[0]?.toUpperCase()}
    </div>
  );
}

// Export so Layout can use it too
export { Avatar };

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user, profileLoading, profileError, profileSuccess } =
    useSelector((s) => s.auth);

  const [name,         setName]         = useState(user?.name || "");
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragOver,     setDragOver]     = useState(false);
  const fileInputRef = useRef();

  // Reset form after success
  useEffect(() => {
    if (profileSuccess) {
      setImageFile(null);
      setImagePreview(null);
      const t = setTimeout(() => dispatch(clearProfileStatus()), 3000);
      return () => clearTimeout(t);
    }
  }, [profileSuccess]);

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  // ── Image selection ───────────────────────────────────────────────────────
  const handleFileSelect = (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Only JPG, PNG or WEBP images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearProfileStatus());

    const hasNameChange  = name.trim() !== user?.name;
    const hasImageChange = !!imageFile;

    if (!hasNameChange && !hasImageChange) return;

    const formData = new FormData();
    if (hasNameChange)  formData.append("name", name.trim());
    if (hasImageChange) formData.append("profileImage", imageFile);

    dispatch(updateProfile(formData));
  };

  const isDirty = name.trim() !== user?.name || !!imageFile;

  const roleBadge = {
    admin:   "badge-admin",
    analyst: "badge-analyst",
    viewer:  "badge-viewer",
  }[user?.role];

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account details and appearance</p>
      </div>

      {/* ── Edit form ── */}
      <form onSubmit={handleSubmit} className="card space-y-5">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Edit Profile</h3>

        {/* Success */}
        {profileSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400
            rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <span>✓</span> Profile updated successfully!
          </div>
        )}

        {/* Error */}
        {profileError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400
            rounded-xl px-4 py-3 text-sm">
            {profileError}
          </div>
        )}

        {/* Avatar + upload area */}
        <div className="flex flex-col sm:flex-row items-center gap-10">
          {/* Preview */}
          <div className="relative shrink-0">
            {imagePreview || user?.profileImage?.url ? (
              <img
                src={imagePreview || user?.profileImage?.url}
                alt="Preview"
                className={`w-24 h-24 rounded-full object-cover border-2
                  ${user?.isSuperAdmin ? "border-amber-500/50" : "border-blue-500/30"}`}
              />
            ) : (
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold
                ${user?.isSuperAdmin
                  ? "bg-amber-500/20 border-2 border-amber-500/30 text-amber-400"
                  : "bg-blue-600/20 border-2 border-blue-500/30 text-blue-400"}`}>
                {user?.isSuperAdmin ? "👑" : user?.name?.[0]?.toUpperCase()}
              </div>
            )}
            {/* Camera overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 hover:bg-blue-500
                rounded-full flex items-center justify-center text-white text-sm
                border-2 border-slate-900 transition-colors">
              📷
            </button>
          </div>

          <div className="w-full">
          <label className="block text-xs font-medium text-slate-400 pl-2 mb-1.5">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Your name"
            minLength={2}
            maxLength={50}
            required
          />
        </div>

          {/* Drop zone */}
          {/* <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-xl px-4 py-5 text-center 
              cursor-pointer transition-all duration-200
              ${dragOver
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/40"}`}>
            <p className="text-sm text-slate-400">
              {imageFile
                ? <span className="text-blue-400 font-medium">✓ {imageFile.name}</span>
                : <><span className="text-slate-300">Drop image here</span> or <span className="text-blue-400">browse<br /></span></>
              }
            </p>
            <p className="text-xs text-slate-600 mt-1">JPG, PNG, WEBP · Max 2MB</p>
          </div> */}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 pl-2">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ""}
            className="input opacity-60 cursor-not-allowed"
            disabled
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={profileLoading || !isDirty}
            className="btn-primary px-6 disabled:opacity-40 disabled:cursor-not-allowed">
            {profileLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </span>
            ) : "Save Changes"}
          </button>
          {isDirty && !profileLoading && (
            <button
              type="button"
              onClick={() => { setName(user?.name || ""); setImageFile(null); setImagePreview(null); }}
              className="btn-secondary px-4 text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ── Account details ── */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Account Details</h3>
        <div className="flex items-center gap-3 py-2 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={roleBadge}>{user?.role}</span>
              {user?.isSuperAdmin && (
                <span className="text-xs bg-amber-500/20 border border-amber-500/30
                  text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                  👑 Super Admin
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium
                ${user?.status === "active" ? "text-emerald-400" : "text-slate-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full
                  ${user?.status === "active" ? "bg-emerald-400" : "bg-slate-600"}`} />
                {user?.status}
              </span>
            </div>
          </div>
        </div>

        {[
          { label: "Member since", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—" },
          { label: "Last login",   value: user?.lastLogin  ? new Date(user.lastLogin).toLocaleString("en-IN") : "—" },
          { label: "User ID",      value: user?._id },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
            <span className="text-slate-500 text-sm">{label}</span>
            <span className="text-slate-300 text-sm font-medium truncate ml-4 max-w-xs text-right">{value}</span>
          </div>
        ))}
      </div>

      {/* ── Permissions ── */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Your Permissions</h3>
        <ul className="space-y-2">
          {(PERMISSIONS[user?.role] || []).map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-sm text-slate-300">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400
                flex items-center justify-center text-xs shrink-0">✓</span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Super admin extra perms */}
      {user?.isSuperAdmin && (
        <div className="card border border-amber-500/20 space-y-3">
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            👑 Super Admin Privileges
          </h3>
          <ul className="space-y-2">
            {SUPER_ADMIN_PERMS.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-slate-300">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400
                  flex items-center justify-center text-xs shrink-0">★</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
