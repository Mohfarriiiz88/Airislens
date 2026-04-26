"use client";

import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "user";
};

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/superadmin/users", {
          cache: "no-store",
        });

        if (!response.ok) {
          setUsers([]);
          return;
        }

        const data = (await response.json()) as {
          users?: User[];
        };

        setUsers((data.users ?? []).filter((user) => user.role === "user").slice(0, 5));
      } catch {
        setUsers([]);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="rounded-2xl border border-black/20 bg-white p-5">
      <div className="mb-4 text-18px font-medium">Client Terbaru</div>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between border-b border-black/10 pb-2"
          >
            <div>
              <div className="text-sm font-medium text-black">{user.name}</div>
              <div className="text-xs text-black/50">{user.email}</div>
            </div>

            <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
              Client
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
