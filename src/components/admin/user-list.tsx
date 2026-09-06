"use client";

import { useState, useMemo, useTransition } from "react";
import {
  DialogFormActions,
  FieldLabel,
  FilterBar,
  InitialAvatar,
  PencilIcon,
  ProfileIcon,
  RowIconButton,
  SearchInput,
  SectionHeader,
  TableEmptyState,
  TableShell,
  TrashIcon,
  filterSelectClassName,
} from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { createUserAction, deleteUserAction, setUserActiveAction, updateUserProfileAction, updateUserRoleAction } from "@/features/admin/user-actions";
import { ADMIN_SETTABLE_USER_ROLES, userProfileFieldSchemas } from "@/features/admin/user-schemas";
import { stripKenyaPrefix } from "@/lib/validation/kenya-phone";

export interface AdminUserListItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "CUSTOMER" | "SHOWROOM" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  showroomName: string | null;
}

interface UserListProps {
  users: AdminUserListItem[];
  currentUserId: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-KE", { year: "numeric", month: "short", day: "numeric" });

// ADM-003 (User Management). "SHOWROOM" is a real value the `role` column
// can already hold (a stale/legacy row, or one set directly in the
// database) even though no code path in this app ever assigns it — see
// ADMIN_SETTABLE_USER_ROLES's own comment. Rendered as a plain badge (not a
// selectable option) so the UI never implies changing *to* it does anything.
const ROLE_BADGE_CLASSES: Record<AdminUserListItem["role"], string> = {
  CUSTOMER: "bg-neutral-100 text-neutral-600",
  SHOWROOM: "bg-blue-50 text-blue-700",
  ADMIN: "bg-brand/10 text-brand",
};

export function UserList({ users, currentUserId }: UserListProps) {
  const toast = useToast();
  const { validate, errorFor, reset: resetValidation } = useFieldValidation(userProfileFieldSchemas);
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [rolePendingId, setRolePendingId] = useState<string | null>(null);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | AdminUserListItem["role"]>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");

  // Create/edit dialog. Same shape for both — the create form has one extra
  // field (role, chosen once at invite time; every other role change goes
  // through the table's own inline select).
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AdminUserListItem["role"]>("CUSTOMER");
  const [formError, setFormError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && !user.isActive) return false;
      if (statusFilter === "SUSPENDED" && user.isActive) return false;
      if (!query) return true;
      return user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query) || (user.showroomName ?? "").toLowerCase().includes(query);
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  function handleRoleChange(userId: string, role: AdminUserListItem["role"]) {
    setRolePendingId(userId);
    startTransition(async () => {
      const result = await updateUserRoleAction(userId, role);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Role updated to ${role.toLowerCase()}.`);
      }
      setRolePendingId(null);
    });
  }

  function confirmSuspend() {
    if (!suspendTarget) return;
    const userId = suspendTarget.id;
    setStatusPendingId(userId);
    startTransition(async () => {
      const result = await setUserActiveAction(userId, false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Account suspended.");
      }
      setStatusPendingId(null);
      setSuspendTarget(null);
    });
  }

  function handleReactivate(userId: string) {
    setStatusPendingId(userId);
    startTransition(async () => {
      const result = await setUserActiveAction(userId, true);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Account reactivated.");
      }
      setStatusPendingId(null);
    });
  }

  function openCreate() {
    setDialogMode("create");
    setEditingUser(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("CUSTOMER");
    setFormError(null);
    resetValidation();
  }

  function openEdit(user: AdminUserListItem) {
    setDialogMode("edit");
    setEditingUser(user);
    setFullName(user.fullName);
    setEmail(user.email);
    setPhone(user.phone ? stripKenyaPrefix(user.phone) : "");
    setFormError(null);
    resetValidation();
  }

  function closeDialog() {
    setDialogMode(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const nameResult = userProfileFieldSchemas.fullName.safeParse(fullName);
    const emailResult = userProfileFieldSchemas.email.safeParse(email);
    const phoneResult = userProfileFieldSchemas.phone.safeParse(phone);
    if (!nameResult.success || !emailResult.success || !phoneResult.success) {
      validate("fullName", fullName);
      validate("email", email);
      validate("phone", phone);
      return;
    }

    setPending(true);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", fullName);
      formData.set("email", email);
      formData.set("phone", phone);

      let result: { error?: string };
      if (editingUser) {
        result = await updateUserProfileAction(editingUser.id, formData);
      } else {
        formData.set("role", role);
        result = await createUserAction(formData);
      }

      setPending(false);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success(editingUser ? "User updated." : "Invite sent — they'll get an email to set their password.");
      closeDialog();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    startTransition(async () => {
      const result = await deleteUserAction(deleteTarget.id);
      setPending(false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User deleted.");
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div>
      <SectionHeader
        icon={<ProfileIcon />}
        title="Users"
        description="View, create, edit, suspend, and manage roles for every customer and showroom owner."
        actionLabel="New user"
        onAction={openCreate}
      />

      {users.length > 0 && (
        <FilterBar>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search name, email, or showroom…" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className={`${filterSelectClassName} w-36`}
            aria-label="Filter by role"
          >
            <option value="ALL">All roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="ADMIN">Admin</option>
            <option value="SHOWROOM">Showroom (legacy)</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={`${filterSelectClassName} w-36`}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </FilterBar>
      )}

      <TableShell>
        {users.length === 0 ? (
          <TableEmptyState message="No users yet." />
        ) : filteredUsers.length === 0 ? (
          <TableEmptyState message="No users match your search." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Showroom</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <InitialAvatar name={user.fullName} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-800">
                            {user.fullName}
                            {isSelf && <span className="ml-1.5 text-xs font-normal text-neutral-400">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-neutral-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-neutral-600">{user.showroomName ?? "—"}</td>
                    <td className="px-5 py-3">
                      {user.role === "SHOWROOM" ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE_CLASSES.SHOWROOM}`}>Showroom (legacy)</span>
                      ) : (
                        <select
                          value={user.role}
                          disabled={isSelf || rolePendingId === user.id}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as AdminUserListItem["role"])}
                          title={isSelf ? "You cannot change your own role" : undefined}
                          aria-label={`Role for ${user.fullName}`}
                          className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold capitalize outline-none disabled:opacity-60 ${ROLE_BADGE_CLASSES[user.role]}`}
                        >
                          {ADMIN_SETTABLE_USER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role.charAt(0) + role.slice(1).toLowerCase()}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-neutral-500">{dateFormatter.format(new Date(user.createdAt))}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end items-center gap-1">
                        <RowIconButton label="Edit" onClick={() => openEdit(user)} disabled={isSelf}>
                          <PencilIcon />
                        </RowIconButton>
                        <RowIconButton label="Delete" onClick={() => setDeleteTarget(user)} disabled={isSelf} variant="danger">
                          <TrashIcon />
                        </RowIconButton>
                        {user.isActive ? (
                          <button
                            type="button"
                            disabled={isSelf || statusPendingId === user.id}
                            title={isSelf ? "You cannot suspend your own account" : "Suspend"}
                            onClick={() => setSuspendTarget(user)}
                            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSelf || statusPendingId === user.id}
                            title={isSelf ? "You cannot reactivate your own account" : "Reactivate"}
                            onClick={() => handleReactivate(user.id)}
                            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableShell>

      <ConfirmDialog
        open={suspendTarget != null}
        title="Suspend this account?"
        description={
          suspendTarget
            ? `${suspendTarget.fullName} (${suspendTarget.email}) will be signed out and unable to log back in until reactivated.`
            : ""
        }
        confirmLabel="Suspend"
        pending={statusPendingId === suspendTarget?.id}
        onConfirm={confirmSuspend}
        onCancel={() => setSuspendTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete this account?"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.fullName} (${deleteTarget.email})? This cannot be undone. A user who still owns a showroom must have it removed first.`
            : ""
        }
        confirmLabel="Delete"
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Dialog
        open={dialogMode !== null}
        onClose={closeDialog}
        title={editingUser ? "Edit User" : "New User"}
        description={editingUser ? undefined : "We'll email them an invite to set up their password."}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

          <FieldLabel htmlFor="user-full-name">Full name</FieldLabel>
          <Input
            id="user-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={(e) => validate("fullName", e.target.value)}
            autoFocus
            required
            error={!!errorFor("fullName")}
          />
          {errorFor("fullName") && <p className="mt-1 text-sm text-red-600">{errorFor("fullName")}</p>}

          <div className="mt-3">
            <FieldLabel htmlFor="user-email">Email</FieldLabel>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => validate("email", e.target.value)}
              required
              error={!!errorFor("email")}
            />
            {errorFor("email") && <p className="mt-1 text-sm text-red-600">{errorFor("email")}</p>}
          </div>

          <div className="mt-3">
            <FieldLabel htmlFor="user-phone">Phone (optional)</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="flex items-center rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-500">+254</span>
              <Input
                id="user-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={(e) => validate("phone", e.target.value)}
                placeholder="712345678"
                error={!!errorFor("phone")}
              />
            </div>
            {errorFor("phone") && <p className="mt-1 text-sm text-red-600">{errorFor("phone")}</p>}
          </div>

          {!editingUser && (
            <div className="mt-3">
              <FieldLabel htmlFor="user-role">Role</FieldLabel>
              <select
                id="user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminUserListItem["role"])}
                className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                {ADMIN_SETTABLE_USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4">
            <DialogFormActions pending={pending} submitLabel={editingUser ? "Save changes" : "Send invite"} onCancel={closeDialog} />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
