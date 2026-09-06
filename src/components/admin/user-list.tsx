"use client";

import { useMemo, useState, useTransition } from "react";
import { FilterBar, InitialAvatar, ProfileIcon, SearchInput, SectionHeader, TableEmptyState, TableShell, filterSelectClassName } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { setUserActiveAction, updateUserRoleAction } from "@/features/admin/user-actions";
import { ADMIN_SETTABLE_USER_ROLES } from "@/features/admin/user-schemas";

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
  const [, startTransition] = useTransition();
  const [rolePendingId, setRolePendingId] = useState<string | null>(null);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserListItem | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | AdminUserListItem["role"]>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");

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

  return (
    <div>
      <SectionHeader icon={<ProfileIcon />} title="Users" description="View, suspend, and manage roles for every customer and showroom owner." />

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
                      <div className="flex justify-end">
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
    </div>
  );
}
