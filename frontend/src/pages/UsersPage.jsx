import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchUsers, createUser, updateUser, deleteUser } from "../store/usersSlice.js";
import api from "../api/axios.js";

const EMPTY_FORM = { name: "", email: "", password: "", role: "viewer" };

// ─── Transfer Super Admin Modal ────────────────────────────────────────────────
function TransferModal({ admins, currentUser, onClose, onSuccess }) {
  const [targetId, setTargetId] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const eligibleAdmins = admins.filter(
    (u) => u.role === "admin" && !u.isSuperAdmin && u._id !== currentUser._id && u.status === "active"
  );

  const handleTransfer = async () => {
    if (confirm !== "TRANSFER") return setError('Type TRANSFER to confirm.');
    if (!targetId)              return setError("Select an admin to transfer to.");
    setLoading(true);
    try {
      await api.post(`/users/${targetId}/transfer-superadmin`);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Transfer failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">👑</span>
            <h2 className="font-bold text-amber-400">Transfer Super Admin</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
            ⚠️ This is irreversible until the new Super Admin transfers it back. You will become a regular Admin.
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Transfer to (must be an active Admin)</label>
            {eligibleAdmins.length === 0 ? (
              <p className="text-slate-500 text-sm py-2">No other admins available. Create or promote an Admin first.</p>
            ) : (
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="input">
                <option value="">Select an Admin…</option>
                {eligibleAdmins.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Type <span className="text-amber-400 font-mono">TRANSFER</span> to confirm
            </label>
            <input
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="input font-mono" placeholder="TRANSFER"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleTransfer}
              disabled={loading || eligibleAdmins.length === 0 || confirm !== "TRANSFER" || !targetId}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-all">
              {loading ? "Transferring…" : "Transfer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Create / Edit Modal ──────────────────────────────────────────────────
function UserModal({ user: editUser, currentUser, onClose, onSave, loading }) {
  const isEdit = !!editUser;
  const [form,  setForm]  = useState(
    isEdit ? { name: editUser.name, role: editUser.role, status: editUser.status } : { ...EMPTY_FORM }
  );
  const [error, setError] = useState("");

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const result = await onSave(form);
    if (result?.error) setError(result.payload || "Something went wrong.");
  };

  // Regular admin cannot assign admin role
  const canAssignAdmin = currentUser?.isSuperAdmin;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-slate-100">{isEdit ? "Edit User" : "New User"}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="John Doe" required />
          </div>
          {!isEdit && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} className="input" placeholder="john@example.com" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} className="input" placeholder="Min. 6 characters" minLength={6} required />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="input">
                <option value="viewer">Viewer</option>
                <option value="analyst">Analyst</option>
                {canAssignAdmin && <option value="admin">Admin</option>}
              </select>
              {!canAssignAdmin && (
                <p className="text-xs text-slate-600 mt-1">Only Super Admin can assign Admin role</p>
              )}
            </div>
            {isEdit && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                <select name="status" value={form.status} onChange={handleChange} className="input">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Saving…" : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((s) => s.auth);
  const { items, pagination, loading } = useSelector((s) => s.users);

  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modal,      setModal]      = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => { if (currentUser?.role !== "admin") navigate("/"); }, [currentUser]);
  useEffect(() => { dispatch(fetchUsers({ search, role: roleFilter })); }, [search, roleFilter]);

  const handleSave = async (formData) => {
    let result;
    if (modal && modal._id) result = await dispatch(updateUser({ id: modal._id, ...formData }));
    else                    result = await dispatch(createUser(formData));
    if (!result?.error) setModal(null);
    return result;
  };

  const handleDelete = async () => {
    await dispatch(deleteUser(deleteId));
    setDeleteId(null);
  };

  const handleTransferSuccess = () => {
    setTransferOpen(false);
    // Reload page — current user's isSuperAdmin has changed; force re-fetch
    window.location.reload();
  };

  // Can actor edit target?
  const canEditTarget = (target) => {
    if (target.isSuperAdmin && target._id !== currentUser?._id) return false;
    if (!currentUser?.isSuperAdmin && target.role === "admin" && target._id !== currentUser?._id) return false;
    return true;
  };

  const canDeleteTarget = (target) => {
    if (target._id === currentUser?._id) return false;
    if (target.isSuperAdmin) return false;
    if (!currentUser?.isSuperAdmin && target.role === "admin") return false;
    return true;
  };

  const roleBadge = { admin: "badge-admin", analyst: "badge-analyst", viewer: "badge-viewer" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">{pagination.total} total users</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Transfer super admin — only visible to super admin */}
          {currentUser?.isSuperAdmin && (
            <button
              onClick={() => setTransferOpen(true)}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all font-medium">
              👑 Transfer Super Admin
            </button>
          )}
          <button onClick={() => setModal("create")} className="btn-primary flex items-center gap-2">
            + New User
          </button>
        </div>
      </div>

      {/* Super admin info banner */}
      {currentUser?.isSuperAdmin && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
          <span className="text-xl">👑</span>
          <div>
            <p className="text-sm font-semibold text-amber-400">You are the Super Admin</p>
            <p className="text-xs text-slate-500">You can manage all users including other Admins, and transfer your Super Admin status.</p>
          </div>
        </div>
      )}

      {!currentUser?.isSuperAdmin && currentUser?.role === "admin" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl">
          <span className="text-lg">🔒</span>
          <p className="text-xs text-slate-500">
            As a regular Admin, you can manage Viewers and Analysts. Only the Super Admin can edit or demote other Admins.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            className="input" placeholder="Search by name or email…" />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="analyst">Analyst</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                {["User", "Role", "Status", "Last Login", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-600">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-600">No users found.</td></tr>
              ) : items.map((u) => (
                <tr key={u._id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                        ${u.isSuperAdmin
                          ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                          : "bg-blue-600/20 border border-blue-500/30 text-blue-400"}`}>
                        {u.isSuperAdmin ? "👑" : u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-200">{u.name}</p>
                          {u.isSuperAdmin && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                              Super Admin
                            </span>
                          )}
                          {u._id === currentUser?._id && (
                            <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">You</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={roleBadge[u.role]}>{u.role}</span>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium
                      ${u.status === "active" ? "text-emerald-400" : "text-slate-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-emerald-400" : "bg-slate-600"}`} />
                      {u.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {u.lastLogin
                      ? new Date(u.lastLogin).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "Never"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {canEditTarget(u) ? (
                        <button onClick={() => setModal(u)}
                          className="text-xs px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
                          Edit
                        </button>
                      ) : (
                        <span className="text-xs px-2 py-1 text-slate-700 cursor-not-allowed" title={
                          u.isSuperAdmin ? "Super Admin cannot be edited" : "Only Super Admin can edit other Admins"
                        }>
                          🔒 Edit
                        </span>
                      )}

                      {canDeleteTarget(u) ? (
                        <button onClick={() => setDeleteId(u._id)}
                          className="text-xs px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                          Del
                        </button>
                      ) : (
                        <span className="text-xs px-2 py-1 text-slate-700 cursor-not-allowed" title={
                          u.isSuperAdmin ? "Transfer Super Admin role first" :
                          u._id === currentUser?._id ? "Cannot delete yourself" :
                          "Only Super Admin can delete other Admins"
                        }>
                          🔒 Del
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <UserModal
          user={modal === "create" ? null : modal}
          currentUser={currentUser}
          onClose={() => setModal(null)}
          onSave={handleSave}
          loading={loading}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="font-semibold text-slate-100 mb-1">Delete User?</h3>
            <p className="text-slate-500 text-sm mb-5">This will permanently remove the user.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      {transferOpen && (
        <TransferModal
          admins={items}
          currentUser={currentUser}
          onClose={() => setTransferOpen(false)}
          onSuccess={handleTransferSuccess}
        />
      )}
    </div>
  );
}
